from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from strawberry.django.views import AsyncGraphQLView
from common.responses import response_with_status
from .schema import schema


@csrf_exempt
async def graphql_view(request, *args, **kwargs):
    if request.method != 'GET':
        token = request.headers.get('x-auth-token') or request.headers.get('X-Auth-Token')
        expected = settings.APP_AUTH_TOKEN
        if not expected or token != expected:
            payload = response_with_status(401, 'Access Denied')
            return JsonResponse(payload, status=401)

    view = AsyncGraphQLView.as_view(schema=schema, graphiql=True)
    return await view(request, *args, **kwargs)
