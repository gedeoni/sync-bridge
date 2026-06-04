import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_healthz_is_public(client: AsyncClient):
    response = await client.get("/api/v1/healthz")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == 200
    assert "data" in data
    assert data["data"]["read"] is True
    assert data["data"]["write"] is True


@pytest.mark.asyncio
async def test_sync_without_token_returns_401(client: AsyncClient):
    response = await client.post("/api/v1/sync", json={})
    assert response.status_code == 401
    assert response.json()["message"] == "Access Denied"


@pytest.mark.asyncio
async def test_sync_with_wrong_token_returns_401(client: AsyncClient):
    response = await client.post("/api/v1/sync", headers={"x-auth-token": "wrong-token"}, json={})
    assert response.status_code == 401
    assert response.json()["message"] == "Access Denied"


@pytest.mark.asyncio
async def test_sync_history_without_token_returns_401(client: AsyncClient):
    response = await client.get("/api/v1/sync-history")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_sync_history_with_wrong_token_returns_401(client: AsyncClient):
    response = await client.get("/api/v1/sync-history", headers={"x-auth-token": "wrong-token"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_sync_history_with_correct_token_returns_200(client: AsyncClient):
    response = await client.get("/api/v1/sync-history", headers={"x-auth-token": "your-secret-auth-key"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == 200
    assert "data" in data
