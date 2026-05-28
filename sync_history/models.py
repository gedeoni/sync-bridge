from django.db import models


class SyncStatus(models.TextChoices):
    SUCCESSFUL = "successful"
    FAILED = "failed"
    INVALID = "invalid"
    PENDING_RETRY = "pending_retry"


class SyncHistory(models.Model):
    payload = models.TextField()
    status = models.CharField(
        max_length=32, choices=SyncStatus.choices, default=SyncStatus.PENDING_RETRY
    )
    failure_reason = models.TextField(blank=True, null=True)
    retries = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
