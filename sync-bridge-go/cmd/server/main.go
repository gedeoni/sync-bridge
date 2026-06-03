package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	_ "sync-bridge-go/docs"
	"sync-bridge-go/graph"
	"sync-bridge-go/internal/config"
	"sync-bridge-go/internal/db"
	"sync-bridge-go/internal/handlers"
	"sync-bridge-go/internal/middleware"
)

// @title           Sync Bridge Go API
// @version         1.0
// @description     Transactional data synchronization API for SQLite target databases.
// @host            localhost:3000
// @BasePath        /
// @securityDefinitions.apikey ApiKeyAuth
// @in              header
// @name            x-auth-token
func main() {
	// 1. Load configuration
	cfg := config.LoadConfig()

	// 2. Initialize Database & run migrations
	dbConn, err := db.InitDB(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Fatal: Database initialization failed: %v", err)
	}
	defer dbConn.Close()

	// 3. Setup Gin Engine
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	// Apply Request ID tracking middleware
	r.Use(middleware.RequestIDMiddleware())

	// Apply Route-sensitive Authentication middleware
	r.Use(middleware.AuthMiddleware(cfg.AuthToken))

	// Mount Swagger UI
	r.GET("/swagger/*any", func(c *gin.Context) {
		param := c.Param("any")
		if param == "" || param == "/" {
			c.Redirect(http.StatusMovedPermanently, "/swagger/index.html")
			return
		}
		ginSwagger.WrapHandler(swaggerFiles.Handler)(c)
	})
	r.GET("/swagger", func(c *gin.Context) {
		c.Redirect(http.StatusMovedPermanently, "/swagger/index.html")
	})

	// 4. Mount Prometheus metrics scraper targets
	metricsHandler := gin.WrapH(promhttp.Handler())
	r.GET("/metrics", metricsHandler)
	r.GET("/actuator/prometheus", metricsHandler)

	// 5. Mount REST endpoints under /api/v1
	api := r.Group("/api/v1")
	{
		api.GET("/healthz", handlers.HealthHandler(dbConn))
		api.POST("/sync", handlers.SyncHandler(dbConn))
		api.GET("/sync/stats", handlers.StatsHandler(dbConn))
		api.GET("/sync-history", handlers.ListHistoryHandler(dbConn))
		api.GET("/sync-history/:id", handlers.GetHistoryHandler(dbConn))
		api.POST("/sync-history/retry/:id", handlers.RetryHistoryHandler(dbConn))
		api.DELETE("/sync-history/:id", handlers.DeleteHistoryHandler(dbConn))
	}

	// 6. Setup GraphQL endpoints
	broker := graph.NewEmployeeBroker()
	srv := handler.New(graph.NewExecutableSchema(graph.Config{
		Resolvers: &graph.Resolver{
			DB:     dbConn,
			Broker: broker,
		},
	}))

	srv.AddTransport(transport.Websocket{
		KeepAlivePingInterval: 10 * time.Second,
		Upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		},
	})
	srv.AddTransport(transport.Options{})
	srv.AddTransport(transport.GET{})
	srv.AddTransport(transport.POST{})
	srv.AddTransport(transport.MultipartForm{})

	r.GET("/graphql", gin.WrapH(srv))
	r.POST("/graphql", gin.WrapH(srv))
	r.GET("/playground", gin.WrapH(playground.Handler("GraphQL", "/graphql")))
	r.GET("/", func(c *gin.Context) {
		c.Redirect(http.StatusMovedPermanently, "/playground")
	})

	// 7. Start HTTP Server with graceful shutdown
	serverAddr := fmt.Sprintf(":%d", cfg.Port)
	srvHttp := &http.Server{
		Addr:    serverAddr,
		Handler: r,
	}

	go func() {
		log.Printf("Server listening on http://localhost:%d", cfg.Port)
		log.Printf("GraphQL Playground available at http://localhost:%d/playground", cfg.Port)
		if err := srvHttp.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Fatal server error: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shut down the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srvHttp.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited cleanly.")
}
