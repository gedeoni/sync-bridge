package handlers

import (
	"database/sql"
	"errors"
	"math"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	appErrors "sync-bridge-go/internal/errors"
)

type SyncHistoryRow struct {
	ID            int64   `json:"id" example:"1"`
	Payload       string  `json:"payload" example:"[{\"email\":\"john.doe@example.com\"}]"`
	Status        string  `json:"status" example:"FAILED"`
	FailureReason *string `json:"failureReason" example:"Duplicate entry: field 'EMAIL' already exists"`
	Retries       int     `json:"retries" example:"0"`
	CreatedAt     string  `json:"createdAt" example:"2026-06-03T07:46:58.000Z"`
	UpdatedAt     string  `json:"updatedAt" example:"2026-06-03T07:46:58.000Z"`
}

// StatsData represents counts of histories by status type
type StatsData struct {
	Successful   int64 `json:"successful" example:"10"`
	Failed       int64 `json:"failed" example:"2"`
	PendingRetry int64 `json:"pending_retry" example:"1"`
	Invalid      int64 `json:"invalid" example:"0"`
	Total        int64 `json:"total" example:"13"`
}

// StatsResponse represents the JSON response for sync stats
type StatsResponse struct {
	Status  int       `json:"status" example:"200"`
	Message string    `json:"message" example:"Stats retrieved successfully"`
	Data    StatsData `json:"data"`
}

// SortInfo represents page sorting state
type SortInfo struct {
	Empty    bool `json:"empty" example:"false"`
	Sorted   bool `json:"sorted" example:"true"`
	Unsorted bool `json:"unsorted" example:"false"`
}

// PageableInfo represents pagination metadata
type PageableInfo struct {
	Sort       SortInfo `json:"sort"`
	Offset     int64    `json:"offset" example:"0"`
	PageNumber int64    `json:"pageNumber" example:"0"`
	PageSize   int64    `json:"pageSize" example:"15"`
	Paged      bool     `json:"paged" example:"true"`
	Unpaged    bool     `json:"unpaged" example:"false"`
}

// ListHistoryData represents the paginated history slice and metadata
type ListHistoryData struct {
	Content          []SyncHistoryRow `json:"content"`
	Pageable         PageableInfo     `json:"pageable"`
	TotalElements    int64            `json:"totalElements" example:"25"`
	TotalPages       int64            `json:"totalPages" example:"2"`
	Size             int64            `json:"size" example:"15"`
	Number           int64            `json:"number" example:"0"`
	NumberOfElements int              `json:"numberOfElements" example:"15"`
	First            bool             `json:"first" example:"true"`
	Last             bool             `json:"last" example:"false"`
	Empty            bool             `json:"empty" example:"false"`
}

// ListHistoryResponse represents the paginated response for sync history
type ListHistoryResponse struct {
	Status  int             `json:"status" example:"200"`
	Message string          `json:"message" example:"Sync histories retrieved successfully"`
	Data    ListHistoryData `json:"data"`
}

// GetHistoryResponse represents the response for retrieving a single history record
type GetHistoryResponse struct {
	Status  int            `json:"status" example:"200"`
	Message string         `json:"message" example:"Sync history retrieved successfully"`
	Data    SyncHistoryRow `json:"data"`
}

// RetryHistoryResponse represents the response for triggering a sync retry
type RetryHistoryResponse struct {
	Status  int            `json:"status" example:"200"`
	Message string         `json:"message" example:"Sync history will be retried"`
	Data    SyncHistoryRow `json:"data"`
}

// StatsHandler godoc
// @Summary      Get sync statistics
// @Description  Emits aggregated counts of sync histories grouped by status type (SUCCESSFUL, FAILED, PENDING_RETRY, INVALID)
// @Tags         history
// @Produce      json
// @Security     ApiKeyAuth
// @Success      200 {object} StatsResponse
// @Failure      401 {object} errors.AppError "Access Denied"
// @Failure      500 {object} errors.AppError "Internal server error"
// @Router       /api/v1/sync/stats [get]
func StatsHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		rows, err := db.Query("SELECT status, COUNT(*) as cnt FROM sync_history GROUP BY status")
		if err != nil {
			appErr := appErrors.HandleDBError(err)
			c.JSON(appErr.StatusCode, appErr)
			return
		}
		defer rows.Close()

		var successful int64
		var failed int64
		var pendingRetry int64
		var invalid int64
		var total int64

		for rows.Next() {
			var status string
			var cnt int64
			if err := rows.Scan(&status, &cnt); err != nil {
				appErr := appErrors.HandleDBError(err)
				c.JSON(appErr.StatusCode, appErr)
				return
			}
			total += cnt

			switch strings.ToUpper(status) {
			case "SUCCESSFUL":
				successful = cnt
			case "FAILED":
				failed = cnt
			case "PENDING_RETRY":
				pendingRetry = cnt
			case "INVALID":
				invalid = cnt
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"status":  http.StatusOK,
			"message": "Stats retrieved successfully",
			"data": gin.H{
				"successful":    successful,
				"failed":        failed,
				"pending_retry": pendingRetry,
				"invalid":       invalid,
				"total":         total,
			},
		})
	}
}

