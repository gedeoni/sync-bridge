from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class CustomerDto(BaseModel):
    id: Optional[int] = None
    email: EmailStr
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    default_currency: Optional[str] = None

    @field_validator("default_currency")
    @classmethod
    def validate_currency(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) != 3:
            raise ValueError("Currency must be exactly 3 characters")
        return v


class ProductDto(BaseModel):
    id: Optional[int] = None
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    price: int
    currency: Optional[str] = None
    active: Optional[bool] = None
    weight_grams: Optional[int] = None

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) != 3:
            raise ValueError("Currency must be exactly 3 characters")
        return v


class OrderItemDto(BaseModel):
    id: Optional[int] = None
    product_id: int
    qty: int
    unit_price: int


class OrderDto(BaseModel):
    id: Optional[int] = None
    order_number: str = Field(..., min_length=1)
    customer_id: int
    status: str
    currency: Optional[str] = None
    amount: Optional[int] = None
    items: Optional[List[OrderItemDto]] = None

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) != 3:
            raise ValueError("Currency must be exactly 3 characters")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        valid = {"pending", "paid", "shipped", "completed", "cancelled", "refunded"}
        if v not in valid:
            raise ValueError(f"Invalid status: must be one of {valid}")
        return v


class EmployeeDto(BaseModel):
    id: str = Field(..., min_length=1)
    employeeId: str = Field(..., min_length=1)
    firstName: str = Field(..., min_length=1)
    middleName: Optional[str] = None
    lastName: str = Field(..., min_length=1)
    gender: Optional[str] = None
    email: EmailStr
    phoneNumber: Optional[str] = None
    dateOfBirth: Optional[datetime] = None
    nationality: Optional[str] = None
    jobLevel: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    bankAccountNumber: Optional[str] = None
    company: Optional[str] = None
    jobTitle: Optional[str] = None
    costCenter: Optional[str] = None
    startDate: Optional[datetime] = None
    employeeStatus: Optional[str] = None
    managerId: Optional[str] = None
    managerEmail: Optional[EmailStr] = None
    lastModifiedOn: Optional[datetime] = None
    lastModified: Optional[int] = None


class SyncRequest(BaseModel):
    model: str
    data: List[Dict[str, Any]]

    @field_validator("model")
    @classmethod
    def validate_model(cls, v: str) -> str:
        valid_models = {"customers", "products", "orders", "employees"}
        if v not in valid_models:
            raise ValueError(f"Invalid model: must be one of {valid_models}")
        return v

    @field_validator("data")
    @classmethod
    def validate_data(cls, v: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not v:
            raise ValueError("Data list cannot be empty")
        return v
