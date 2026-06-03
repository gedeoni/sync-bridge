package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"sync-bridge-go/internal/dto"
	appErrors "sync-bridge-go/internal/errors"
	"sync-bridge-go/internal/metrics"
)

type SyncResult struct {
	ID     int64  `json:"id" example:"101"`
	Status string `json:"status" example:"created"`
}

// SyncResponse represents the successful response structure for a sync operation
type SyncResponse struct {
	Status  int              `json:"status" example:"200"`
	Message string           `json:"message" example:"Sync completed successfully"`
	Data    SyncResponseData `json:"data"`
}

// SyncResponseData holds the slice of SyncResult
type SyncResponseData struct {
	Results []SyncResult `json:"results"`
}

// SyncHandler godoc
// @Summary      Synchronize data payload
// @Description  Syncs data payload items (customers, products, orders, employees) transactionally. If one fails, the target database modifications roll back, but the execution log is committed to sync_history with 'FAILED' status.
// @Tags         sync
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        payload body dto.SyncRequest true "Data Payload to synchronize"
// @Success      200 {object} SyncResponse
// @Failure      400 {object} errors.AppError "Validation failed or invalid JSON"
// @Failure      401 {object} errors.AppError "Access Denied"
// @Failure      409 {object} errors.AppError "Data Integrity Violation (Conflict)"
// @Failure      500 {object} errors.AppError "Internal server error"
// @Router       /api/v1/sync [post]
func SyncHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()

		var payload dto.SyncRequest
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  http.StatusBadRequest,
				"message": "Invalid JSON body",
			})
			return
		}

		if err := payload.Validate(); err != nil {
			appErr := appErrors.ParseValidationError(err)
			c.JSON(appErr.StatusCode, appErr)
			return
		}

		model := payload.Model

		// Serialize payload data to store in history
		var payloadStr string
		if bytes, err := json.Marshal(payload.Data); err == nil {
			payloadStr = string(bytes)
		} else {
			payloadStr = "Error serializing payload"
		}

		// Create sync_history entry with PENDING_RETRY (committed immediately)
		syncHistoryID, err := createPendingHistory(db, payloadStr)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  http.StatusInternalServerError,
				"message": err.Error(),
			})
			return
		}

		// Begin transaction
		tx, err := db.BeginTx(c.Request.Context(), nil)
		if err != nil {
			appErr := appErrors.NewInternalError(err)
			markHistoryFailed(db, syncHistoryID, appErr.Error())
			c.JSON(appErr.StatusCode, appErr)
			return
		}
		defer func() {
			_ = tx.Rollback() // safe to call if already committed
		}()

		var results []SyncResult
		var processErr error

		// Process items inside transaction
		for _, itemVal := range payload.Data {
			res, err := processItem(tx, model, itemVal)
			if err != nil {
				processErr = err
				break
			}
			results = append(results, res)
		}

		elapsed := time.Since(startTime).Seconds()

		if processErr != nil {
			// Rollback is deferred, but let's release write locks quickly if needed
			_ = tx.Rollback()

			var appErr appErrors.AppError
			if errors.As(processErr, &appErr) {
				// already an AppError
			} else {
				appErr = appErrors.HandleDBError(processErr)
			}

			log.Printf("Sync processing failed for model %s: %v", model, appErr)
			markHistoryFailed(db, syncHistoryID, appErr.Error())

			// Track failure metrics
			errClass := "InternalServerError"
			switch appErr.StatusCode {
			case http.StatusBadRequest:
				if appErr.Message == "Validation failed" {
					errClass = "ValidationException"
				} else {
					errClass = "ApiException"
				}
			case http.StatusConflict:
				errClass = "DataIntegrityViolationException"
			}

			metrics.SyncTotal.WithLabelValues("error", model).Inc()
			metrics.SyncErrors.WithLabelValues(errClass, model).Inc()
			metrics.SyncDuration.WithLabelValues("error", model).Observe(elapsed)

			c.JSON(appErr.StatusCode, appErr)
			return
		}

		// Commit transaction
		if err := tx.Commit(); err != nil {
			dbErr := appErrors.HandleDBError(err)
			markHistoryFailed(db, syncHistoryID, dbErr.Error())

			metrics.SyncTotal.WithLabelValues("error", model).Inc()
			metrics.SyncErrors.WithLabelValues("SqliteException", model).Inc()
			metrics.SyncDuration.WithLabelValues("error", model).Observe(elapsed)

			c.JSON(dbErr.StatusCode, dbErr)
			return
		}

		// Mark history successful
		_, _ = db.Exec(
			"UPDATE sync_history SET status = 'SUCCESSFUL', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
			syncHistoryID,
		)

		// Track success metrics
		metrics.SyncTotal.WithLabelValues("success", model).Inc()
		metrics.SyncDuration.WithLabelValues("success", model).Observe(elapsed)

		c.JSON(http.StatusOK, gin.H{
			"status":  http.StatusOK,
			"message": "Sync completed successfully",
			"data": gin.H{
				"results": results,
			},
		})
	}
}

