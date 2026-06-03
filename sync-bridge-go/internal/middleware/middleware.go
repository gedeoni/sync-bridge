package middleware

import (
	"bytes"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// RequestIDMiddleware assigns a tracking UUID to each request.
func RequestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		reqID := c.GetHeader("X-Request-Id")
		if reqID == "" {
			reqID = uuid.New().String()
		}
		c.Set("request_id", reqID)
		c.Header("X-Request-Id", reqID)
		c.Next()
	}
}

// AuthMiddleware ensures authentication for sensitive REST and GraphQL mutations.
func AuthMiddleware(authToken string) gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path

		// 1. Healthz is public
		if path == "/api/v1/healthz" || path == "/healthz" {
			c.Next()
			return
		}

		// 2. GraphQL specific handling
		if path == "/graphql" || strings.HasSuffix(path, "/graphql") {
			if c.Request.Method == "POST" {
				var bodyBytes []byte
				if c.Request.Body != nil {
					var err error
					bodyBytes, err = io.ReadAll(c.Request.Body)
					if err == nil {
						c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
					}
				}

				bodyStr := string(bodyBytes)
				// Token is required only for mutations that modify/create employees
				if strings.Contains(bodyStr, "createEmployee") ||
					(strings.Contains(bodyStr, "mutation") && strings.Contains(bodyStr, "create")) {
					token := c.GetHeader("x-auth-token")
					if token == "" || token != authToken {
						c.JSON(http.StatusUnauthorized, gin.H{
							"status":  http.StatusUnauthorized,
							"message": "Access Denied",
						})
						c.Abort()
						return
					}
				}
			}
			c.Next()
			return
		}

		// 3. Standard REST routes: /api/v1/sync, /api/v1/sync-history (or any /api/v1/...)
		if strings.HasPrefix(path, "/api/v1/sync") || strings.HasPrefix(path, "/api/v1/sync-history") {
			token := c.GetHeader("x-auth-token")
			if token == "" || token != authToken {
				c.JSON(http.StatusUnauthorized, gin.H{
					"status":  http.StatusUnauthorized,
					"message": "Access Denied",
				})
				c.Abort()
				return
			}
		}

		c.Next()
	}
}
