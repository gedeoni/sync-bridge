using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SyncBridgeCsharp.Data;
using SyncBridgeCsharp.Models;

namespace SyncBridgeCsharp.Services;

public interface ISyncHistoryService
{
    Task<SyncHistory> CreatePendingAsync(string payload);
    Task MarkSuccessAsync(long id);
    Task MarkFailedAsync(long id, string reason);
    Task MarkInvalidAsync(long id, string reason);
}

public class SyncHistoryService : ISyncHistoryService
{
    private readonly IDbContextFactory<SyncDbContext> _contextFactory;

    public SyncHistoryService(IDbContextFactory<SyncDbContext> contextFactory)
    {
        _contextFactory = contextFactory;
    }

    public async Task<SyncHistory> CreatePendingAsync(string payload)
    {
        using var context = await _contextFactory.CreateDbContextAsync();
        var sh = new SyncHistory
        {
            Payload = payload,
            Status = SyncStatus.PendingRetry,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.SyncHistories.Add(sh);
        await context.SaveChangesAsync();
        return sh;
    }

    public async Task MarkSuccessAsync(long id)
    {
        using var context = await _contextFactory.CreateDbContextAsync();
        var sh = await context.SyncHistories.FindAsync(id);
        if (sh != null)
        {
            sh.Status = SyncStatus.Successful;
            sh.UpdatedAt = DateTime.UtcNow;
            await context.SaveChangesAsync();
        }
    }

    public async Task MarkFailedAsync(long id, string reason)
    {
        using var context = await _contextFactory.CreateDbContextAsync();
        var sh = await context.SyncHistories.FindAsync(id);
        if (sh != null)
        {
            sh.Status = SyncStatus.Failed;
            sh.FailureReason = Truncate(reason);
            sh.UpdatedAt = DateTime.UtcNow;
            await context.SaveChangesAsync();
        }
    }

    public async Task MarkInvalidAsync(long id, string reason)
    {
        using var context = await _contextFactory.CreateDbContextAsync();
        var sh = await context.SyncHistories.FindAsync(id);
        if (sh != null)
        {
            sh.Status = SyncStatus.Invalid;
            sh.FailureReason = Truncate(reason);
            sh.UpdatedAt = DateTime.UtcNow;
            await context.SaveChangesAsync();
        }
    }

    private static string? Truncate(string? val)
    {
        if (val == null) return null;
        return val.Length > 255 ? val[..255] : val;
    }
}
