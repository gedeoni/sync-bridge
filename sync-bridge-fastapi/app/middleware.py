import json
import logging
import os
import re
import sys
import uuid
from contextvars import ContextVar
from datetime import datetime, timezone

from fastapi import Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.exceptions import ApiException

# Thread-safe request ID context
request_id_ctx_var = ContextVar("request_id", default="")


class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "requestId": request_id_ctx_var.get(),
        }
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_record)


def setup_logging():
    root = logging.getLogger()
    for h in list(root.handlers):
        root.removeHandler(h)

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(JsonFormatter())
    root.addHandler(console_handler)

    # File handler matching Spring Boot logs location
    os.makedirs("logs", exist_ok=True)
    file_handler = logging.FileHandler("logs/app.log")
    file_handler.setFormatter(JsonFormatter())
    root.addHandler(file_handler)

    root.setLevel(logging.INFO)

    # Suppress verbose uvicorn logs if necessary
    logging.getLogger("uvicorn.access").handlers = [console_handler, file_handler]
    logging.getLogger("uvicorn.error").handlers = [console_handler, file_handler]


# Middleware to trace requests via X-Request-Id
class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        req_id = str(uuid.uuid4())
        token = request_id_ctx_var.set(req_id)
        try:
            response: Response = await call_next(request)
            response.headers["X-Request-Id"] = req_id
            return response
        finally:
            request_id_ctx_var.reset(token)


# Auth Middleware for REST endpoints
class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        # Exempt public endpoints
        exempt_prefixes = {
            "/api/v1/healthz",
            "/metrics",
            "/actuator/prometheus",
            "/api/v1/docs",
            "/api/v1/openapi.json",
            "/docs",
            "/openapi.json",
        }

        is_exempt = False
        for prefix in exempt_prefixes:
            if path == prefix or path.startswith(prefix + "/"):
                is_exempt = True
                break

        # GraphQL paths have separate authentication within the router
        if path == "/graphql" or path.startswith("/graphql/"):
            is_exempt = True

        if is_exempt:
            return await call_next(request)

        # Validate x-auth-token header
        token = request.headers.get("x-auth-token")
        if not token or token != settings.authorization_key:
            return JSONResponse(status_code=401, content={"status": 401, "message": "Access Denied"})

        return await call_next(request)


# Exception handlers registration helpers
def register_exception_handlers(app):
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors = {}
        for err in exc.errors():
            loc = err.get("loc", [])
            field = loc[-1] if loc else "unknown"
            # Format custom Pydantic messages to match standard formats
            msg = err.get("msg", "Invalid value")
            errors[field] = msg

        return JSONResponse(status_code=400, content={"status": 400, "message": "Validation failed", "errors": errors})

    @app.exception_handler(IntegrityError)
    async def integrity_exception_handler(request: Request, exc: IntegrityError):
        msg = str(exc.orig) if exc.orig else str(exc)

        # SQLite: "UNIQUE constraint failed: customers.email"
        # SQLite newer versions: "UNIQUE constraint failed: customers.email (...)"
        match = re.search(r"UNIQUE constraint failed:\s+(\w+)\.(\w+)", msg)
        if match:
            field = match.group(2).upper()
        else:
            # Fallback if SQLite format differs
            # E.g., if message contains "UNIQUE constraint failed: email"
            match_simple = re.search(r"UNIQUE constraint failed:\s+(\w+)", msg)
            if match_simple:
                field = match_simple.group(1).upper()
            else:
                field = "UNKNOWN"

        return JSONResponse(
            status_code=409, content={"status": 409, "message": f"Duplicate entry: field '{field}' already exists"}
        )

    @app.exception_handler(ApiException)
    async def api_exception_handler(request: Request, exc: ApiException):
        return JSONResponse(status_code=exc.status_code, content={"status": exc.status_code, "message": exc.message})

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        logging.getLogger("app").exception("Unhandled server error occurred")
        return JSONResponse(status_code=500, content={"status": 500, "message": f"Internal Server Error \n {str(exc)}"})
