import uuid
from django.test import TestCase, RequestFactory
from django.http import HttpResponse
from common.middleware import RequestIdMiddleware
from common.monitoring import MonitoringMiddleware


class MiddlewareTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        # Mock a simple get_response callable
        self.get_response = lambda req: HttpResponse("OK")

    def test_request_id_middleware_generates_id(self):
        middleware = RequestIdMiddleware(self.get_response)
        request = self.factory.get('/some-path')

        response = middleware(request)

        self.assertTrue(hasattr(request, 'request_id'))
        # Should be a valid UUID
        self.assertTrue(uuid.UUID(request.request_id))
        self.assertEqual(response['x-request-id'], request.request_id)

    def test_request_id_middleware_preserves_existing_id(self):
        middleware = RequestIdMiddleware(self.get_response)
        input_id = str(uuid.uuid4())
        request = self.factory.get('/some-path', HTTP_X_REQUEST_ID=input_id)

        response = middleware(request)

        self.assertEqual(request.request_id, input_id)
        self.assertEqual(response['x-request-id'], input_id)

    def test_monitoring_middleware_records_start_and_unknown_default(self):
        middleware = MonitoringMiddleware(self.get_response)
        request = self.factory.get('/some-path')

        response = middleware(request)

        self.assertTrue(hasattr(request, '_monitor_start'))
        self.assertEqual(request._monitor_name, 'unknown')
        self.assertEqual(request._monitor_tags, [])

    def test_monitoring_middleware_process_view(self):
        middleware = MonitoringMiddleware(self.get_response)
        request = self.factory.get('/some-path')

        # Define a mock view function
        def mock_view(request):
            return HttpResponse("OK")
        mock_view.monitor_name = 'test.view'
        mock_view.monitor_tags = ['tag1', 'tag2']

        # Resolving the view
        middleware.process_view(request, mock_view, None, None)

        self.assertEqual(request._monitor_name, 'test.view')
        self.assertEqual(request._monitor_tags, ['tag1', 'tag2'])
