from dataclasses import asdict
from typing import AsyncGenerator
import strawberry
from asgiref.sync import sync_to_async
from django.db.models import Q
import strawberry_django
from sync.models import Employee
from .pubsub import pubsub


@strawberry_django.type(Employee, name="EmployeeType")
class EmployeeType:
    id: strawberry.auto
    employee_id: strawberry.auto
    first_name: strawberry.auto
    middle_name: strawberry.auto
    last_name: strawberry.auto
    gender: strawberry.auto
    email: strawberry.auto
    phone_number: strawberry.auto
    date_of_birth: strawberry.auto
    nationality: strawberry.auto
    job_level: strawberry.auto
    department: strawberry.auto
    location: strawberry.auto
    bank_account_number: strawberry.auto
    company: strawberry.auto
    job_title: strawberry.auto
    cost_center: strawberry.auto
    start_date: strawberry.auto
    employee_status: strawberry.auto
    manager_id: strawberry.auto
    manager_email: strawberry.auto
    last_modified_on: strawberry.auto
    last_modified: strawberry.auto
    full_name: str = strawberry.field(resolver=lambda root: root.full_name)


@strawberry_django.input(Employee, exclude=["id"])
class CreateEmployeeInput:
    pass


@strawberry_django.input(Employee, partial=True, exclude=["id"])
class UpdateEmployeeInput:
    pass


@strawberry.type
class Query:
    @strawberry.field
    async def employees(self, offset: int = 0, limit: int = 10) -> list[EmployeeType]:
        qs = Employee.objects.all()[offset : offset + limit]
        return await sync_to_async(list)(qs)

    @strawberry.field
    async def employee(self, id: int) -> EmployeeType | None:
        return await Employee.objects.filter(pk=id).afirst()

    @strawberry.field
    async def searchEmployees(
        self, search: str, offset: int = 0, limit: int = 10
    ) -> list[EmployeeType]:
        query = (
            Q(first_name__icontains=search)
            | Q(last_name__icontains=search)
            | Q(email__icontains=search)
        )
        qs = Employee.objects.filter(query)[offset : offset + limit]
        return await sync_to_async(list)(qs)


@strawberry.type
class Mutation:
    @strawberry.mutation
    async def createEmployee(self, data: CreateEmployeeInput) -> EmployeeType:
        employee_data = {
            k: v for k, v in asdict(data).items() if v is not strawberry.UNSET
        }
        employee = await Employee.objects.acreate(**employee_data)
        await pubsub.publish("employee_created", employee)
        return employee

    @strawberry.mutation
    async def updateEmployee(
        self, id: int, data: UpdateEmployeeInput
    ) -> EmployeeType | None:
        employee = await Employee.objects.filter(pk=id).afirst()
        if not employee:
            return None
        employee_data = {
            k: v for k, v in asdict(data).items() if v is not strawberry.UNSET
        }
        for key, value in employee_data.items():
            setattr(employee, key, value)
        await employee.asave()
        return employee

    @strawberry.mutation
    async def deleteEmployee(self, id: int) -> bool:
        # filter(...).adelete() is available in newer Django versions
        # or we can fetch and delete
        count, _ = await Employee.objects.filter(pk=id).adelete()
        return count > 0


@strawberry.type
class Subscription:
    @strawberry.subscription
    async def employeeCreated(self) -> AsyncGenerator[EmployeeType, None]:
        async for employee in pubsub.subscribe("employee_created"):
            yield employee


schema = strawberry.Schema(query=Query, mutation=Mutation, subscription=Subscription)
