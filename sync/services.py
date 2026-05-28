import json
from typing import Any
from rest_framework.exceptions import ValidationError
from django.db import transaction, models
import rest_framework.serializers as serializers

from .serializers import (
    CustomerSyncSerializer,
    ProductSyncSerializer,
    OrderSyncSerializer,
    EmployeeSyncSerializer,
)
from sync_history.models import SyncHistory, SyncStatus


MODEL_SERIALIZERS: dict[str, serializers.ModelSerializer] = {
    'customers': CustomerSyncSerializer,
    'products': ProductSyncSerializer,
    'orders': OrderSyncSerializer,
    'employees': EmployeeSyncSerializer,
}


def sync_payload(model: str, data: list[dict]) -> dict:
    history = SyncHistory.objects.create(payload=json.dumps(data), status=SyncStatus.PENDING_RETRY)

    SerializerClass = MODEL_SERIALIZERS.get(model)
    if not SerializerClass:
        history.status = SyncStatus.INVALID
        history.failure_reason = f"Invalid model: {model}"
        history.save(update_fields=['status', 'failure_reason', 'updated_at'])
        raise ValidationError(f"Invalid model: {model}")

    ModelClass = SerializerClass.Meta.model

    try:
        with transaction.atomic():
            results = _process_sync_data(data, model, ModelClass, SerializerClass)

        history.status = SyncStatus.SUCCESSFUL
        history.save(update_fields=['status', 'updated_at'])
        return {'results': results}
    except Exception as exc:
        history.status = SyncStatus.FAILED
        failure_text = str(exc)
        if isinstance(exc, ValidationError):
            # For validation errors, serialize the details for a more informative reason.
            failure_text = json.dumps(exc.detail)
        history.failure_reason = failure_text[:500]
        history.save(update_fields=['status', 'failure_reason', 'updated_at'])
        raise

def _process_sync_data(
    data: list[dict], model_name: str, ModelClass: type[models.Model], SerializerClass: type[serializers.ModelSerializer]
) -> list[dict[str, Any]]:
    # 1. Gather all unique IDs from the incoming payload
    item_ids = []
    for item in data:
        item_id = item.get('id')
        if item_id is not None:
            if model_name == 'employees':
                try:
                    item_id = int(item_id)
                except (ValueError, TypeError):
                    continue
            item_ids.append(item_id)

    # 2. Fetch all matching existing instances in a single DB query
    existing_instances = {}
    if item_ids:
        existing_qs = ModelClass.objects.filter(id__in=item_ids)
        existing_instances = {obj.id: obj for obj in existing_qs}

    # 3. Process each record inside an atomic transaction (in-memory lookup)
    results: list[dict[str, Any]] = []
    with transaction.atomic():
        for item_data in data:
            item_id = item_data.get('id')
            if model_name == 'employees' and item_id is not None:
                try:
                    item_id = int(item_id)
                except (ValueError, TypeError):
                    pass

            instance = existing_instances.get(item_id) if item_id is not None else None

            serializer = SerializerClass(instance=instance, data=item_data)
            serializer.is_valid(raise_exception=True)
            obj = serializer.save()

            status = 'updated' if instance else 'created'
            results.append({'id': obj.id, 'status': status})
    return results



