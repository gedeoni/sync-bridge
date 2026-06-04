import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Customer, SyncHistory

AUTH_HEADERS = {"x-auth-token": "your-secret-auth-key"}


@pytest.mark.asyncio
async def test_paginated_history_retrieval(client: AsyncClient):
    # Perform a sync to populate history
    sync_payload = {
        "model": "customers",
        "data": [{"email": "hist1@example.com", "first_name": "H1", "last_name": "Test"}],
    }
    await client.post("/api/v1/sync", headers=AUTH_HEADERS, json=sync_payload)

    # Fetch history
    res = await client.get("/api/v1/sync-history", headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data["content"]) >= 1
    assert data["totalElements"] >= 1
    assert data["content"][0]["status"] == "SUCCESSFUL"


@pytest.mark.asyncio
async def test_history_by_id_returns_404_for_unknown(client: AsyncClient):
    res = await client.get("/api/v1/sync-history/9999", headers=AUTH_HEADERS)
    assert res.status_code == 404
    assert res.json()["message"] == "Sync history not found"


@pytest.mark.asyncio
async def test_deletes_history_record(client: AsyncClient, db_session: AsyncSession):
    # Sync to create a history log
    sync_payload = {
        "model": "customers",
        "data": [{"email": "del@example.com", "first_name": "Del", "last_name": "Test"}],
    }
    await client.post("/api/v1/sync", headers=AUTH_HEADERS, json=sync_payload)

    # Get created history ID
    res = await db_session.execute(select(SyncHistory))
    histories = res.scalars().all()
    assert len(histories) >= 1
    history_id = histories[0].id

    # Delete history
    del_res = await client.delete(f"/api/v1/sync-history/{history_id}", headers=AUTH_HEADERS)
    assert del_res.status_code == 204

    # Verify deleted in DB
    db_session.expire_all()
    refetched = await db_session.get(SyncHistory, history_id)
    assert refetched is None


@pytest.mark.asyncio
async def test_failed_sync_transaction_rolls_back_but_saves_failed_history(
    client: AsyncClient, db_session: AsyncSession
):
    # Send custom data that violates database nullable=False on last_name
    # Pydantic validation for CustomerDto requires 'last_name', so if we bypass Pydantic via invalid payload?
    # Wait, how does Pydantic schema validate this?
    # In CustomerDto: last_name is Field(..., min_length=1) i.e. required.
    # If we pass a request that bypasses DTO validation but fails in mapping/DB?
    # Or, we can just trigger a DB constraint failure (e.g. duplicate email is an IntegrityError in DB!).
    # If we sync the same customer twice in one batch!
    # Or sync a duplicate customer email which raises IntegrityError in DB.
    # Let's test that:
    # First sync customer "fail_tx@example.com" - succeeds.
    # Second sync customer "fail_tx@example.com" - raises UNIQUE constraint error, rolls back transaction.
    # Wait! If the second sync transaction rolls back, does the new customer get saved? No.
    # But does the new history record get saved as FAILED? Yes!

    payload = {
        "model": "customers",
        "data": [{"email": "fail_tx@example.com", "first_name": "Fail", "last_name": "Tx"}],
    }

    # First sync - succeeds
    await client.post("/api/v1/sync", headers=AUTH_HEADERS, json=payload)

    # Clear customers count
    cust_res = await db_session.execute(select(Customer))
    assert len(cust_res.scalars().all()) == 1

    # Second sync - fails due to duplicate email
    res2 = await client.post("/api/v1/sync", headers=AUTH_HEADERS, json=payload)
    assert res2.status_code == 409

    # Verify that we have two sync history records: one SUCCESSFUL, one FAILED!
    hist_res = await db_session.execute(select(SyncHistory).order_by(SyncHistory.id))
    histories = hist_res.scalars().all()
    assert len(histories) == 2
    assert histories[0].status == "SUCCESSFUL"
    assert histories[1].status == "FAILED"
    assert "UNIQUE constraint failed" in histories[1].failure_reason
