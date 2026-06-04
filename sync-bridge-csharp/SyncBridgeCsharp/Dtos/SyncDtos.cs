using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace SyncBridgeCsharp.Dtos;

public class SyncRequest
{
    [Required]
    [RegularExpression("customers|products|orders|employees", ErrorMessage = "Invalid model")]
    public string Model { get; set; } = string.Empty;

    [Required]
    [MinLength(1)]
    public List<System.Text.Json.Nodes.JsonObject> Data { get; set; } = new();
}

public class CustomerDto
{
    public long? Id { get; set; }

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [JsonPropertyName("first_name")]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [JsonPropertyName("last_name")]
    public string LastName { get; set; } = string.Empty;

    [StringLength(3, MinimumLength = 3)]
    [JsonPropertyName("default_currency")]
    public string? DefaultCurrency { get; set; }
}

public class ProductDto
{
    public long? Id { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Required]
    public int? Price { get; set; }

    [StringLength(3, MinimumLength = 3)]
    public string? Currency { get; set; }

    public bool? Active { get; set; }

    [JsonPropertyName("weight_grams")]
    public int? WeightGrams { get; set; }
}

public class OrderItemDto
{
    public long? Id { get; set; }

    [Required]
    [JsonPropertyName("product_id")]
    public long? ProductId { get; set; }

    [Required]
    public int? Qty { get; set; }

    [Required]
    [JsonPropertyName("unit_price")]
    public int? UnitPrice { get; set; }
}

public class OrderDto
{
    public long? Id { get; set; }

    [Required]
    [JsonPropertyName("order_number")]
    public string OrderNumber { get; set; } = string.Empty;

    [Required]
    [JsonPropertyName("customer_id")]
    public long? CustomerId { get; set; }

    [Required]
    [RegularExpression("pending|paid|shipped|completed|cancelled|refunded")]
    public string Status { get; set; } = string.Empty;

    [StringLength(3, MinimumLength = 3)]
    public string? Currency { get; set; }

    public int? Amount { get; set; }

    public List<OrderItemDto>? Items { get; set; }
}

public class EmployeeDto
{
    [Required]
    public string Id { get; set; } = string.Empty;

    [Required]
    [JsonPropertyName("employee_id")]
    public string EmployeeId { get; set; } = string.Empty;

    [Required]
    [JsonPropertyName("first_name")]
    public string FirstName { get; set; } = string.Empty;

    [JsonPropertyName("middle_name")]
    public string? MiddleName { get; set; }

    [Required]
    [JsonPropertyName("last_name")]
    public string LastName { get; set; } = string.Empty;

    public string? Gender { get; set; }

    [EmailAddress]
    public string? Email { get; set; }

    [JsonPropertyName("phone_number")]
    public string? PhoneNumber { get; set; }

    [JsonPropertyName("date_of_birth")]
    public DateTimeOffset? DateOfBirth { get; set; }

    public string? Nationality { get; set; }

    [JsonPropertyName("job_level")]
    public string? JobLevel { get; set; }

    public string? Department { get; set; }

    public string? Location { get; set; }

    [JsonPropertyName("bank_account_number")]
    public string? BankAccountNumber { get; set; }

    public string? Company { get; set; }

    [JsonPropertyName("job_title")]
    public string? JobTitle { get; set; }

    [JsonPropertyName("cost_center")]
    public string? CostCenter { get; set; }

    [JsonPropertyName("start_date")]
    public DateTimeOffset? StartDate { get; set; }

    [JsonPropertyName("employee_status")]
    public string? EmployeeStatus { get; set; }

    [JsonPropertyName("manager_id")]
    public string? ManagerId { get; set; }

    [JsonPropertyName("manager_email")]
    [EmailAddress]
    public string? ManagerEmail { get; set; }

    [JsonPropertyName("last_modified_on")]
    public DateTimeOffset? LastModifiedOn { get; set; }

    [JsonPropertyName("last_modified")]
    public long? LastModified { get; set; }
}
