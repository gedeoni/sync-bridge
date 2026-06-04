# Sync Bridge FastAPI (Python)

## Overview
- **Purpose:** Python FastAPI implementation of the Sync Bridge API, enabling data transfer between databases.
- **Stack:** Python 3.13+, FastAPI, SQLAlchemy 2.0 (async), AioSQLite (SQLite async), Strawberry GraphQL, Prometheus-FastAPI-Instrumentator, Ruff.

## Features
- **DTO-first mapping:** Incoming JSON requests are validated and mapped to Pydantic schemas.
- **Centralized mapping:** Translation logic from DTOs to SQLAlchemy models is isolated in `app/mappers.py` with custom business rule checks (e.g. order amount totals).
- **Sanitized DB Errors:** SQLAlchemy/SQLite unique constraint violations are intercepted and returned as sanitized `409 Conflict` errors with clear field-level messaging.
- **Observability:** Custom ASGI middleware/instrumentator collects and exposes Prometheus metrics at `/actuator/prometheus` (and `/metrics`). Structured JSON logging outputs a tracing `requestId` for all REST and GraphQL actions.
- **GraphQL Integration:** Endpoint `/graphql` supports Queries, Mutations, and WebSockets Subscriptions (`employeeCreated`). Mutations are protected by `x-auth-token`, while queries are public.

## API Endpoints

### REST Endpoints
All authenticated endpoints require the `x-auth-token` header.

* **GET `/api/v1/healthz`** - Health check endpoint (verifies database read and write). *Public*.
* **GET `/api/v1/sync/stats`** - Retrieves statistics of synchronization history. *Authenticated*.
* **GET `/api/v1/sync-history`** - Fetches paginated logs of past sync executions. Supports query parameters: `page`, `size`, and `status`. *Authenticated*.
* **POST `/api/v1/sync`** - Synchronizes a list of items for a specific model (`customers`, `products`, `orders`, or `employees`). *Authenticated*.
* **GET `/api/v1/docs`** - Interactive Swagger UI API documentation. *Public*.

### GraphQL Endpoints
* **POST `/graphql`** - Core endpoint for GraphQL operations:
  * **Queries** (e.g., `search_employees`) are *Public*.
  * **Mutations** (e.g., `create_employee`, `update_employee`, `delete_employee`) are *Authenticated* and require `x-auth-token`.
  * **Subscriptions** (e.g., `employee_created`) use WebSockets for real-time creation events.

## Quick Start

### 1. Set Up Environment
Create a virtual environment and install the dependencies (using `uv` is recommended for high performance):
```bash
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
```


### 2. Run the Service (Dev)
```bash
python -m uvicorn app.main:app --port 3000 --reload
```
or use  uv 
```
uv sync 
uv run uvicorn app.main:app --port 3000 --reload
```


### 3. Run Tests
```bash
python -m pytest
```