func createPendingHistory(db *sql.DB, payload string) (int64, error) {
	res, err := db.Exec(
		"INSERT INTO sync_history (payload, status, retries, created_at, updated_at) VALUES (?, 'PENDING_RETRY', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
		payload,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func markHistoryFailed(db *sql.DB, id int64, reason string) {
	truncated := reason
	if len(reason) > 255 {
		truncated = reason[:255]
	}
	_, _ = db.Exec(
		"UPDATE sync_history SET status = 'FAILED', failure_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
		truncated,
		id,
	)
}

func processItem(tx *sql.Tx, model string, itemVal []byte) (SyncResult, error) {
	switch model {
	case "customers":
		var dtoItem dto.CustomerDto
		if err := json.Unmarshal(itemVal, &dtoItem); err != nil {
			return SyncResult{}, appErrors.NewBadRequestError("Malformed item JSON")
		}
		if err := dtoItem.Validate(); err != nil {
			return SyncResult{}, appErrors.ParseValidationError(err)
		}

		status := "created"
		if dtoItem.ID != nil {
			status = "updated"
		}

		var savedID int64
		if dtoItem.ID != nil {
			id := *dtoItem.ID
			currency := "USD"
			if dtoItem.DefaultCurrency != nil {
				currency = *dtoItem.DefaultCurrency
			}

			_, err := tx.Exec(
				"INSERT INTO customers (id, email, first_name, last_name, default_currency, updated_at) "+
					"VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP) "+
					"ON CONFLICT(id) DO UPDATE SET "+
					"email = excluded.email, "+
					"first_name = excluded.first_name, "+
					"last_name = excluded.last_name, "+
					"default_currency = excluded.default_currency, "+
					"updated_at = CURRENT_TIMESTAMP",
				id, dtoItem.Email, dtoItem.FirstName, dtoItem.LastName, currency,
			)
			if err != nil {
				return SyncResult{}, err
			}
			savedID = id
		} else {
			currency := "USD"
			if dtoItem.DefaultCurrency != nil {
				currency = *dtoItem.DefaultCurrency
			}

			res, err := tx.Exec(
				"INSERT INTO customers (email, first_name, last_name, default_currency, created_at, updated_at) "+
					"VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
				dtoItem.Email, dtoItem.FirstName, dtoItem.LastName, currency,
			)
			if err != nil {
				return SyncResult{}, err
			}
			savedID, err = res.LastInsertId()
			if err != nil {
				return SyncResult{}, err
			}
		}
		return SyncResult{ID: savedID, Status: status}, nil

	case "products":
		var dtoItem dto.ProductDto
		if err := json.Unmarshal(itemVal, &dtoItem); err != nil {
			return SyncResult{}, appErrors.NewBadRequestError("Malformed item JSON")
		}
		if err := dtoItem.Validate(); err != nil {
			return SyncResult{}, appErrors.ParseValidationError(err)
		}

		status := "created"
		if dtoItem.ID != nil {
			status = "updated"
		}

		activeVal := 1
		if dtoItem.Active != nil && !*dtoItem.Active {
			activeVal = 0
		}

		currency := "USD"
		if dtoItem.Currency != nil {
			currency = *dtoItem.Currency
		}

		var savedID int64
		if dtoItem.ID != nil {
			id := *dtoItem.ID
			_, err := tx.Exec(
				"INSERT INTO products (id, name, description, price, currency, active, weight_grams, updated_at) "+
					"VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) "+
					"ON CONFLICT(id) DO UPDATE SET "+
					"name = excluded.name, "+
					"description = excluded.description, "+
					"price = excluded.price, "+
					"currency = excluded.currency, "+
					"active = excluded.active, "+
					"weight_grams = excluded.weight_grams, "+
					"updated_at = CURRENT_TIMESTAMP",
				id, dtoItem.Name, dtoItem.Description, *dtoItem.Price, currency, activeVal, dtoItem.WeightGrams,
			)
			if err != nil {
				return SyncResult{}, err
			}
			savedID = id
		} else {
			res, err := tx.Exec(
				"INSERT INTO products (name, description, price, currency, active, weight_grams, created_at, updated_at) "+
					"VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
				dtoItem.Name, dtoItem.Description, *dtoItem.Price, currency, activeVal, dtoItem.WeightGrams,
			)
			if err != nil {
				return SyncResult{}, err
			}
			savedID, err = res.LastInsertId()
			if err != nil {
				return SyncResult{}, err
			}
		}
		return SyncResult{ID: savedID, Status: status}, nil

	case "orders":
		var dtoItem dto.OrderDto
		if err := json.Unmarshal(itemVal, &dtoItem); err != nil {
			return SyncResult{}, appErrors.NewBadRequestError("Malformed item JSON")
		}
		if err := dtoItem.Validate(); err != nil {
			return SyncResult{}, appErrors.ParseValidationError(err)
		}

		var calculatedAmount int
		if dtoItem.Items != nil {
			items := *dtoItem.Items
			if len(items) == 0 {
				return SyncResult{}, appErrors.NewBadRequestError("Order must include items or an amount")
			}

			sum := 0
			for _, it := range items {
				if err := it.Validate(); err != nil {
					return SyncResult{}, appErrors.ParseValidationError(err)
				}
				sum += (*it.Qty) * (*it.UnitPrice)
			}

			if dtoItem.Amount != nil {
				if *dtoItem.Amount != sum {
					return SyncResult{}, appErrors.NewBadRequestError(fmt.Sprintf(
						"Order amount must equal the sum of item prices (qty * unit_price). Calculated=%d provided=%d",
						sum, *dtoItem.Amount,
					))
				}
			}
			calculatedAmount = sum
		} else {
			if dtoItem.Amount == nil {
				return SyncResult{}, appErrors.NewBadRequestError("Order must include items or an amount")
			}
			calculatedAmount = *dtoItem.Amount
		}

		status := "created"
		if dtoItem.ID != nil {
			status = "updated"
		}

		currency := "USD"
		if dtoItem.Currency != nil {
			currency = *dtoItem.Currency
		}

		var savedID int64
		if dtoItem.ID != nil {
			id := *dtoItem.ID
			_, err := tx.Exec(
				"INSERT INTO orders (id, order_number, customer_id, status, currency, amount, updated_at) "+
					"VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) "+
					"ON CONFLICT(id) DO UPDATE SET "+
					"order_number = excluded.order_number, "+
					"customer_id = excluded.customer_id, "+
					"status = excluded.status, "+
					"currency = excluded.currency, "+
					"amount = excluded.amount, "+
					"updated_at = CURRENT_TIMESTAMP",
				id, dtoItem.OrderNumber, *dtoItem.CustomerID, dtoItem.Status, currency, calculatedAmount,
			)
			if err != nil {
				return SyncResult{}, err
			}
			savedID = id
		} else {
			res, err := tx.Exec(
				"INSERT INTO orders (order_number, customer_id, status, currency, amount, placed_at, updated_at) "+
					"VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
				dtoItem.OrderNumber, *dtoItem.CustomerID, dtoItem.Status, currency, calculatedAmount,
			)
			if err != nil {
				return SyncResult{}, err
			}
			savedID, err = res.LastInsertId()
			if err != nil {
				return SyncResult{}, err
			}
		}

		// Replace items cascade-style
		if dtoItem.Items != nil {
			_, err := tx.Exec("DELETE FROM order_items WHERE order_id = ?", savedID)
			if err != nil {
				return SyncResult{}, err
			}

			for _, it := range *dtoItem.Items {
				_, err = tx.Exec(
					"INSERT INTO order_items (order_id, product_id, qty, unit_price) VALUES (?, ?, ?, ?)",
					savedID, *it.ProductID, *it.Qty, *it.UnitPrice,
				)
				if err != nil {
					return SyncResult{}, err
				}
			}
		}
		return SyncResult{ID: savedID, Status: status}, nil

	case "employees":
		var dtoItem dto.EmployeeDto
		if err := json.Unmarshal(itemVal, &dtoItem); err != nil {
			return SyncResult{}, appErrors.NewBadRequestError("Malformed item JSON")
		}
		if err := dtoItem.Validate(); err != nil {
			return SyncResult{}, appErrors.ParseValidationError(err)
		}

		parsedID, parseErr := strconv.ParseInt(dtoItem.ID, 10, 64)
		var hasID bool
		if parseErr == nil {
			hasID = true
		}

		status := "created"
		if hasID {
			status = "updated"
		}

		var savedID int64
		if hasID {
			savedID = parsedID
			_, err := tx.Exec(
				"INSERT INTO employees ( "+
					"id, employee_id, first_name, middle_name, last_name, gender, email, phone_number, "+
					"date_of_birth, nationality, job_level, department, location, bank_account_number, "+
					"company, job_title, cost_center, start_date, employee_status, manager_id, manager_email, "+
					"last_modified_on, last_modified "+
					") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) "+
					"ON CONFLICT(id) DO UPDATE SET "+
					"employee_id = excluded.employee_id, "+
					"first_name = excluded.first_name, "+
					"middle_name = excluded.middle_name, "+
					"last_name = excluded.last_name, "+
					"gender = excluded.gender, "+
					"email = excluded.email, "+
					"phone_number = excluded.phone_number, "+
					"date_of_birth = excluded.date_of_birth, "+
					"nationality = excluded.nationality, "+
					"job_level = excluded.job_level, "+
					"department = excluded.department, "+
					"location = excluded.location, "+
					"bank_account_number = excluded.bank_account_number, "+
					"company = excluded.company, "+
					"job_title = excluded.job_title, "+
					"cost_center = excluded.cost_center, "+
					"start_date = excluded.start_date, "+
					"employee_status = excluded.employee_status, "+
					"manager_id = excluded.manager_id, "+
					"manager_email = excluded.manager_email, "+
					"last_modified_on = excluded.last_modified_on, "+
					"last_modified = excluded.last_modified",
				savedID, dtoItem.EmployeeID, dtoItem.FirstName, dtoItem.MiddleName, dtoItem.LastName,
				dtoItem.Gender, dtoItem.Email, dtoItem.PhoneNumber, dtoItem.DateOfBirth, dtoItem.Nationality,
				dtoItem.JobLevel, dtoItem.Department, dtoItem.Location, dtoItem.BankAccountNumber,
				dtoItem.Company, dtoItem.JobTitle, dtoItem.CostCenter, dtoItem.StartDate, dtoItem.EmployeeStatus,
				dtoItem.ManagerID, dtoItem.ManagerEmail, dtoItem.LastModifiedOn, dtoItem.LastModified,
			)
			if err != nil {
				return SyncResult{}, err
			}
		} else {
			// Generate positive random i64
			u := uuid.New()
			var randID int64
			for i := 0; i < 8; i++ {
				randID = (randID << 8) | int64(u[i])
			}
			if randID < 0 {
				randID = -randID
			}
			savedID = randID

			_, err := tx.Exec(
				"INSERT INTO employees ( "+
					"id, employee_id, first_name, middle_name, last_name, gender, email, phone_number, "+
					"date_of_birth, nationality, job_level, department, location, bank_account_number, "+
					"company, job_title, cost_center, start_date, employee_status, manager_id, manager_email, "+
					"last_modified_on, last_modified "+
					") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
				savedID, dtoItem.EmployeeID, dtoItem.FirstName, dtoItem.MiddleName, dtoItem.LastName,
				dtoItem.Gender, dtoItem.Email, dtoItem.PhoneNumber, dtoItem.DateOfBirth, dtoItem.Nationality,
				dtoItem.JobLevel, dtoItem.Department, dtoItem.Location, dtoItem.BankAccountNumber,
				dtoItem.Company, dtoItem.JobTitle, dtoItem.CostCenter, dtoItem.StartDate, dtoItem.EmployeeStatus,
				dtoItem.ManagerID, dtoItem.ManagerEmail, dtoItem.LastModifiedOn, dtoItem.LastModified,
			)
			if err != nil {
				return SyncResult{}, err
			}
		}
		return SyncResult{ID: savedID, Status: status}, nil

	default:
		return SyncResult{}, appErrors.NewBadRequestError("Invalid model: " + model)
	}
}
