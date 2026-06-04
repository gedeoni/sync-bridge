import asyncio
from datetime import datetime
from typing import Any, AsyncGenerator, List, Optional, Set

import strawberry
from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy import or_, select
from strawberry.fastapi import GraphQLRouter

from app.config import settings
from app.database import AsyncSessionLocal
from app.models import Employee

# -----------------------------------------------------------------------------
# Custom Scalars
# -----------------------------------------------------------------------------
Long = strawberry.scalar(
    int,
    name="Long",
    description="The `Long` scalar type represents non-fractional signed whole 64-bit numeric values.",
    serialize=lambda v: v,
    parse_value=lambda v: int(v),
)

DateTime = strawberry.scalar(
    datetime,
    name="DateTime",
    description="ISO-8601 Date Time Scalar",
    serialize=lambda v: v.isoformat() if v else None,
    parse_value=lambda v: datetime.fromisoformat(v) if v else None,
)


# -----------------------------------------------------------------------------
# GraphQL Types and Inputs
# -----------------------------------------------------------------------------
@strawberry.type
class EmployeeType:
    id: Long
    employee_id: str
    first_name: str
    last_name: str
    email: str
    middle_name: Optional[str] = None
    gender: Optional[str] = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[DateTime] = None
    nationality: Optional[str] = None
    job_level: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    bank_account_number: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    cost_center: Optional[str] = None
    start_date: Optional[DateTime] = None
    employee_status: Optional[str] = None
    manager_id: Optional[str] = None
    manager_email: Optional[str] = None
    last_modified_on: Optional[DateTime] = None
    last_modified: Optional[Long] = None

    @strawberry.field
    def full_name(self) -> str:
        parts = [self.first_name, self.middle_name, self.last_name]
        return " ".join([p for p in parts if p and p.strip()])

    @classmethod
    def from_model(cls, m: Employee) -> "EmployeeType":
        return cls(
            id=m.id,
            employee_id=m.employee_id,
            first_name=m.first_name,
            last_name=m.last_name,
            email=m.email,
            middle_name=m.middle_name,
            gender=m.gender,
            phone_number=m.phone_number,
            date_of_birth=m.date_of_birth,
            nationality=m.nationality,
            job_level=m.job_level,
            department=m.department,
            location=m.location,
            bank_account_number=m.bank_account_number,
            company=m.company,
            job_title=m.job_title,
            cost_center=m.cost_center,
            start_date=m.start_date,
            employee_status=m.employee_status,
            manager_id=m.manager_id,
            manager_email=m.manager_email,
            last_modified_on=m.last_modified_on,
            last_modified=m.last_modified,
        )


@strawberry.input
class CreateEmployeeInput:
    id: Long
    employeeId: str
    firstName: str
    lastName: str
    email: str
    middleName: Optional[str] = None
    company: Optional[str] = None
    jobTitle: Optional[str] = None


@strawberry.input
class UpdateEmployeeInput:
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    email: Optional[str] = None
    middleName: Optional[str] = None
    company: Optional[str] = None
    jobTitle: Optional[str] = None


# -----------------------------------------------------------------------------
# Subscription PubSub Broadcast system
# -----------------------------------------------------------------------------
class PubSub:
    def __init__(self):
        self._subscribers: Set[asyncio.Queue] = set()

    def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue()
        self._subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        self._subscribers.discard(q)

    def publish(self, item: EmployeeType):
        for q in list(self._subscribers):
            q.put_nowait(item)


pubsub = PubSub()


