import secrets
from typing import Optional, Tuple
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


class ApiKeyAuthentication(BaseAuthentication):
    def authenticate(self, request) -> Optional[Tuple[AnonymousUser, str]]:
        if request.method == "GET" or request.path.rstrip("/") == "/api/v1/healthz":
            return None

        token = request.headers.get("x-auth-token") or request.headers.get(
            "X-Auth-Token"
        )
        expected = settings.APP_AUTH_TOKEN

        if not expected or not secrets.compare_digest(token or "", expected):
            raise AuthenticationFailed({"status": 401, "message": "Access Denied"})

        return AnonymousUser(), token

    def authenticate_header(self, request):
        return "ApiKey"
