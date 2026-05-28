import uuid


class RequestIdMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = request.headers.get('x-request-id') or str(uuid.uuid4())
        request.request_id = request_id

        response = self.get_response(request)

        response['x-request-id'] = request_id
        return response