# -----------------------------------------------------------------------------
# GraphQL Resolvers: Query, Mutation, Subscription
# -----------------------------------------------------------------------------
@strawberry.type
class Query:
    @strawberry.field
    def hello(self) -> str:
        return "Hello from Sync Bridge"

    @strawberry.field
    async def employees(self, offset: int = 0, limit: int = 10) -> List[EmployeeType]:
        async with AsyncSessionLocal() as session:
            stmt = select(Employee).offset(offset).limit(limit)
            res = await session.execute(stmt)
            return [EmployeeType.from_model(e) for e in res.scalars().all()]

    @strawberry.field
    async def employee(self, id: Long) -> Optional[EmployeeType]:
        async with AsyncSessionLocal() as session:
            e = await session.get(Employee, id)
            return EmployeeType.from_model(e) if e else None

    @strawberry.field
    async def search_employees(self, search: str, offset: int = 0, limit: int = 10) -> List[EmployeeType]:
        async with AsyncSessionLocal() as session:
            search_pat = f"%{search}%"
            stmt = (
                select(Employee)
                .where(
                    or_(
                        Employee.first_name.ilike(search_pat),
                        Employee.last_name.ilike(search_pat),
                        Employee.email.ilike(search_pat),
                    )
                )
                .offset(offset)
                .limit(limit)
            )
            res = await session.execute(stmt)
            return [EmployeeType.from_model(e) for e in res.scalars().all()]


@strawberry.type
class Mutation:
    @strawberry.mutation
    async def create_employee(self, data: CreateEmployeeInput) -> EmployeeType:
        async with AsyncSessionLocal() as session:
            stmt = select(Employee).where(Employee.email == data.email)
            res = await session.execute(stmt)
            if res.scalar_one_or_none():
                raise Exception("UNIQUE constraint failed: employees.email")

            e = Employee(
                id=data.id,
                employee_id=data.employeeId,
                first_name=data.firstName,
                last_name=data.lastName,
                email=data.email,
                middle_name=data.middleName,
                company=data.company,
                job_title=data.jobTitle,
            )
            session.add(e)
            await session.commit()
            await session.refresh(e)

            emp_type = EmployeeType.from_model(e)
            pubsub.publish(emp_type)
            return emp_type

    @strawberry.mutation
    async def update_employee(self, id: Long, data: UpdateEmployeeInput) -> Optional[EmployeeType]:
        async with AsyncSessionLocal() as session:
            e = await session.get(Employee, id)
            if not e:
                return None

            if data.firstName is not None:
                e.first_name = data.firstName
            if data.lastName is not None:
                e.last_name = data.lastName
            if data.email is not None:
                e.email = data.email
            if data.middleName is not None:
                e.middle_name = data.middleName
            if data.company is not None:
                e.company = data.company
            if data.jobTitle is not None:
                e.job_title = data.jobTitle

            await session.commit()
            await session.refresh(e)
            return EmployeeType.from_model(e)

    @strawberry.mutation
    async def delete_employee(self, id: Long) -> bool:
        async with AsyncSessionLocal() as session:
            e = await session.get(Employee, id)
            if not e:
                return False
            await session.delete(e)
            await session.commit()
            return True


@strawberry.type
class Subscription:
    @strawberry.subscription
    async def employee_created(self) -> AsyncGenerator[EmployeeType, None]:
        q = pubsub.subscribe()
        try:
            while True:
                item = await q.get()
                yield item
        finally:
            pubsub.unsubscribe(q)


schema = strawberry.Schema(query=Query, mutation=Mutation, subscription=Subscription)


# -----------------------------------------------------------------------------
# Custom GraphQLRouter exposing Auth checks on mutations
# -----------------------------------------------------------------------------
class CustomGraphQLRouter(GraphQLRouter):
    async def run(
        self,
        request: Any,
        context: Any = None,
        root_value: Any = None,
    ) -> Any:
        if isinstance(request, Request) and request.method == "POST":
            body = await request.body()
            body_str = body.decode("utf-8", errors="ignore")

            if "mutation" in body_str:
                token = request.headers.get("x-auth-token")
                if not token or token != settings.authorization_key:
                    return JSONResponse(status_code=401, content={"status": 401, "message": "Access Denied"})
        return await super().run(request, context, root_value)
