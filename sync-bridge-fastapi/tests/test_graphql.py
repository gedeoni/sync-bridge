import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_graphql_hello_is_public(client: AsyncClient):
    query = {"query": "query { hello }"}
    response = await client.post("/graphql", json=query)
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["hello"] == "Hello from Sync Bridge"


@pytest.mark.asyncio
async def test_graphql_employees_query_is_public(client: AsyncClient):
    query = {"query": "query { employees(limit: 2, offset: 0) { id firstName lastName } }"}
    response = await client.post("/graphql", json=query)
    assert response.status_code == 200
    data = response.json()
    assert "errors" not in data
    assert "data" in data


@pytest.mark.asyncio
async def test_graphql_create_employee_without_token_returns_401(client: AsyncClient):
    query = {
        "query": "mutation($data: CreateEmployeeInput!) { createEmployee(data: $data) { id firstName } }",
        "variables": {
            "data": {
                "id": 999,
                "employeeId": "E999",
                "firstName": "Jane",
                "lastName": "Doe",
                "email": "jane.doe@example.com",
            }
        },
    }
    response = await client.post("/graphql", json=query)
    assert response.status_code == 401
    assert response.json()["message"] == "Access Denied"


@pytest.mark.asyncio
async def test_graphql_create_employee_with_wrong_token_returns_401(client: AsyncClient):
    query = {
        "query": "mutation($data: CreateEmployeeInput!) { createEmployee(data: $data) { id firstName } }",
        "variables": {
            "data": {
                "id": 999,
                "employeeId": "E999",
                "firstName": "Jane",
                "lastName": "Doe",
                "email": "jane.doe@example.com",
            }
        },
    }
    response = await client.post("/graphql", headers={"x-auth-token": "wrong-token"}, json=query)
    assert response.status_code == 401
    assert response.json()["message"] == "Access Denied"


@pytest.mark.asyncio
async def test_graphql_create_employee_with_correct_token_succeeds(client: AsyncClient):
    query = {
        "query": "mutation($data: CreateEmployeeInput!) { createEmployee(data: $data) { id firstName fullName } }",
        "variables": {
            "data": {
                "id": 999,
                "employeeId": "E999",
                "firstName": "Jane",
                "lastName": "Doe",
                "email": "jane.doe@example.com",
            }
        },
    }
    response = await client.post("/graphql", headers={"x-auth-token": "your-secret-auth-key"}, json=query)
    assert response.status_code == 200
    data = response.json()
    assert "errors" not in data
    assert data["data"]["createEmployee"]["id"] == 999
    assert data["data"]["createEmployee"]["firstName"] == "Jane"
    assert data["data"]["createEmployee"]["fullName"] == "Jane Doe"
