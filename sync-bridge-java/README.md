# Sync Bridge Spring (Java)

## Overview

- **Purpose:** Spring Boot implementation of an API allowing data transfer between databases.
- **Stack:** Spring Boot, Spring Data JPA (Hibernate), H2 (default), Jackson, Micrometer, Logback (JSON encoder).

## What's New / Improvements

- **DTO-first mapping:** Incoming snake_case JSON is mapped to strongly-typed DTOs (`src/main/java/com/syncbridge/dto/SyncDtos.java`) using `@JsonProperty` where needed.
- **Centralized mapping:** `SyncMapper` converts DTOs to JPA entities (customers, products, orders, employees) with validation (e.g. order item amounts) in `src/main/java/com/syncbridge/mapper/SyncMapper.java`.
- **Robust error handling:** `GlobalExceptionHandler` centralizes API errors, sanitizes DB constraint messages (avoids leaking SQL), and returns `409 Conflict` for unique-constraint violations with a concise field-level message.
- **Observability:** Aspect-based instrumentation using `@Monitored` and `SyncAspect` to collect latency, throughput and error counters via Micrometer. Structured JSON logs are produced with `logback-spring.xml` and the Logstash encoder.
- **Metrics endpoint:** Prometheus-compatible metrics available at `/actuator/prometheus` (via Micrometer Prometheus registry).
- **Sync history:** All sync attempts are recorded in `SyncHistory` with statuses (`PENDING_RETRY`, `SUCCESSFUL`, `FAILED`, `INVALID`).

## Quick Start

- **Prerequisites:** JDK 17+, Maven.
- **Build:** `mvn -DskipTests package`
- **Run (dev):** `mvn spring-boot:run`
- **H2 console:** `http://localhost:3000/h2-console` (JDBC URL `jdbc:h2:mem:syncdb`)
- **Actuator metrics:** `http://localhost:3000/actuator/prometheus`

## Environment Configuration

The service is configured via configuration files or environment variables:

```bash
# Define application port (defaults to 3000)
export PORT=3000

# Secret authorization key used to guard write endpoints
export AUTHORIZATION_KEY="your-secret-auth-key"

# Path to SQLite database (defaults to local file)
export DATABASE_URL="Data Source=sync-bridge.db"
```

## CI/CD & Pre-commit Hooks

- **Continuous Integration:** A GitHub Actions workflow (`.github/workflows/java-ci.yml`) runs on every push and pull request to verify that the code compiles, lints successfully with **Checkstyle**, and passes all tests.
- **Local Pre-commit Hook:** A Git pre-commit hook is provided in `.githooks/pre-commit` to catch linting (Checkstyle) issues and failing tests locally before they are committed.

  - **Auto-installation:** The hook is automatically installed to `.git/hooks/` via the `git-build-hook-maven-plugin` whenever you run any Maven command (e.g., `mvn initialize` or `mvn compile`).
  - **Making it Executable:** Unix-based systems (like macOS or Linux) require hook scripts to be executable. Ensure the hook is configured properly by running the following commands in the root of the project:

    ```bash
    # Set the execute bit on both the template and the installed hook
    chmod +x .githooks/pre-commit
    chmod +x .git/hooks/pre-commit

    # Tell Git to track the file as executable in the repository (so it works out-of-the-box for other devs)
    git update-index --chmod=+x .githooks/pre-commit
    ```

## Recommended build change (parameter names)

- To allow the `@Monitored(tags={"paramName"})` aspect to extract parameter names reliably, compile with parameter metadata. Add this to your `pom.xml` under `maven-compiler-plugin` configuration:

```xml
<configuration>
	<compilerArgs>
		<arg>-parameters</arg>
	</compilerArgs>
</configuration>
```

## Important Files

- **DTOs:** `src/main/java/com/syncbridge/dto/SyncDtos.java`
- **Mapper:** `src/main/java/com/syncbridge/mapper/SyncMapper.java`
- **Service:** `src/main/java/com/syncbridge/service/SyncService.java`
- **Controller:** `src/main/java/com/syncbridge/controller/SyncController.java`
- **Exception handling:** `src/main/java/com/syncbridge/exception/GlobalExceptionHandler.java`
- **Observability:** `src/main/java/com/syncbridge/annotation/Monitored.java` and `src/main/java/com/syncbridge/aspect/SyncAspect.java`
- **Logging config:** `src/main/resources/logback-spring.xml`

## Available Endpoints & Auth

- **Auth Rules**:
  - Protected routes require the `x-auth-token` header matching `app.auth-token` (defined in `application.yml`).
  - The `/api/v1/healthz` endpoint is public and does not require authentication.
- **Sample Calls**:
  - A [requests.http](file:///Users/gedeon/Projects/Sync%20bridge/sync-bridge-java/requests.http) file is included at the root of the project. You can use it to execute sample REST and GraphQL requests directly (compatible with VS Code's REST Client extension or IntelliJ's HTTP client).

### Endpoint Reference

- **Health:** `GET /api/v1/healthz`
- **Sync:** `POST /api/v1/sync` — payload: `{ "model": "customers|products|orders|employees", "data": [ ... ] }`
- **Sync stats:** `GET /api/v1/sync/stats`
- **Sync history:** `GET /api/v1/sync-history`, `GET /api/v1/sync-history/{id}`, `POST /api/v1/sync-history/retry/{id}`, `DELETE /api/v1/sync-history/{id}`
- **Swagger UI:** `GET /api/v1/swagger-ui/index.html` — interactive API docs (public, no auth required)
- **OpenAPI spec:** `GET /api/v1/v3/api-docs` (JSON), `GET /api/v1/v3/api-docs.yaml` (YAML)

## Example curl (create customer)

```bash
cat <<'JSON' > /tmp/customer.json
{
	"model": "customers",
	"data": [
		{ "email": "testuser@example.com", "first_name": "Test", "last_name": "User", "default_currency": "USD" }
	]
}
JSON

curl -i -X POST http://localhost:3000/api/v1/sync \
	-H "Content-Type: application/json" \
	-H "x-auth-token: your-secret-auth-key" \
	--data @/tmp/customer.json
```

## Error behavior

- **Unique constraint:** Attempts to insert a duplicate (e.g. customer email) result in `409 Conflict` with a sanitized message like `Duplicate entry: field 'EMAIL' already exists`.
- **Internal errors:** Generic errors return `500 Internal Server Error`. If you see a `500` after adding `@Monitored`, see Troubleshooting below.

## Troubleshooting

- **500 when using `@Monitored(tags = {"..."})`:**
  - Cause: JVM may not retain parameter names at runtime by default, so the aspect's tag extraction can fail. Two fixes:
    - Compile with `-parameters` (recommended) as shown above.
    - Or avoid using `tags` by name and keep annotation without tags.
- **Where to find logs:** Application logs are written in `logs/app.log` (configured via `logback-spring.xml`). Structured JSON logs include `requestId` for tracing.

## License & Contributing

- Small, focused project: fork, change, and open PRs. Keep changes minimal and focused.
