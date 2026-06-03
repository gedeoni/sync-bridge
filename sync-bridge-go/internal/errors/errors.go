package errors

import (
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"github.com/go-playground/validator/v10"
)

type AppError struct {
	StatusCode int               `json:"status"`
	Message    string            `json:"message"`
	Errors     map[string]string `json:"errors,omitempty"`
}

func (e AppError) Error() string {
	return e.Message
}

func NewUnauthorizedError() AppError {
	return AppError{
		StatusCode: http.StatusUnauthorized,
		Message:    "Access Denied",
	}
}

func NewValidationError(errors map[string]string) AppError {
	return AppError{
		StatusCode: http.StatusBadRequest,
		Message:    "Validation failed",
		Errors:     errors,
	}
}

func NewConflictError(msg string) AppError {
	return AppError{
		StatusCode: http.StatusConflict,
		Message:    msg,
	}
}

func NewBadRequestError(msg string) AppError {
	return AppError{
		StatusCode: http.StatusBadRequest,
		Message:    msg,
	}
}

func NewNotFoundError(msg string) AppError {
	return AppError{
		StatusCode: http.StatusNotFound,
		Message:    msg,
	}
}

func NewInternalError(err error) AppError {
	return AppError{
		StatusCode: http.StatusInternalServerError,
		Message:    "Internal Server Error",
	}
}

var sqliteUniqueRegex = regexp.MustCompile(`UNIQUE constraint failed: \w+\.(\w+)`)

func HandleDBError(err error) AppError {
	if err == nil {
		return AppError{}
	}
	msg := err.Error()
	if strings.Contains(msg, "UNIQUE constraint failed") {
		matches := sqliteUniqueRegex.FindStringSubmatch(msg)
		if len(matches) > 1 {
			field := strings.ToUpper(matches[1])
			return NewConflictError(fmt.Sprintf("Duplicate entry: field '%s' already exists", field))
		}
		idx := strings.Index(msg, "UNIQUE constraint failed:")
		if idx != -1 {
			subMsg := msg[idx:]
			parts := strings.Split(subMsg, ".")
			if len(parts) > 1 {
				field := strings.ToUpper(strings.TrimSpace(parts[len(parts)-1]))
				return NewConflictError(fmt.Sprintf("Duplicate entry: field '%s' already exists", field))
			}
			parts = strings.Split(subMsg, ":")
			if len(parts) > 1 {
				field := strings.ToUpper(strings.TrimSpace(parts[1]))
				return NewConflictError(fmt.Sprintf("Duplicate entry: field '%s' already exists", field))
			}
		}
		return NewConflictError("Duplicate entry: unique constraint violated")
	}
	return AppError{
		StatusCode: http.StatusInternalServerError,
		Message:    err.Error(),
	}
}

func ParseValidationError(err error) AppError {
	validationErrors := make(map[string]string)
	if errs, ok := err.(validator.ValidationErrors); ok {
		for _, e := range errs {
			field := e.Field()
			tag := strings.ToLower(field)
			switch field {
			case "FirstName":
				tag = "first_name"
			case "LastName":
				tag = "last_name"
			case "DefaultCurrency":
				tag = "default_currency"
			case "OrderNumber":
				tag = "order_number"
			case "CustomerID":
				tag = "customer_id"
			case "ProductID":
				tag = "product_id"
			case "UnitPrice":
				tag = "unit_price"
			case "WeightGrams":
				tag = "weight_grams"
			}
			validationErrors[tag] = fmt.Sprintf("Field validation failed on the '%s' tag", e.Tag())
		}
	} else {
		validationErrors["error"] = err.Error()
	}
	return NewValidationError(validationErrors)
}