// ListHistoryHandler: GET /api/v1/sync-history
// ListHistoryHandler godoc
// @Summary      List sync history
// @Description  Retrieves a paginated list of sync history logs, optionally filtered by status.
// @Tags         history
// @Produce      json
// @Security     ApiKeyAuth
// @Param        page query int false "Page number (1-based)" default(1)
// @Param        size query int false "Page size" default(15)
// @Param        status query string false "Filter by status (SUCCESSFUL, FAILED, PENDING_RETRY, INVALID)"
// @Success      200 {object} ListHistoryResponse
// @Failure      401 {object} errors.AppError "Access Denied"
// @Failure      500 {object} errors.AppError "Internal server error"
// @Router       /api/v1/sync-history [get]
func ListHistoryHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		pageStr := c.DefaultQuery("page", "1")
		sizeStr := c.DefaultQuery("size", "15")
		statusStr := c.Query("status")

		page, err := strconv.ParseInt(pageStr, 10, 64)
		if err != nil || page < 1 {
			page = 1
		}
		size, err := strconv.ParseInt(sizeStr, 10, 64)
		if err != nil || size < 1 {
			size = 15
		}

		safePage := page - 1
		offset := safePage * size

		var totalElements int64
		var rows *sql.Rows

		if statusStr != "" {
			st := strings.ToUpper(statusStr)
			err = db.QueryRow("SELECT COUNT(*) FROM sync_history WHERE status = ?", st).Scan(&totalElements)
			if err != nil {
				appErr := appErrors.HandleDBError(err)
				c.JSON(appErr.StatusCode, appErr)
				return
			}

			rows, err = db.Query(
				"SELECT id, payload, status, failure_reason, retries, "+
					"strftime('%Y-%m-%dT%H:%M:%fZ', created_at) as created_at, "+
					"strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) as updated_at "+
					"FROM sync_history WHERE status = ? "+
					"ORDER BY id DESC LIMIT ? OFFSET ?",
				st, size, offset,
			)
		} else {
			err = db.QueryRow("SELECT COUNT(*) FROM sync_history").Scan(&totalElements)
			if err != nil {
				appErr := appErrors.HandleDBError(err)
				c.JSON(appErr.StatusCode, appErr)
				return
			}

			rows, err = db.Query(
				"SELECT id, payload, status, failure_reason, retries, "+
					"strftime('%Y-%m-%dT%H:%M:%fZ', created_at) as created_at, "+
					"strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) as updated_at "+
					"FROM sync_history "+
					"ORDER BY id DESC LIMIT ? OFFSET ?",
				size, offset,
			)
		}

		if err != nil {
			appErr := appErrors.HandleDBError(err)
			c.JSON(appErr.StatusCode, appErr)
			return
		}
		defer rows.Close()

		historyList := []SyncHistoryRow{}
		for rows.Next() {
			var r SyncHistoryRow
			err := rows.Scan(&r.ID, &r.Payload, &r.Status, &r.FailureReason, &r.Retries, &r.CreatedAt, &r.UpdatedAt)
			if err != nil {
				appErr := appErrors.HandleDBError(err)
				c.JSON(appErr.StatusCode, appErr)
				return
			}
			historyList = append(historyList, r)
		}

		totalPages := int64(math.Ceil(float64(totalElements) / float64(size)))

		c.JSON(http.StatusOK, gin.H{
			"status":  http.StatusOK,
			"message": "Sync histories retrieved successfully",
			"data": gin.H{
				"content": historyList,
				"pageable": gin.H{
					"sort": gin.H{
						"empty":    false,
						"sorted":   true,
						"unsorted": false,
					},
					"offset":     offset,
					"pageNumber": safePage,
					"pageSize":   size,
					"paged":      true,
					"unpaged":    false,
				},
				"totalElements":    totalElements,
				"totalPages":       totalPages,
				"size":             size,
				"number":           safePage,
				"numberOfElements": len(historyList),
				"first":            safePage == 0,
				"last":             safePage >= totalPages-1 || totalPages == 0,
				"empty":            len(historyList) == 0,
			},
		})
	}
}

