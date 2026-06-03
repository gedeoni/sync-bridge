package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        int
	AuthToken   string
	DatabaseURL string
}

func LoadConfig() Config {
	// Load .env file if present at the project root
	_ = godotenv.Load()

	portStr := os.Getenv("APP_PORT")
	if portStr == "" {
		portStr = "3000"
	}
	port, err := strconv.Atoi(portStr)
	if err != nil {
		port = 3000
	}

	authToken := os.Getenv("AUTHORIZATION_KEY")
	if authToken == "" {
		authToken = "your-secret-auth-key"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "sqlite::memory:?cache=shared"
	}

	return Config{
		Port:        port,
		AuthToken:   authToken,
		DatabaseURL: dbURL,
	}
}
