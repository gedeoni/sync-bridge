from django.urls import re_path
from strawberry.channels import GraphQLWSConsumer
from django.conf import settings

from .schema import schema


class AuthGraphQLWSConsumer(GraphQLWSConsumer):
    async def on_connect(self, payload):
        expected = settings.APP_AUTH_TOKEN
        token = None
        if payload:
            token = (
                payload.get("x-auth-token")
                or payload.get("X-Auth-Token")
                or payload.get("authorization")
            )
        if not token:
            headers = {
                key.decode(): value.decode()
                for key, value in self.scope.get("headers", [])
            }
            token = headers.get("x-auth-token")
        if not expected or token != expected:
            await self.close(code=4401)
            return


websocket_urlpatterns = [
    re_path(r"^graphql$", AuthGraphQLWSConsumer.as_asgi(schema=schema)),
]
