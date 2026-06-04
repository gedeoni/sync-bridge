import json
from typing import Any, Dict, List

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import ApiException
from app.mappers import map_customer, map_employee, map_order, map_product
from app.models import SyncHistory
from app.schemas import CustomerDto, EmployeeDto, OrderDto, ProductDto

from .sync_history import SyncHistoryService


class SyncService:
    @staticmethod
    async def sync(session: AsyncSession, model: str, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        # Serialize data for sync history
        try:
            payload_str = json.dumps(data)
        except Exception:
            payload_str = "Error serializing payload"

        # Create sync history in a separate transaction (REQUIRES_NEW behavior)
        history_id = await SyncHistoryService.create_pending(payload_str)

        results = []
        try:
            for item_data in data:
                item_id = item_data.get("id")

                # Map dictionary to DTO, which triggers Pydantic validations
                if model == "customers":
                    dto = CustomerDto(**item_data)
                    entity = map_customer(dto)
                elif model == "products":
                    dto = ProductDto(**item_data)
                    entity = map_product(dto)
                elif model == "orders":
                    dto = OrderDto(**item_data)
                    entity = map_order(dto)
                elif model == "employees":
                    dto = EmployeeDto(**item_data)
                    entity = map_employee(dto)
                else:
                    raise ApiException(400, f"Invalid model: {model}")

                # Merge the entity into the session (handles both create and update)
                merged = await session.merge(entity)

                # Flush to trigger DB constraint checks and populate autoincrement ID
                await session.flush()

                # Fetch generated ID
                saved_id = merged.id

                results.append({"id": saved_id, "status": "updated" if item_id is not None else "created"})

            # Mark history as successful
            await SyncHistoryService.mark_success(history_id)

            return {"results": results}

        except Exception as e:
            # Mark history as failed
            await SyncHistoryService.mark_failed(history_id, str(e))
            raise e

    @staticmethod
    async def get_stats(session: AsyncSession) -> Dict[str, Any]:
        # Query counts grouped by status
        stmt = select(SyncHistory.status, func.count(SyncHistory.id)).group_by(SyncHistory.status)
        result = await session.execute(stmt)

        counts = {"successful": 0, "failed": 0, "pending_retry": 0, "invalid": 0, "total": 0}

        for row in result.all():
            status = row[0].lower()
            count = row[1]
            if status in counts:
                counts[status] = count
            counts["total"] += count

        return counts
