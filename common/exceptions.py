from typing import Any
from django.db import IntegrityError
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status as drf_status
from rest_framework.exceptions import APIException, ValidationError
from .responses import response_with_status


def _unique_constraint_message(message: str) -> str:
    lowered = message.lower()
    if "unique" in lowered:
        if "unique constraint failed" in lowered:
            parts = message.split(":")
            if len(parts) > 1:
                field = parts[1].strip().split(".")[-1]
                return f"Duplicate entry: field '{field}' already exists"
        return "Duplicate entry detected"
    return "Data constraint violation"


def api_exception_handler(exc: Exception, context: dict) -> Response:
    if isinstance(exc, IntegrityError):
        payload = response_with_status(
            drf_status.HTTP_409_CONFLICT, _unique_constraint_message(str(exc))
        )
        return Response(payload, status=drf_status.HTTP_409_CONFLICT)

    if isinstance(exc, ValidationError):
        detail = exc.detail
        errors: dict[str, Any] = {}
        if isinstance(detail, dict):
            for key, value in detail.items():
                errors[key] = value[0] if isinstance(value, list) else value
        payload = response_with_status(
            drf_status.HTTP_400_BAD_REQUEST,
            "Validation failed for one of the items in the data array.",
            errors=errors or None,
        )
        return Response(payload, status=drf_status.HTTP_400_BAD_REQUEST)

    response = exception_handler(exc, context)
    if response is None:
        payload = response_with_status(
            drf_status.HTTP_500_INTERNAL_SERVER_ERROR, "Internal Server Error"
        )
        return Response(payload, status=drf_status.HTTP_500_INTERNAL_SERVER_ERROR)

    if isinstance(exc, APIException):
        status_code = response.status_code
        data = response.data
        message = data.get("message") if isinstance(data, dict) else None
        payload = response_with_status(
            status_code, message or str(exc), data=data if message is None else None
        )
        response.data = payload

    return response
