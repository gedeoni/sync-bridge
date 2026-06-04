from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dtos import SyncRequest
from app.services import SyncService

router = APIRouter()


@router.post("/sync")
async def sync(req: SyncRequest, db: AsyncSession = Depends(get_db)):
    # Run sync service inside a transaction block (rolls back on error)
    async with db.begin():
        result = await SyncService.sync(db, req.model, req.data)

    return {"status": 200, "message": "Sync successful", "data": result}


@router.get("/sync/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    stats = await SyncService.get_stats(db)
    return {"status": 200, "message": "Sync stats retrieved successfully", "data": stats}
