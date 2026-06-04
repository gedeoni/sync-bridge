using System;
using System.Collections.Generic;
using System.Linq;
using SyncBridgeCsharp.Dtos;
using SyncBridgeCsharp.Exceptions;
using SyncBridgeCsharp.Models;

namespace SyncBridgeCsharp.Services;

public interface ISyncMapper
{
    Customer MapCustomer(CustomerDto d);
    Product MapProduct(ProductDto d);
    Order MapOrder(OrderDto d);
    Employee MapEmployee(EmployeeDto d);
}

public class SyncMapper : ISyncMapper
{
    public Customer MapCustomer(CustomerDto d)
    {
        var c = new Customer
        {
            Email = d.Email,
            FirstName = d.FirstName,
            LastName = d.LastName,
            DefaultCurrency = string.IsNullOrWhiteSpace(d.DefaultCurrency) ? "USD" : d.DefaultCurrency,
            UpdatedAt = DateTime.UtcNow
        };
        if (d.Id.HasValue)
        {
            c.Id = d.Id.Value;
        }
        return c;
    }

    public Product MapProduct(ProductDto d)
    {
        var p = new Product
        {
            Name = d.Name,
            Description = d.Description,
            Price = d.Price ?? 0,
            Currency = string.IsNullOrWhiteSpace(d.Currency) ? "USD" : d.Currency,
            Active = d.Active ?? true,
            WeightGrams = d.WeightGrams,
            UpdatedAt = DateTime.UtcNow
        };
        if (d.Id.HasValue)
        {
            p.Id = d.Id.Value;
        }
        return p;
    }

    public Order MapOrder(OrderDto d)
    {
        var o = new Order
        {
            OrderNumber = d.OrderNumber,
            CustomerId = d.CustomerId ?? 0,
            Status = d.Status,
            Currency = string.IsNullOrWhiteSpace(d.Currency) ? "USD" : d.Currency,
            UpdatedAt = DateTime.UtcNow
        };

        if (d.Id.HasValue)
        {
            o.Id = d.Id.Value;
        }

        if (d.Items != null && d.Items.Count > 0)
        {
            // Validate items have non-null qty and unit_price
            if (d.Items.Any(it => !it.Qty.HasValue || !it.UnitPrice.HasValue || !it.ProductId.HasValue))
            {
                throw new ApiException(400, "Order items must include non-null qty and unit_price");
            }

            int calculatedAmount = d.Items.Sum(it => it.Qty!.Value * it.UnitPrice!.Value);

            if (!d.Amount.HasValue)
            {
                o.Amount = calculatedAmount;
            }
            else if (d.Amount.Value != calculatedAmount)
            {
                throw new ApiException(400, $"Order amount must equal the sum of item prices (qty * unit_price). Calculated={calculatedAmount} provided={d.Amount.Value}");
            }
            else
            {
                o.Amount = d.Amount.Value;
            }

            o.Items = d.Items.Select(it => new OrderItem
            {
                Id = it.Id ?? 0,
                ProductId = it.ProductId!.Value,
                Qty = it.Qty!.Value,
                UnitPrice = it.UnitPrice!.Value,
                Order = o
            }).ToList();
        }
        else
        {
            if (!d.Amount.HasValue)
            {
                throw new ApiException(400, "Order must include items or an amount");
            }
            o.Amount = d.Amount.Value;
        }

        return o;
    }

    public Employee MapEmployee(EmployeeDto d)
    {
        var e = new Employee
        {
            EmployeeId = d.EmployeeId,
            FirstName = d.FirstName,
            MiddleName = d.MiddleName,
            LastName = d.LastName,
            Gender = d.Gender,
            Email = d.Email ?? string.Empty,
            PhoneNumber = d.PhoneNumber,
            DateOfBirth = d.DateOfBirth,
            Nationality = d.Nationality,
            JobLevel = d.JobLevel,
            Department = d.Department,
            Location = d.Location,
            BankAccountNumber = d.BankAccountNumber,
            Company = d.Company,
            JobTitle = d.JobTitle,
            CostCenter = d.CostCenter,
            StartDate = d.StartDate,
            EmployeeStatus = d.EmployeeStatus,
            ManagerId = d.ManagerId,
            ManagerEmail = d.ManagerEmail,
            LastModifiedOn = d.LastModifiedOn,
            LastModified = d.LastModified
        };

        if (long.TryParse(d.Id, out long parsedId))
        {
            e.Id = parsedId;
        }

        return e;
    }
}
