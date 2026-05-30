import secrets
from typing import Optional, Tuple
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


class ApiKeyUser:
    """Represent an authenticated API client using a valid x-auth-token."""

    is_authenticated = True
    is_anonymous = False
    pk = 1

    def __init__(self, token: str):
        self.token = token
        self.username = "api_key_user"

    def __str__(self):
        return self.username


class ApiKeyAuthentication(BaseAuthentication):
    def authenticate(self, request) -> Optional[Tuple[ApiKeyUser, str]]:
        if request.method == "GET" or request.path.rstrip("/") == "/api/v1/healthz":
            return None

        token = request.headers.get("x-auth-token") or request.headers.get(
            "X-Auth-Token"
        )
        expected = settings.APP_AUTH_TOKEN

        if not expected or not secrets.compare_digest(token or "", expected):
            raise AuthenticationFailed({"status": 401, "message": "Access Denied"})

        return ApiKeyUser(token), token

    def authenticate_header(self, request):
        return "ApiKey"
