using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HotChocolate;
using HotChocolate.Types;
using Microsoft.EntityFrameworkCore;
using SyncBridgeCsharp.Data;
using SyncBridgeCsharp.Models;

namespace SyncBridgeCsharp.GraphQL;

public class EmployeeQueries
{
    public string Hello() => "Hello from Sync Bridge";

    public async Task<List<Employee>> GetEmployees(
        int offset = 0,
        int limit = 10,
        [Service] SyncDbContext context = default!)
    {
        int safeLimit = limit > 0 ? limit : 10;
        int safeOffset = Math.Max(offset, 0);

        return await context.Employees
            .OrderBy(e => e.Id)
            .Skip(safeOffset)
            .Take(safeLimit)
            .ToListAsync();
    }

    public async Task<Employee?> GetEmployee(
        long id,
        [Service] SyncDbContext context = default!)
    {
        return await context.Employees.FindAsync(id);
    }

    public async Task<List<Employee>> SearchEmployees(
        string search,
        int offset = 0,
        int limit = 10,
        [Service] SyncDbContext context = default!)
    {
        int safeLimit = limit > 0 ? limit : 10;
        int safeOffset = Math.Max(offset, 0);

        if (string.IsNullOrEmpty(search))
        {
            return new List<Employee>();
        }

        var searchLower = search.ToLowerInvariant();

        return await context.Employees
            .Where(e => e.FirstName.ToLower().Contains(searchLower) ||
                        e.LastName.ToLower().Contains(searchLower) ||
                        e.Email.ToLower().Contains(searchLower))
            .OrderBy(e => e.Id)
            .Skip(safeOffset)
            .Take(safeLimit)
            .ToListAsync();
    }
}
