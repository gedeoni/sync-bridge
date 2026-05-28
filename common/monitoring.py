import json
import logging
import time
from typing import Optional

logger = logging.getLogger('common.monitoring')


def monitored(name: str, tags: Optional[list[str]] = None):
    def decorator(view_func):
        setattr(view_func, 'monitor_name', name)
        setattr(view_func, 'monitor_tags', tags or [])
        return view_func

    return decorator


class MonitoringMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request._monitor_start = time.perf_counter()
        request._monitor_name = 'unknown'
        request._monitor_tags = []

        response = self.get_response(request)

        start = getattr(request, '_monitor_start', None)
        if start is not None:
            duration_ms = int((time.perf_counter() - start) * 1000)
            payload = {
                'event': 'request',
                'name': getattr(request, '_monitor_name', 'unknown'),
                'status': response.status_code,
                'duration_ms': duration_ms,
                'path': request.path,
                'method': request.method,
                'request_id': getattr(request, 'request_id', None),
                'tags': getattr(request, '_monitor_tags', []),
            }
            logger.info(json.dumps(payload))
        return response

    def process_view(self, request, view_func, view_args, view_kwargs):
        request._monitor_name = getattr(view_func, 'monitor_name', view_func.__name__)
        request._monitor_tags = getattr(view_func, 'monitor_tags', [])
        return None
