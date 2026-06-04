import math
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.exceptions import ApiException
from app.models import SyncHistory

router = APIRouter()


def format_datetime(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")


@router.get("")
async def list_history(
    page: int = Query(1, ge=1),
    size: int = Query(15, ge=1),
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    safe_page = page - 1
    offset = safe_page * size

    count_stmt = select(func.count(SyncHistory.id))
    select_stmt = select(SyncHistory).order_by(desc(SyncHistory.id)).limit(size).offset(offset)

    if status:
        st = status.upper()
        count_stmt = count_stmt.where(SyncHistory.status == st)
        select_stmt = select_stmt.where(SyncHistory.status == st)

    total_elements = await db.scalar(count_stmt) or 0
    results = await db.execute(select_stmt)
    content_list = results.scalars().all()

    total_pages = math.ceil(total_elements / size)

    content = []
    for sh in content_list:
        content.append(
            {
                "id": sh.id,
                "payload": sh.payload,
                "status": sh.status,
                "failureReason": sh.failure_reason,
                "retries": sh.retries,
                "createdAt": format_datetime(sh.created_at),
                "updatedAt": format_datetime(sh.updated_at),
            }
        )

    data = {
        "content": content,
        "pageable": {
            "sort": {"empty": False, "sorted": True, "unsorted": False},
            "offset": offset,
            "pageNumber": safe_page,
            "pageSize": size,
            "paged": True,
            "unpaged": False,
        },
        "totalElements": total_elements,
        "totalPages": total_pages,
        "size": size,
        "number": safe_page,
        "numberOfElements": len(content),
        "first": safe_page == 0,
        "last": safe_page >= total_pages - 1 or total_pages == 0,
        "empty": len(content) == 0,
    }

    return {"status": 200, "message": "Sync histories retrieved successfully", "data": data}


@router.get("/{id}")
async def get_history(id: int, db: AsyncSession = Depends(get_db)):
    sh = await db.get(SyncHistory, id)
    if not sh:
        raise ApiException(404, "Sync history not found")

    return {
        "status": 200,
        "message": "Sync history retrieved successfully",
        "data": {
            "id": sh.id,
            "payload": sh.payload,
            "status": sh.status,
            "failureReason": sh.failure_reason,
            "retries": sh.retries,
            "createdAt": format_datetime(sh.created_at),
            "updatedAt": format_datetime(sh.updated_at),
        },
    }


@router.post("/retry/{id}")
async def retry_history(id: int, db: AsyncSession = Depends(get_db)):
    sh = await db.get(SyncHistory, id)
    if not sh:
        raise ApiException(404, "Sync history not found")

    if sh.status != "FAILED":
        raise ApiException(400, "Only failed syncs can be retried")

    sh.status = "PENDING_RETRY"
    sh.failure_reason = None
    await db.commit()
    await db.refresh(sh)

    return {
        "status": 200,
        "message": "Sync history will be retried",
        "data": {
            "id": sh.id,
            "payload": sh.payload,
            "status": sh.status,
            "failureReason": sh.failure_reason,
            "retries": sh.retries,
            "createdAt": format_datetime(sh.created_at),
            "updatedAt": format_datetime(sh.updated_at),
        },
    }


@router.delete("/{id}")
async def delete_history(id: int, response: Response, db: AsyncSession = Depends(get_db)):
    sh = await db.get(SyncHistory, id)
    if not sh:
        raise ApiException(404, "Sync history not found")

    await db.delete(sh)
    await db.commit()

    response.status_code = 204
    return None
