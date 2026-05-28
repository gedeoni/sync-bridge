from rest_framework import serializers
from .models import SyncHistory


class SyncHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SyncHistory
        fields = [
            "id",
            "payload",
            "status",
            "failure_reason",
            "retries",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
