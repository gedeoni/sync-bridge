# Sync Bridge Django

Sync Bridge is a robust data synchronization service built with Django. It serves as a centralized gateway for managing and synchronizing core business data (Customers, Products, Orders, and Employees) through both REST and GraphQL interfaces.

## Key Features
- **Hybrid API Architecture:** Unified REST endpoints for bulk data synchronization and a modern GraphQL API for granular queries and mutations.
- **Real-time Synchronization:** Built-in support for GraphQL Subscriptions via WebSockets, allowing clients to receive instant updates when resources are created.
- **Bulk Data Processing:** High-performance REST interface designed for ingesting large data payloads with automatic validation and history tracking.
- **Secure Authentication:** Centralized token-based authentication enforced via custom middleware and decorators.
- **Built-in Monitoring:** Integrated request-id tracking and performance monitoring for every operation.
- **Modern Tech Stack:** Leveraging Django 5.2, Strawberry GraphQL, and Django Channels for a fully asynchronous and scalable architecture.

## Stack
- Django 5+
- Django REST Framework
- Strawberry GraphQL + Channels (subscriptions)
- SQLite (file-based, `DB_PATH` env)

## Quick start
1. Create a virtual environment and install dependencies
   
   **Option A: Using standard pip**
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

   **Option B: Using uv (Fastest)**
   ```bash
   uv sync
   ```
2. Copy the env template and set your auth token
   ```bash
   cp .env.example .env
   # update APP_AUTH_TOKEN and DB_PATH if desired
   ```
3. Create and run migrations
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```
4. Start the API
   ```bash
   uv run python manage.py runserver
   ```

## Endpoints
- `GET /api/docs/` — Swagger UI API documentation (interactive)
- `GET /api/redoc/` — ReDoc API documentation (clean alternative)
- `GET /api/schema/` — OpenAPI 3.0 schema (JSON download)
- `GET /api/v1/healthz` — health + DB read/write probe (no auth)
- `POST /api/v1/sync` — body `{ model: customers|products|orders|employees, data: [...] }`
- `GET /api/v1/sync/stats` — aggregate sync history counts
- `GET /api/v1/sync-history` — paginated listing (`page`, `size`, optional `status`)
- `GET /api/v1/sync-history/:id` — single history entry
- `POST /api/v1/sync-history/retry/:id` — retry failed entry (sets `pending_retry`)
- `DELETE /api/v1/sync-history/:id` — delete history entry

All write operations (POST, DELETE, etc.) require an `x-auth-token` matching `APP_AUTH_TOKEN` in the headers. All `GET` requests (including accessing the interactive GraphQL playground and REST/Swagger documentation) are open and do not require authentication.

## GraphQL
- Available at `/graphql` (GraphiQL enabled).
- Employee operations:
  - `employees(offset, limit)` list
  - `employee(id)` by id
  - `searchEmployees(search, offset, limit)`
  - `createEmployee`, `updateEmployee`, `deleteEmployee` mutations
  - Subscription `employeeCreated` (graphql-ws) emits on creation

Subscriptions run over WebSockets on `/graphql` using the `graphql-ws` protocol. For production, replace the in-memory pubsub and channel layer with Redis.

## Configuration
- `APP_AUTH_TOKEN` — required for all routes except health.
- `DB_PATH` — SQLite file path (default `sync-bridge.db`).
- `PORT` — server port (default `8000` via runserver).
