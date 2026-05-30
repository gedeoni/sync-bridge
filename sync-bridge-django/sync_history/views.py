from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from common.responses import ok
from common.monitoring import monitored
from .models import SyncHistory, SyncStatus
from .serializers import SyncHistorySerializer


class CustomPagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = "size"
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response(
            ok(
                "Sync histories retrieved successfully",
                {
                    "data": data,
                    "page": self.page.number,
                    "size": self.get_page_size(self.request),
                    "total": self.page.paginator.count,
                },
            )
        )


class SyncHistoryListView(generics.ListAPIView):
    serializer_class = SyncHistorySerializer
    pagination_class = CustomPagination

    @monitored("sync_history.list", tags=["status"])
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        queryset = SyncHistory.objects.all().order_by("-created_at")
        status_filter = self.request.query_params.get("status")

        if status_filter:
            normalized = status_filter.lower()
            if normalized not in SyncStatus.values:
                raise ValidationError({"status": "Invalid status value provided."})
            queryset = queryset.filter(status=normalized)
        return queryset


class SyncHistoryDetailView(generics.RetrieveDestroyAPIView):
    queryset = SyncHistory.objects.all()
    serializer_class = SyncHistorySerializer
    lookup_url_kwarg = "history_id"

    @monitored("sync_history.get", tags=["id"])
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(ok("Sync history retrieved successfully", serializer.data))

    @monitored("sync_history.delete", tags=["id"])
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SyncHistoryRetryView(APIView):
    @monitored("sync_history.retry", tags=["id"])
    def post(self, request, history_id: int):
        history = get_object_or_404(SyncHistory, id=history_id)

        if history.status != SyncStatus.FAILED:
            raise ValidationError({"status": "Only failed syncs can be retried."})

        history.status = SyncStatus.PENDING_RETRY
        history.save(update_fields=["status", "updated_at"])
        return Response(
            ok("Sync history will be retried", SyncHistorySerializer(history).data)
        )
