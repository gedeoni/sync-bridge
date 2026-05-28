from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count
from drf_spectacular.utils import extend_schema, PolymorphicProxySerializer
from common.responses import ok
from common.monitoring import monitored
from .serializers import (
    SyncRequestSerializer,
    CustomerSyncRequestSerializer,
    ProductSyncRequestSerializer,
    OrderSyncRequestSerializer,
    EmployeeSyncRequestSerializer,
)
from .services import sync_payload
from sync_history.models import SyncHistory


class SyncView(APIView):
    @extend_schema(
        request=PolymorphicProxySerializer(
            component_name="SyncRequest",
            serializers={
                "customers": CustomerSyncRequestSerializer,
                "products": ProductSyncRequestSerializer,
                "orders": OrderSyncRequestSerializer,
                "employees": EmployeeSyncRequestSerializer,
            },
            resource_type_field_name="model",
        ),
        summary="Ingest data synchronization payloads",
        description="Ingest business data in bulk (customers, products, orders, employees) with automatic validation.",
    )
    @monitored("sync.operation", tags=["model"])
    def post(self, request):
        serializer = SyncRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        result = sync_payload(payload["model"], payload["data"])
        return Response(ok("Sync successful", result))


class SyncStatsView(APIView):
    @monitored("sync.stats")
    def get(self, request):
        rows = SyncHistory.objects.values("status").annotate(count=Count("id"))
        summary = {}
        total = 0
        for row in rows:
            summary[row["status"]] = row["count"]
            total += row["count"]
        summary["total"] = total
        return Response(ok("Sync stats retrieved successfully", summary))
