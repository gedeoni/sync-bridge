import app.services
from app.models import SyncHistory


class SyncHistoryService:
    @staticmethod
    async def create_pending(payload_str: str) -> int:
        async with app.services.AsyncSessionLocal() as session:
            sh = SyncHistory(payload=payload_str, status="PENDING_RETRY")
            session.add(sh)
            await session.commit()
            await session.refresh(sh)
            return sh.id

    @staticmethod
    async def mark_success(history_id: int):
        async with app.services.AsyncSessionLocal() as session:
            sh = await session.get(SyncHistory, history_id)
            if sh:
                sh.status = "SUCCESSFUL"
                await session.commit()

    @staticmethod
    async def mark_failed(history_id: int, reason: str):
        async with app.services.AsyncSessionLocal() as session:
            sh = await session.get(SyncHistory, history_id)
            if sh:
                sh.status = "FAILED"
                sh.failure_reason = reason[:255] if reason else None
                await session.commit()

    @staticmethod
    async def mark_invalid(history_id: int, reason: str):
        async with app.services.AsyncSessionLocal() as session:
            sh = await session.get(SyncHistory, history_id)
            if sh:
                sh.status = "INVALID"
                sh.failure_reason = reason[:255] if reason else None
                await session.commit()
