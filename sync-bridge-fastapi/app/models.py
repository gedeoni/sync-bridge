from datetime import datetime
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    first_name: Mapped[str] = mapped_column(String, nullable=False)
    last_name: Mapped[str] = mapped_column(String, nullable=False)
    default_currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    orders: Mapped[List["Order"]] = relationship("Order", back_populates="customer")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    price: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    weight_grams: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    order_items: Mapped[List["OrderItem"]] = relationship("OrderItem", back_populates="product")


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_number: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    customer_id: Mapped[int] = mapped_column(Integer, ForeignKey("customers.id"), nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    placed_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    customer: Mapped["Customer"] = relationship("Customer", back_populates="orders")
    items: Mapped[List["OrderItem"]] = relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan", passive_deletes=True
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id"), nullable=False)
    qty: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[int] = mapped_column(Integer, nullable=False)

    order: Mapped["Order"] = relationship("Order", back_populates="items")
    product: Mapped["Product"] = relationship("Product", back_populates="order_items")

    @property
    def line_total(self) -> int:
        return self.qty * self.unit_price


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    employee_id: Mapped[str] = mapped_column(String, nullable=False)
    first_name: Mapped[str] = mapped_column(String, nullable=False)
    middle_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    last_name: Mapped[str] = mapped_column(String, nullable=False)
    gender: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    phone_number: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    date_of_birth: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    nationality: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    job_level: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    department: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    bank_account_number: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    company: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    job_title: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    cost_center: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    employee_status: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    manager_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    manager_email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    last_modified_on: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_modified: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)


class SyncHistory(Base):
    __tablename__ = "sync_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    payload: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="PENDING_RETRY")
    failure_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    retries: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
