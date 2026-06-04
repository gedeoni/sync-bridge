using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using SyncBridgeCsharp.Data;
using SyncBridgeCsharp.Dtos;
using SyncBridgeCsharp.Exceptions;
using SyncBridgeCsharp.Models;

using SyncBridgeCsharp.Telemetry;

namespace SyncBridgeCsharp.Services;

public interface ISyncService
{
    Task<Dictionary<string, object>> SyncAsync(string model, List<JsonObject> data);
    Task<Dictionary<string, object>> GetStatsAsync();
}

public class SyncService : ISyncService
{
    private readonly SyncDbContext _context;
    private readonly ISyncHistoryService _syncHistoryService;
    private readonly ISyncMapper _mapper;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true
    };

    public SyncService(
        SyncDbContext context,
        ISyncHistoryService syncHistoryService,
        ISyncMapper mapper)
    {
        _context = context;
        _syncHistoryService = syncHistoryService;
        _mapper = mapper;
    }

    public async Task<Dictionary<string, object>> SyncAsync(string model, List<JsonObject> data)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        SyncMetrics.SyncTotal.Inc();

        string payloadStr;
        try
        {
            payloadStr = JsonSerializer.Serialize(data, JsonOptions);
        }
        catch
        {
            payloadStr = "Error serializing payload";
        }

        // 1. Immediate ledging of history record
        var syncHistory = await _syncHistoryService.CreatePendingAsync(payloadStr);

        // Validate model name
        var validModels = new[] { "customers", "products", "orders", "employees" };
        if (!validModels.Contains(model))
        {
            await _syncHistoryService.MarkInvalidAsync(syncHistory.Id, $"Invalid model: {model}");
            SyncMetrics.SyncErrors.WithLabels("ArgumentException", model).Inc();
            throw new ArgumentException($"Invalid model: {model}");
        }

        var results = new List<Dictionary<string, object>>();

        // 2. Perform synchronization within a database transaction boundary
        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            foreach (var itemData in data)
            {
                var result = await ProcessItemAsync(model, itemData);
                results.Add(result);
            }

            // Flush changes to database
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            // 3. Mark sync as successful
            await _syncHistoryService.MarkSuccessAsync(syncHistory.Id);

            stopwatch.Stop();
            SyncMetrics.SyncDurationSeconds.WithLabels("success", model).Observe(stopwatch.Elapsed.TotalSeconds);

            return new Dictionary<string, object>
            {
                { "results", results }
            };
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            stopwatch.Stop();
            SyncMetrics.SyncDurationSeconds.WithLabels("error", model).Observe(stopwatch.Elapsed.TotalSeconds);

            string exceptionName = ex.GetType().Name;

            // Check if it is a validation error (e.g. order amount mismatch)
            if (ex is ApiException apiEx && apiEx.Status == 400)
            {
                await _syncHistoryService.MarkFailedAsync(syncHistory.Id, ex.Message);
                SyncMetrics.SyncErrors.WithLabels(exceptionName, model).Inc();
                throw;
            }

            // Check for DB constraint violations (like unique key violations)
            var inner = ex.InnerException;
            while (inner != null)
            {
                if (inner is SqliteException sqliteEx && (sqliteEx.SqliteErrorCode == 19 || sqliteEx.Message.Contains("UNIQUE constraint failed")))
                {
                    string fields = ExtractViolatedFields(sqliteEx.Message);
                    string conflictMsg = $"Duplicate entry: field {fields} already exists";
                    await _syncHistoryService.MarkFailedAsync(syncHistory.Id, conflictMsg);
                    SyncMetrics.SyncErrors.WithLabels("SqliteException", model).Inc();
                    throw new ApiException(409, conflictMsg);
                }
                inner = inner.InnerException;
            }

            // Generic error handling
            await _syncHistoryService.MarkFailedAsync(syncHistory.Id, ex.Message);
            SyncMetrics.SyncErrors.WithLabels(exceptionName, model).Inc();
            throw;
        }
    }

    private async Task<Dictionary<string, object>> ProcessItemAsync(string model, JsonObject itemData)
    {
        var rawId = itemData["id"]?.ToString();
        bool isUpdate = false;
        long savedId = 0;

        var validationResults = new List<ValidationResult>();

        if (model == "customers")
        {
            var dto = JsonSerializer.Deserialize<CustomerDto>(itemData.ToJsonString(), JsonOptions)
                      ?? throw new ApiException(400, "Unable to parse customer object");

            var validationContext = new ValidationContext(dto);
            if (!Validator.TryValidateObject(dto, validationContext, validationResults, true))
            {
                throw new ApiException(400, "Validation failed: " + string.Join(", ", validationResults.Select(r => r.ErrorMessage)));
            }

            var entity = _mapper.MapCustomer(dto);
            if (entity.Id != 0 && await _context.Customers.AnyAsync(c => c.Id == entity.Id))
            {
                _context.Customers.Update(entity);
                isUpdate = true;
            }
            else
            {
                _context.Customers.Add(entity);
            }

            // Save changes so entity ID is populated for response
            await _context.SaveChangesAsync();
            savedId = entity.Id;
        }
        else if (model == "products")
        {
            var dto = JsonSerializer.Deserialize<ProductDto>(itemData.ToJsonString(), JsonOptions)
                      ?? throw new ApiException(400, "Unable to parse product object");

            var validationContext = new ValidationContext(dto);
            if (!Validator.TryValidateObject(dto, validationContext, validationResults, true))
            {
                throw new ApiException(400, "Validation failed: " + string.Join(", ", validationResults.Select(r => r.ErrorMessage)));
            }

            var entity = _mapper.MapProduct(dto);
            if (entity.Id != 0 && await _context.Products.AnyAsync(p => p.Id == entity.Id))
            {
                _context.Products.Update(entity);
                isUpdate = true;
            }
            else
            {
                _context.Products.Add(entity);
            }

            await _context.SaveChangesAsync();
            savedId = entity.Id;
        }
        else if (model == "orders")
        {
            var dto = JsonSerializer.Deserialize<OrderDto>(itemData.ToJsonString(), JsonOptions)
                      ?? throw new ApiException(400, "Unable to parse order object");

            var validationContext = new ValidationContext(dto);
            if (!Validator.TryValidateObject(dto, validationContext, validationResults, true))
            {
                throw new ApiException(400, "Validation failed: " + string.Join(", ", validationResults.Select(r => r.ErrorMessage)));
            }

            var entity = _mapper.MapOrder(dto);
            if (entity.Id != 0)
            {
                var existingOrder = await _context.Orders
                    .Include(o => o.Items)
                    .FirstOrDefaultAsync(o => o.Id == entity.Id);

                if (existingOrder != null)
                {
                    existingOrder.OrderNumber = entity.OrderNumber;
                    existingOrder.CustomerId = entity.CustomerId;
                    existingOrder.Status = entity.Status;
                    existingOrder.Currency = entity.Currency;
                    existingOrder.Amount = entity.Amount;
                    existingOrder.UpdatedAt = DateTime.UtcNow;

                    _context.OrderItems.RemoveRange(existingOrder.Items);
                    existingOrder.Items = entity.Items;
                    _context.Orders.Update(existingOrder);
                    isUpdate = true;
                    await _context.SaveChangesAsync();
                    savedId = existingOrder.Id;
                }
                else
                {
                    _context.Orders.Add(entity);
                    await _context.SaveChangesAsync();
                    savedId = entity.Id;
                }
            }
            else
            {
                _context.Orders.Add(entity);
                await _context.SaveChangesAsync();
                savedId = entity.Id;
            }
        }
        else if (model == "employees")
        {
            var dto = JsonSerializer.Deserialize<EmployeeDto>(itemData.ToJsonString(), JsonOptions)
                      ?? throw new ApiException(400, "Unable to parse employee object");

            var validationContext = new ValidationContext(dto);
            if (!Validator.TryValidateObject(dto, validationContext, validationResults, true))
            {
                throw new ApiException(400, "Validation failed: " + string.Join(", ", validationResults.Select(r => r.ErrorMessage)));
            }

            var entity = _mapper.MapEmployee(dto);
            var existingEmployee = await _context.Employees.FindAsync(entity.Id);
            if (existingEmployee != null)
            {
                _context.Entry(existingEmployee).CurrentValues.SetValues(entity);
                isUpdate = true;
            }
            else
            {
                _context.Employees.Add(entity);
            }

            await _context.SaveChangesAsync();
            savedId = entity.Id;
        }

        return new Dictionary<string, object>
        {
            { "id", savedId },
            { "status", isUpdate ? "updated" : "created" }
        };
    }

    public async Task<Dictionary<string, object>> GetStatsAsync()
    {
        var statsList = await _context.SyncHistories
            .GroupBy(sh => sh.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        var statsSummary = new Dictionary<string, object>
        {
            { "successful", 0L },
            { "failed", 0L },
            { "invalid", 0L },
            { "pending_retry", 0L }
        };

        long total = 0;
        foreach (var stat in statsList)
        {
            string key = stat.Status switch
            {
                SyncStatus.Successful => "successful",
                SyncStatus.Failed => "failed",
                SyncStatus.Invalid => "invalid",
                SyncStatus.PendingRetry => "pending_retry",
                _ => "pending_retry"
            };

            statsSummary[key] = (long)stat.Count;
            total += stat.Count;
        }

        statsSummary["total"] = total;
        return statsSummary;
    }

    private static string ExtractViolatedFields(string? message)
    {
        if (string.IsNullOrEmpty(message)) return "unknown";

        // Try to match SQLite: "UNIQUE constraint failed: customers.email"
        var match = System.Text.RegularExpressions.Regex.Match(message, @"UNIQUE constraint failed:\s+(\w+)\.(\w+)");
        if (match.Success)
        {
            return $"'{match.Groups[2].Value.ToUpperInvariant()}'";
        }

        // Try to match SQLite: "UNIQUE constraint failed: email"
        match = System.Text.RegularExpressions.Regex.Match(message, @"UNIQUE constraint failed:\s+(\w+)");
        if (match.Success)
        {
            return $"'{match.Groups[1].Value.ToUpperInvariant()}'";
        }

        return "unknown";
    }
}
