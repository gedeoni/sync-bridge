using System;
using System.Threading.Tasks;
using HotChocolate;
using HotChocolate.Subscriptions;
using HotChocolate.Types;
using SyncBridgeCsharp.Data;
using SyncBridgeCsharp.Models;

namespace SyncBridgeCsharp.GraphQL;

public record CreateEmployeeInput(
    long Id,
    string EmployeeId,
    string FirstName,
    string LastName,
    string Email,
    string? MiddleName = null,
    string? Company = null,
    string? JobTitle = null
);

public record UpdateEmployeeInput(
    string? FirstName = null,
    string? LastName = null,
    string? Email = null,
    string? MiddleName = null,
    string? Company = null,
    string? JobTitle = null
);

public class EmployeeMutations
{
    public async Task<Employee> CreateEmployee(
        CreateEmployeeInput data,
        [Service] SyncDbContext context,
        [Service] ITopicEventSender eventSender)
    {
        var employee = new Employee
        {
            Id = data.Id,
            EmployeeId = data.EmployeeId,
            FirstName = data.FirstName,
            LastName = data.LastName,
            Email = data.Email,
            MiddleName = data.MiddleName,
            Company = data.Company,
            JobTitle = data.JobTitle,
            LastModifiedOn = DateTimeOffset.UtcNow,
            LastModified = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
        };

        context.Employees.Add(employee);
        await context.SaveChangesAsync();

        // Emit subscription event
        await eventSender.SendAsync(nameof(EmployeeSubscriptions.EmployeeCreated), employee);

        return employee;
    }

    public async Task<Employee?> UpdateEmployee(
        long id,
        UpdateEmployeeInput data,
        [Service] SyncDbContext context)
    {
        var existing = await context.Employees.FindAsync(id);
        if (existing == null)
        {
            return null;
        }

        if (data.FirstName != null) existing.FirstName = data.FirstName;
        if (data.LastName != null) existing.LastName = data.LastName;
        if (data.Email != null) existing.Email = data.Email;
        if (data.MiddleName != null) existing.MiddleName = data.MiddleName;
        if (data.Company != null) existing.Company = data.Company;
        if (data.JobTitle != null) existing.JobTitle = data.JobTitle;

        existing.LastModifiedOn = DateTimeOffset.UtcNow;
        existing.LastModified = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

        await context.SaveChangesAsync();
        return existing;
    }

    public async Task<bool> DeleteEmployee(
        long id,
        [Service] SyncDbContext context)
    {
        var existing = await context.Employees.FindAsync(id);
        if (existing == null)
        {
            return false;
        }

        context.Employees.Remove(existing);
        await context.SaveChangesAsync();
        return true;
    }
}
