# Sync Bridge NestJS

NestJS implementation of the Sync Bridge API mirrored from the Spring Boot version in `../sync-bridge-java`. It exposes the same endpoints under `/api/v1`, enforces an `x-auth-token` header, and persists data with SQLite via TypeORM.

## Stack
- NestJS 10
- TypeORM + SQLite (file-based, `DB_PATH` env)
- Class-validator / class-transformer for DTO validation
- Global auth guard + exception filter

## Quick start
1. Install dependencies
   ```bash
   npm install
   ```
2. Copy the env template and set your auth token
   ```bash
   cp .env.example .env
   # update APP_AUTH_TOKEN and DB_PATH if desired
   ```
3. Run the API
   ```bash
   npm run start:dev
   ```
4. Call endpoints with the `x-auth-token` header set to `APP_AUTH_TOKEN` (health is public).

## Endpoints
- `GET /docs` — Interactive Swagger API documentation UI (no auth)
- `GET /docs-json` — OpenAPI JSON specification document (no auth)
- `GET /api/v1/healthz` — health + DB read/write probe (no auth)
- `POST /api/v1/sync` — body `{ model: customers|products|orders|employees, data: [...] }`
- `GET /api/v1/sync/stats` — aggregate sync history counts
- `GET /api/v1/sync-history` — paginated listing (`page`, `size`, optional `status`)
- `GET /api/v1/sync-history/:id` — single history entry
- `POST /api/v1/sync-history/retry/:id` — retry failed entry (sets `pending_retry`)
- `DELETE /api/v1/sync-history/:id` — delete history entry

## Notable behaviors
- DTO validation mirrors the Java version (snake_case JSON accepted via DTOs/transformers where applicable).
- Orders enforce `amount` equals the sum of item `qty * unit_price` when items are provided; otherwise `amount` is required.
- Sync attempts are recorded in `sync_history` with statuses: `pending_retry`, `successful`, `failed`, `invalid`.
- Unique constraint violations return `409 Conflict` with sanitized field messaging.
- Aspect-style instrumentation via `@Monitored` + global interceptor records success/error counts and latency per endpoint, logging structured JSON with tags and request IDs.

## GraphQL
- Available at `/graphql` with playground enabled.
- Employee operations:
  - `employees(offset, limit)` list
  - `employee(id)` by id
  - `searchEmployees(search, offset, limit)`
  - `createEmployee`, `updateEmployee`, `deleteEmployee` mutations
  - Subscription `employeeCreated` (graphql-ws) emits on creation
- Uses same auth header (`x-auth-token`) via the global guard.

## Database Migrations

This project uses TypeORM CLI for database schema migrations.

### Generating Migrations
If you modify any entity schema, generate a new migration with:
```bash
npm run build
npm run migration:generate -- src/migrations/YourMigrationName
```

### Running Migrations
To execute all pending migrations on your database:
```bash
npm run migration:run
```

### Reverting Migrations
To undo the last executed migration:
```bash
npm run migration:revert
```

*Note: In non-development environments, pending migrations are automatically executed on application startup.*

## Testing

This project includes a comprehensive test suite covering unit tests and end-to-end (E2E) HTTP integration tests.

### Running Unit Tests
Execute unit tests for all controllers and services (with isolated repository mocks):
```bash
npm run test
```

### Running E2E Tests
Execute E2E integration tests (runs `supertest` requests against an isolated local SQLite test database which is cleaned up after testing):
```bash
npm run test:e2e
```

### Generating Coverage Reports
Run tests and generate complete HTML/text coverage reports:
```bash
npm run test:cov
```

## Configuration
- `APP_AUTH_TOKEN` — required for all routes except health.
- `DB_PATH` — SQLite file path (default `sync-bridge.db`).
- `PORT` — server port (default `3000`).
- `NODE_ENV` — environment mode (`development` enables schema auto-synchronization; other values like `production` disable it and enforce migrations).
