# 🎯 Sync Bridge C# (.NET 8 Core)

A high-performance, clean, secure, and maintainable C# port of the **Sync Bridge** API using **.NET 8 Core**, **Entity Framework Core (SQLite)**, and **Hot Chocolate GraphQL**.

---

## 📖 Table of Contents
- [✨ Key Features & Technical Highlights](#-key-features--technical-highlights)
- [🏗️ System Architecture](#%EF%B8%8F-system-architecture)
- [🛠️ Tech Stack & Dependencies](#%EF%B8%8F-tech-stack--dependencies)
- [🚀 Quick Start & Installation](#-quick-start--installation)
- [🧪 Running Integration Tests](#-running-integration-tests)
- [⚓ API Endpoints & Reference](#-api-endpoints--reference)
- [🧬 GraphQL API Guide](#-graphql-api-guide)
- [🛡️ Route-Sensitive Authentication Middleware](#%EF%B8%8F-route-sensitive-authentication-middleware)
- [📊 Observability & Telemetry Metrics](#-observability--telemetry-metrics)
- [⚠️ Error Handling & Transaction Integrity](#%EF%B8%8F-error-handling--transaction-integrity)

---

## ✨ Key Features & Technical Highlights

*   **DTO-First Type-Safe Mapping**: Seamless deserialization of incoming `snake_case` JSON payloads directly into strongly typed DTOs with model validations.
*   **ACID Transactional Security**: Processes batch imports inside isolated EF Core transactions. Should any validation fail or unique constraint trigger a collision, the transaction automatically rolls back all operations to guarantee database integrity.
*   **Immediate Ledging**: Sync requests are safely registered in the `sync_history` audit log as `pending_retry` before execution begins, ensuring a recovery trail exists even if the worker process crashes.
*   **Realtime GraphQL Subscriptions**: Utilizes Hot Chocolate's WebSockets transport (`graphql-ws`) backed by an in-memory pub/sub engine to emit live event updates whenever an employee record is successfully created.
*   **Route-Sensitive Middleware**: Injects structured tracing identifiers (`X-Request-Id`) across the routing chain, while protecting administrative operations with zero-overhead token interceptors.
*   **Observability**: Exposes Prometheus-compatible scrapers instantly, tracking latencies, success rates, and errors.

---

## 🛠️ Tech Stack & Dependencies

The service leverages a state-of-the-art C# .NET 8 ecosystem:

| Component | Technology | Version | Description |
| :--- | :--- | :--- | :--- |
| **HTTP Engine** | `ASP.NET Core` | `8.0` | Lightweight controllers and minimal pipeline configuration. |
| **GraphQL Engine** | `Hot Chocolate` | `13.9` | De facto industry standard GraphQL parser, executor, and schema generator. |
| **ORM Engine** | `EF Core` | `8.0` | Entity Framework Core provider with SQLite support. |
| **Telemetry** | `prometheus-net` | `8.2` | Core Prometheus exporter tracking system throughput and duration. |

---

## 🚀 Quick Start & Installation

### 1. Prerequisites
- **.NET 8.0 SDK**: Download from [dotnet.microsoft.com](https://dotnet.microsoft.com/download/dotnet/8.0).

### 2. Environment Configuration
The service is configured via configuration files or environment variables:

```bash
# Define application port (defaults to 3000)
export PORT=3000

# Secret authorization key used to guard write endpoints
export AUTHORIZATION_KEY="your-secret-auth-key"

# Path to SQLite database (defaults to local file)
export DATABASE_URL="Data Source=sync-bridge.db"
```

### 3. Build & Run
Restore dependencies, build the project, and start the server:

```bash
# Build the solution
dotnet build

# Run the API server
dotnet run --project SyncBridgeCsharp
```

---

## 🧪 Running Integration Tests

The integration test suite (`SyncBridgeCsharp.Tests`) spawns an isolated test server using `WebApplicationFactory` and executes end-to-end REST and GraphQL flows against dynamic test-specific SQLite databases:

```bash
# Run all integration tests
dotnet test
```

---

## ⚓ API Endpoints & Reference

All endpoints, except public status hooks and telemetry feeds, require route-level authorization using the header `x-auth-token: your-secret-auth-key`.

### Endpoint Directory

| Category | HTTP Method | Route | Auth Header Required? | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Liveness** | `GET` | `/api/v1/healthz` | **No** | Verifies database liveness (both read & write capability). |
| **Metrics** | `GET` | `/metrics`<br>`/actuator/prometheus` | **No** | Emits Prometheus-compatible scraper telemetry logs. |
| **GraphQL** | `POST` | `/graphql` | **Conditional** | Handles GraphQL API query, mutation, and subscription requests. |
| **Sync** | `POST` | `/api/v1/sync` | **Yes** | Syncs a batch of items inside an isolated ACID transaction. |
| **Analytics**| `GET` | `/api/v1/sync/stats` | **Yes** | Returns statistical sums of successes and failures. |
| **Auditing** | `GET` | `/api/v1/sync-history` | **Yes** | Lists all paginated historical sync transactions. |
| **Auditing** | `GET` | `/api/v1/sync-history/{id}` | **Yes** | Fetches detailed payloads and failures of a single transaction. |
| **Auditing** | `DELETE`| `/api/v1/sync-history/{id}` | **Yes** | Purges a specific audit record from sync history. |
| **Auditing** | `POST` | `/api/v1/sync-history/retry/{id}` | **Yes** | Re-queues a failed sync history record for reprocessing. |

---

## 🧬 GraphQL API Guide

The GraphQL engine is mapped at `/graphql` and exposes queries, mutations, and WebSocket subscriptions.

### Queries

#### 1. Public API Greeting
```graphql
query {
  hello
}
```

#### 2. Paginated Employees Listing
```graphql
query {
  employees(offset: 0, limit: 10) {
    id
    employeeId
    firstName
    lastName
    fullName
    email
    jobTitle
  }
}
```

#### 3. Search Employees
```graphql
query {
  searchEmployees(search: "Jane", offset: 0, limit: 5) {
    id
    fullName
    email
    department
  }
}
```

### Mutations

> [!IMPORTANT]
> Any mutations creating records (e.g., `createEmployee`) are intercepted by the authentication middleware and **require** the `x-auth-token` header.

#### 1. Create a New Employee
```graphql
mutation {
  createEmployee(data: {
    id: 999,
    employeeId: "EMP-999",
    firstName: "Jane",
    lastName: "Doe",
    email: "jane.doe@example.com",
    company: "SyncCorp",
    jobTitle: "Principal C# Architect"
  }) {
    id
    employeeId
    fullName
    email
  }
}
```

#### 2. Update an Employee
```graphql
mutation {
  updateEmployee(id: 999, data: {
    jobTitle: "VP of Engineering",
    company: "SyncCorp International"
  }) {
    id
    fullName
    jobTitle
    company
  }
}
```

#### 3. Delete an Employee
```graphql
mutation {
  deleteEmployee(id: 999)
}
```

### Subscriptions (Realtime WebSocket)
Subscribe to `employeeCreated` to receive real-time streams of newly created records over standard WebSockets:

```graphql
subscription {
  employeeCreated {
    id
    employeeId
    fullName
    email
    jobTitle
  }
}
```

---

## 🛡️ Route-Sensitive Authentication Middleware

The `AuthMiddleware` behaves intelligently depending on the route and payload:
1.  **Skip Auth**: Route liveness queries (`/api/v1/healthz`) and standard Prometheus calls (`/metrics`, `/actuator/prometheus`) are completely public.
2.  **GraphQL Body Inspection**: If a request path is `/graphql`, it buffers the body to inspect operations. Read queries bypass authentication, while mutations creating records strictly enforce `x-auth-token` headers.
3.  **Strict REST Interception**: Standard sync endpoints under `/api/v1/sync` and `/api/v1/sync-history` strictly require valid authentication keys.

---

## 📊 Telemetry Metrics
Metrics are captured using Prometheus collectors and exposed at `/metrics` and `/actuator/prometheus`:
-   `sync_duration_seconds`: Histogram measuring individual model synchronization run times, categorized by `status` (success, error) and `model` (customers, products, orders, employees).
-   `sync_total`: Total count of synchronization actions attempted.
-   `sync_errors`: Categorized counter tracking error events, tagged by exact exception class (e.g. `SqliteException`, `ValidationException`, `ApiException`) and the affected `model`.

---

## ⚠️ Error Handling & Transaction Integrity
1.  **Sanitized Unique Constraints**: Attempts to synchronize duplicate records are caught cleanly. The server intercepts SQLite constraint violations and translates them into semantic `409 Conflict` REST answers, reporting:
    ```json
    {
      "status": 409,
      "message": "Duplicate entry: field 'EMAIL' already exists"
    }
    ```
2.  **Strict Order Schema Validation**: If individual `OrderItemDto` records are included in the request, the service enforces that the order-level `amount` perfectly matches the calculated sum of `qty * unit_price` for all items. A mismatch returns `400 Bad Request`.
3.  **Automatic Rolling History**: If a transaction encounters an issue midway, the database is rolled back immediately to clear SQLite locks, while the matching ledger entry in `sync_history` is successfully updated to `FAILED`, detailing the error trace in `failure_reason`.
