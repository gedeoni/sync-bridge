package db

import (
	"database/sql"
	_ "embed"
	"fmt"
	"log"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

//go:embed migrations/001_init.sql
var initSQL string

func InitDB(databaseURL string) (*sql.DB, error) {
	dbPath := databaseURL
	if strings.HasPrefix(dbPath, "sqlite:") {
		dbPath = strings.TrimPrefix(dbPath, "sqlite:")
	}

	log.Printf("Initializing database connection pool for: %s (path: %s)", databaseURL, dbPath)

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(time.Hour)

	if _, err := db.Exec("PRAGMA foreign_keys = ON;"); err != nil {
		return nil, fmt.Errorf("failed to enable foreign keys: %w", err)
	}
	if _, err := db.Exec("PRAGMA busy_timeout = 5000;"); err != nil {
		return nil, fmt.Errorf("failed to set busy timeout: %w", err)
	}

	log.Println("Running database migrations...")
	if _, err := db.Exec(initSQL); err != nil {
		return nil, fmt.Errorf("failed to execute migrations: %w", err)
	}
	log.Println("Database migrations executed successfully.")

	return db, nil
}
