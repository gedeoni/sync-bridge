# Sync Bridge Go

## Overview
- **Purpose:** Go implementation of an API allowing transactional data sync between databases.
- **Stack:** Go, Gin framework, SQLite (`modernc.org/sqlite` pure-Go driver), `gqlgen` for GraphQL, Prometheus client for telemetry.

## Features & Advantages
1. **Low Cognitive Load & Cyclomatic Complexity**: Constructed with clean, idiomatic Go routines. Standard database/sql is used directly, avoiding complex ORM side-effects.
2. **CGO-free SQLite**: The sqlite database uses a pure-Go driver. No GCC/Clang compilers are required to compile or run the application, which simplifies deployment significantly.
3. **Robust Transaction Safety**: if a sync operations fails (e.g. unique constraint or item validation error), target database modifications roll back, but the execution log is safely committed into `sync_history` with a status of `FAILED` and the error description.
4. **Comprehensive Observability**: Exposes Prometheus-scrappable metrics at `/metrics` and `/actuator/prometheus` (tracking latency percentiles, throughput counters, and error exception tallies).
5. **Real-time Subscriptions**: GraphQL WebSocket subscriptions allow streaming new employee notifications live to web clients.

## Quick Start

### Build & Run
Ensure you have Go (1.22+) installed.
```bash
# From workspace root
cd sync-bridge-go

# Run the server
go run cmd/server/main.go
```
The server starts on port `3000` by default.

### Configuration
Can be configured via environment variables:
- `APP_PORT`: Server port (default: `3000`)
- `AUTHORIZATION_KEY`: Security header `x-auth-token` verification key (default: `your-secret-auth-key`)
- `DATABASE_URL`: Location of SQLite database (default: `sqlite::memory:?cache=shared`)

### Testing
Execute the complete integration test suite:
```bash
go test -v ./...
```

---

## API Documentation

### HTTP Endpoints

| Endpoint | Method | Authentication | Description |
|---|---|---|---|
| `/api/v1/healthz` | `GET` | No | Basic server & DB read/write verification |
| `/api/v1/sync` | `POST` | Yes | Syncs data payload items (customers, products, orders, employees) |
| `/api/v1/sync/stats` | `GET` | Yes | Emits counts of histories by status type |
| `/api/v1/sync-history` | `GET` | Yes | List paginated history records |
| `/api/v1/sync-history/:id` | `GET` | Yes | Fetch single sync details |
| `/api/v1/sync-history/retry/:id` | `POST` | Yes | Triggers a retry on failed syncs |
| `/api/v1/sync-history/:id` | `DELETE` | Yes | Deletes history log entry |
| `/metrics` | `GET` | No | Prometheus metrics output |
| `/actuator/prometheus` | `GET` | No | Prometheus metrics output |
| `/graphql` | `POST`/`GET` | Sensitive mutations only | Run GraphQL operations |
| `/playground` | `GET` | No | Interactive GraphQL sandbox |
| `/swagger/*any` | `GET` | No | Swagger API documentation UI |


## Pre-commit Hooks
A pre-commit hook is registered in the monorepo root. When changes are staged inside `sync-bridge-go`, the pre-commit script will automatically:
1. Run formatting checks (`gofmt`).
2. Run the integration test suite (`go test`).
