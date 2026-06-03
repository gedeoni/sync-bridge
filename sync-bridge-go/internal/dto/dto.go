package dto

import (
	"encoding/json"

	"github.com/go-playground/validator/v10"
)

var validate = validator.New()

type SyncRequest struct {
	Model string            `json:"model" validate:"required,oneof=customers products orders employees"`
	Data  []json.RawMessage `json:"data" validate:"required,min=1" swaggertype:"array,object"`
}

func (s *SyncRequest) Validate() error {
	return validate.Struct(s)
}

type CustomerDto struct {
	ID              *int64  `json:"id"`
	Email           string  `json:"email" validate:"required,email"`
	FirstName       string  `json:"first_name" validate:"required"`
	LastName        string  `json:"last_name" validate:"required"`
	DefaultCurrency *string `json:"default_currency" validate:"omitempty,len=3"`
}

func (c *CustomerDto) Validate() error {
	return validate.Struct(c)
}

type ProductDto struct {
	ID          *int64  `json:"id"`
	Name        string  `json:"name" validate:"required"`
	Description *string `json:"description"`
	Price       *int    `json:"price" validate:"required"`
	Currency    *string `json:"currency" validate:"omitempty,len=3"`
	Active      *bool   `json:"active"`
	WeightGrams *int    `json:"weight_grams"`
}

func (p *ProductDto) Validate() error {
	return validate.Struct(p)
}

type OrderItemDto struct {
	ID        *int64 `json:"id"`
	ProductID *int64 `json:"product_id" validate:"required"`
	Qty       *int   `json:"qty" validate:"required"`
	UnitPrice *int   `json:"unit_price" validate:"required"`
}

func (o *OrderItemDto) Validate() error {
	return validate.Struct(o)
}

type OrderDto struct {
	ID          *int64          `json:"id"`
	OrderNumber string          `json:"order_number" validate:"required"`
	CustomerID  *int64          `json:"customer_id" validate:"required"`
	Status      string          `json:"status" validate:"required,oneof=pending paid shipped completed cancelled refunded"`
	Currency    *string         `json:"currency" validate:"omitempty,len=3"`
	Amount      *int            `json:"amount"`
	Items       *[]OrderItemDto `json:"items"`
}

func (o *OrderDto) Validate() error {
	return validate.Struct(o)
}

type EmployeeDto struct {
	ID                string  `json:"id" validate:"required"`
	EmployeeID        string  `json:"employeeId" validate:"required"`
	FirstName         string  `json:"firstName" validate:"required"`
	MiddleName        *string `json:"middleName"`
	LastName          string  `json:"lastName" validate:"required"`
	Gender            *string `json:"gender"`
	Email             string  `json:"email" validate:"required,email"`
	PhoneNumber       *string `json:"phoneNumber"`
	DateOfBirth       *string `json:"dateOfBirth"`
	Nationality       *string `json:"nationality"`
	JobLevel          *string `json:"jobLevel"`
	Department        *string `json:"department"`
	Location          *string `json:"location"`
	BankAccountNumber *string `json:"bankAccountNumber"`
	Company           *string `json:"company"`
	JobTitle          *string `json:"jobTitle"`
	CostCenter        *string `json:"costCenter"`
	StartDate         *string `json:"startDate"`
	EmployeeStatus    *string `json:"employeeStatus"`
	ManagerID         *string `json:"managerId"`
	ManagerEmail      *string `json:"managerEmail" validate:"omitempty,email"`
	LastModifiedOn    *string `json:"lastModifiedOn"`
	LastModified      *int64  `json:"lastModified"`
}

func (e *EmployeeDto) Validate() error {
	return validate.Struct(e)
}
