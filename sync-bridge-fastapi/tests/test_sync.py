import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Customer

AUTH_HEADERS = {"x-auth-token": "your-secret-auth-key"}


@pytest.mark.asyncio
async def test_creates_customer(client: AsyncClient, db_session: AsyncSession):
    payload = {
        "model": "customers",
        "data": [
            {"email": "alice@example.com", "first_name": "Alice", "last_name": "Smith", "default_currency": "USD"}
        ],
    }
    response = await client.post("/api/v1/sync", headers=AUTH_HEADERS, json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == 200
    assert data["message"] == "Sync successful"
    assert data["data"]["results"][0]["status"] == "created"
    assert isinstance(data["data"]["results"][0]["id"], int)

    # Check DB
    result = await db_session.execute(select(Customer))
    customers = result.scalars().all()
    assert len(customers) == 1
    assert customers[0].email == "alice@example.com"


@pytest.mark.asyncio
async def test_duplicate_customer_email_returns_409(client: AsyncClient):
    payload = {"model": "customers", "data": [{"email": "dup@example.com", "first_name": "Dup", "last_name": "User"}]}

    # First sync - succeeds
    res1 = await client.post("/api/v1/sync", headers=AUTH_HEADERS, json=payload)
    assert res1.status_code == 200

    # Second sync - conflicts
    res2 = await client.post("/api/v1/sync", headers=AUTH_HEADERS, json=payload)
    assert res2.status_code == 409
    assert "Duplicate entry" in res2.json()["message"]


@pytest.mark.asyncio
async def test_invalid_model_returns_400(client: AsyncClient):
    payload = {"model": "unicorns", "data": [{}]}
    response = await client.post("/api/v1/sync", headers=AUTH_HEADERS, json=payload)
    # Validation error for Pydantic schema model validation
    assert response.status_code == 400
    assert "Validation failed" in response.json()["message"]


@pytest.mark.asyncio
async def test_creates_product(client: AsyncClient):
    payload = {"model": "products", "data": [{"name": "Widget", "price": 999, "currency": "USD"}]}
    response = await client.post("/api/v1/sync", headers=AUTH_HEADERS, json=payload)
    assert response.status_code == 200
    assert response.json()["data"]["results"][0]["status"] == "created"


@pytest.mark.asyncio
async def test_order_amount_validations(client: AsyncClient):
    # 1. First create a customer
    cust_payload = {
        "model": "customers",
        "data": [{"email": "order_test@example.com", "first_name": "Order", "last_name": "Test"}],
    }
    cust_res = await client.post("/api/v1/sync", headers=AUTH_HEADERS, json=cust_payload)
    cust_id = cust_res.json()["data"]["results"][0]["id"]

    # 2. Sync order without items and without amount -> fails (400)
    order_fail_payload = {
        "model": "orders",
        "data": [{"order_number": "ORD-001", "customer_id": cust_id, "status": "pending"}],
    }
    res_fail = await client.post("/api/v1/sync", headers=AUTH_HEADERS, json=order_fail_payload)
    assert res_fail.status_code == 400
    assert "items or an amount" in res_fail.json()["message"]

    # 3. Sync order with explicit amount and no items -> succeeds
    order_ok_payload = {
        "model": "orders",
        "data": [{"order_number": "ORD-002", "customer_id": cust_id, "status": "pending", "amount": 1500}],
    }
    res_ok = await client.post("/api/v1/sync", headers=AUTH_HEADERS, json=order_ok_payload)
    assert res_ok.status_code == 200
    assert res_ok.json()["data"]["results"][0]["status"] == "created"
