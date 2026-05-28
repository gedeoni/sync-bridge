import uuid
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from common.responses import ok
from common.monitoring import monitored
from sync.models import Customer


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @monitored("health.check")
    def get(self, request):
        result = {
            "read": False,
            "write": False,
            "timestamp": timezone.now().isoformat(),
        }

        try:
            Customer.objects.first()
            result["read"] = True
        except Exception:
            result["read"] = False

        try:
            temp_email = f"healthcheck-{uuid.uuid4().hex}@example.com"
            temp = Customer.objects.create(
                email=temp_email,
                first_name="Health",
                last_name="Check",
                default_currency="USD",
            )
            temp.delete()
            result["write"] = True
        except Exception:
            result["write"] = False

        return Response(ok("Health check complete", result))
