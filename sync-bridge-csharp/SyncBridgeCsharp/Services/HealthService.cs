using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SyncBridgeCsharp.Data;
using SyncBridgeCsharp.Models;

namespace SyncBridgeCsharp.Services;

public interface IHealthService
{
    Task<Dictionary<string, object>> HealthCheckAsync();
}

public class HealthService : IHealthService
{
    private readonly SyncDbContext _context;

    public HealthService(SyncDbContext context)
    {
        _context = context;
    }

    public async Task<Dictionary<string, object>> HealthCheckAsync()
    {
        bool readOk = false;
        bool writeOk = false;

        try
        {
            // Read check
            await _context.Customers.AnyAsync();
            readOk = true;
        }
        catch
        {
            // Ignored
        }

        try
        {
            // Write check: insert and immediately delete a temporary customer
            var temp = new Customer
            {
                Email = $"healthcheck_{Guid.NewGuid()}@example.com", // use unique to avoid collision if run concurrently
                FirstName = "Health",
                LastName = "Check",
                DefaultCurrency = "USD"
            };

            _context.Customers.Add(temp);
            await _context.SaveChangesAsync();

            _context.Customers.Remove(temp);
            await _context.SaveChangesAsync();

            writeOk = true;
        }
        catch
        {
            // Ignored
        }

        return new Dictionary<string, object>
        {
            { "read", readOk },
            { "write", writeOk },
            { "timestamp", DateTimeOffset.UtcNow.ToString("o") }
        };
    }
}
