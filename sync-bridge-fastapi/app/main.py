from contextlib import asynccontextmanager

from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator

from app.database import init_db
from app.graphql import CustomGraphQLRouter, schema
from app.middleware import AuthMiddleware, RequestIdMiddleware, register_exception_handlers, setup_logging
from app.routes import health, sync, sync_history

# Setup structured JSON logging
setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Perform database initialization (migrations)
    await init_db()
    yield


app = FastAPI(
    title="Sync Bridge API",
    description="Python FastAPI implementation of Sync Bridge",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/v1/docs",
    openapi_url="/api/v1/openapi.json",
)

# Register request exception mapping handlers
register_exception_handlers(app)

# Register request logging & auth middlewares
# Starlette executes middlewares in reverse order of registration:
# AuthMiddleware runs first, RequestIdMiddleware runs second (providing Request ID context)
app.add_middleware(AuthMiddleware)
app.add_middleware(RequestIdMiddleware)

# Include REST API Routers
app.include_router(health.router, prefix="/api/v1")
app.include_router(sync.router, prefix="/api/v1")
app.include_router(sync_history.router, prefix="/api/v1/sync-history")

# Include GraphQL Router
graphql_router = CustomGraphQLRouter(schema)
app.include_router(graphql_router, prefix="/graphql")


# Expose interactive Swagger docs at the Spring Boot path too
@app.get("/api/v1/swagger-ui/index.html", include_in_schema=False)
async def redirect_swagger():
    from fastapi.responses import RedirectResponse

    return RedirectResponse(url="/api/v1/docs")


# Initialize and mount Prometheus instrumentation
instrumentator = Instrumentator(
    should_group_status_codes=False, should_ignore_untemplated=True, should_respect_env_var=False
).instrument(app)

# Expose metrics on both standard /metrics and alternative /actuator/prometheus
instrumentator.expose(app, endpoint="/metrics")
instrumentator.expose(app, endpoint="/actuator/prometheus")
