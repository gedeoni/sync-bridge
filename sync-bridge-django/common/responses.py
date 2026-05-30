from typing import Any, Optional


def ok(message: str, data: Optional[Any] = None) -> dict:
    payload = {"status": 200, "message": message}
    if data is not None:
        payload["data"] = data
    return payload


def response_with_status(
    status: int, message: str, data: Optional[Any] = None, errors: Optional[dict] = None
) -> dict:
    payload = {"status": status, "message": message}
    if data is not None:
        payload["data"] = data
    if errors:
        payload["errors"] = errors
    return payload
