from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Customer

router = APIRouter()


@router.get("/healthz")
async def health(response: Response, db: AsyncSession = Depends(get_db)):
    read_ok = False
    write_ok = False

    # 1. Test database read
    try:
        stmt = select(Customer).limit(1)
        await db.execute(stmt)
        read_ok = True
    except Exception:
        pass

    # 2. Test database write
    try:
        # Create a unique email to avoid collision in parallel checks
        unique_email = f"healthcheck_{int(datetime.now(timezone.utc).timestamp() * 1000)}@example.com"
        temp_customer = Customer(email=unique_email, first_name="Health", last_name="Check")
        db.add(temp_customer)
        await db.flush()
        await db.delete(temp_customer)
        await db.flush()
        write_ok = True
    except Exception:
        pass

    ok = read_ok and write_ok
    status_code = 200 if ok else 503
    response.status_code = status_code

    return {
        "status": status_code,
        "message": "Service is healthy" if ok else "Service is unhealthy",
        "data": {"read": read_ok, "write": write_ok, "timestamp": datetime.now(timezone.utc).isoformat()},
    }
