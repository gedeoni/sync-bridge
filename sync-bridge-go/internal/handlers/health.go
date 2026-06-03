package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// HealthResponse represents the health check response payload
type HealthResponse struct {
	Status  int             `json:"status" example:"200"`
	Message string          `json:"message" example:"Service is healthy"`
	Data    HealthCheckData `json:"data"`
}

// HealthCheckData represents the detail status of system components
type HealthCheckData struct {
	Read      bool   `json:"read" example:"true"`
	Write     bool   `json:"write" example:"true"`
	Timestamp string `json:"timestamp" example:"2026-06-03T07:46:58Z"`
}

// HealthHandler godoc
// @Summary      System health check
// @Description  Verifies basic server operation and database read/write capabilities
// @Tags         system
// @Produce      json
// @Success      200  {object}  HealthResponse
// @Failure      503  {object}  HealthResponse
// @Router       /api/v1/healthz [get]
func HealthHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		readOk := false
		writeOk := false

		// 1. Perform database read check
		var val int
		err := db.QueryRow("SELECT 1").Scan(&val)
		if err == nil {
			readOk = true
		}

		// 2. Perform database write check: insert a temp customer and delete it
		email := fmt.Sprintf("healthcheck-%s@example.com", uuid.New().String())
		_, writeErr := db.Exec(
			"INSERT INTO customers (email, first_name, last_name, default_currency) VALUES (?, 'Health', 'Check', 'USD')",
			email,
		)

		if writeErr == nil {
			// Clean up immediately
			_, _ = db.Exec("DELETE FROM customers WHERE email = ?", email)
			writeOk = true
		}

		isHealthy := readOk && writeOk
		status := http.StatusOK
		message := "Service is healthy"
		if !isHealthy {
			status = http.StatusServiceUnavailable
			message = "Service is unhealthy"
		}

		c.JSON(status, gin.H{
			"status":  status,
			"message": message,
			"data": gin.H{
				"read":      readOk,
				"write":     writeOk,
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			},
		})
	}
}