// GetHistoryHandler: GET /api/v1/sync-history/{id}
// GetHistoryHandler godoc
// @Summary      Get sync history details
// @Description  Fetches a single sync history record by its database ID.
// @Tags         history
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id path int true "Sync History ID"
// @Success      200 {object} GetHistoryResponse
// @Failure      400 {object} errors.AppError "Invalid sync history ID"
// @Failure      401 {object} errors.AppError "Access Denied"
// @Failure      404 {object} errors.AppError "Sync history not found"
// @Failure      500 {object} errors.AppError "Internal server error"
// @Router       /api/v1/sync-history/{id} [get]
func GetHistoryHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  http.StatusBadRequest,
				"message": "Invalid sync history ID",
			})
			return
		}

		var r SyncHistoryRow
		err = db.QueryRow(
			"SELECT id, payload, status, failure_reason, retries, "+
				"strftime('%Y-%m-%dT%H:%M:%fZ', created_at) as created_at, "+
				"strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) as updated_at "+
				"FROM sync_history WHERE id = ?",
			id,
		).Scan(&r.ID, &r.Payload, &r.Status, &r.FailureReason, &r.Retries, &r.CreatedAt, &r.UpdatedAt)

		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				appErr := appErrors.NewNotFoundError("Sync history not found")
				c.JSON(appErr.StatusCode, appErr)
				return
			}
			appErr := appErrors.HandleDBError(err)
			c.JSON(appErr.StatusCode, appErr)
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":  http.StatusOK,
			"message": "Sync history retrieved successfully",
			"data":    r,
		})
	}
}

// RetryHistoryHandler: POST /api/v1/sync-history/retry/{id}
// RetryHistoryHandler godoc
// @Summary      Retry failed sync history
// @Description  Triggers a retry operation on a failed sync history by resetting its status to PENDING_RETRY.
// @Tags         history
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id path int true "Sync History ID"
// @Success      200 {object} RetryHistoryResponse
// @Failure      400 {object} errors.AppError "Invalid sync history ID or only failed syncs can be retried"
// @Failure      401 {object} errors.AppError "Access Denied"
// @Failure      404 {object} errors.AppError "Sync history not found"
// @Failure      500 {object} errors.AppError "Internal server error"
// @Router       /api/v1/sync-history/retry/{id} [post]
func RetryHistoryHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  http.StatusBadRequest,
				"message": "Invalid sync history ID",
			})
			return
		}

		var status string
		err = db.QueryRow("SELECT status FROM sync_history WHERE id = ?", id).Scan(&status)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				appErr := appErrors.NewNotFoundError("Sync history not found")
				c.JSON(appErr.StatusCode, appErr)
				return
			}
			appErr := appErrors.HandleDBError(err)
			c.JSON(appErr.StatusCode, appErr)
			return
		}

		if strings.ToUpper(status) != "FAILED" {
			appErr := appErrors.NewBadRequestError("Only failed syncs can be retried")
			c.JSON(appErr.StatusCode, appErr)
			return
		}

		_, err = db.Exec(
			"UPDATE sync_history SET status = 'PENDING_RETRY', failure_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
			id,
		)
		if err != nil {
			appErr := appErrors.HandleDBError(err)
			c.JSON(appErr.StatusCode, appErr)
			return
		}

		var r SyncHistoryRow
		err = db.QueryRow(
			"SELECT id, payload, status, failure_reason, retries, "+
				"strftime('%Y-%m-%dT%H:%M:%fZ', created_at) as created_at, "+
				"strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) as updated_at "+
				"FROM sync_history WHERE id = ?",
			id,
		).Scan(&r.ID, &r.Payload, &r.Status, &r.FailureReason, &r.Retries, &r.CreatedAt, &r.UpdatedAt)

		if err != nil {
			appErr := appErrors.HandleDBError(err)
			c.JSON(appErr.StatusCode, appErr)
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":  http.StatusOK,
			"message": "Sync history will be retried",
			"data":    r,
		})
	}
}

// DeleteHistoryHandler: DELETE /api/v1/sync-history/{id}
// DeleteHistoryHandler godoc
// @Summary      Delete sync history
// @Description  Deletes a sync history log entry from the database by its ID.
// @Tags         history
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id path int true "Sync History ID"
// @Success      204 "No Content"
// @Failure      400 {object} errors.AppError "Invalid sync history ID"
// @Failure      401 {object} errors.AppError "Access Denied"
// @Failure      404 {object} errors.AppError "Sync history not found"
// @Failure      500 {object} errors.AppError "Internal server error"
// @Router       /api/v1/sync-history/{id} [delete]
func DeleteHistoryHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  http.StatusBadRequest,
				"message": "Invalid sync history ID",
			})
			return
		}

		res, err := db.Exec("DELETE FROM sync_history WHERE id = ?", id)
		if err != nil {
			appErr := appErrors.HandleDBError(err)
			c.JSON(appErr.StatusCode, appErr)
			return
		}

		affected, err := res.RowsAffected()
		if err != nil {
			appErr := appErrors.HandleDBError(err)
			c.JSON(appErr.StatusCode, appErr)
			return
		}

		if affected == 0 {
			appErr := appErrors.NewNotFoundError("Sync history not found")
			c.JSON(appErr.StatusCode, appErr)
			return
		}

		c.JSON(http.StatusNoContent, gin.H{
			"status":  http.StatusNoContent,
			"message": "Sync history deleted successfully",
		})
	}
}
