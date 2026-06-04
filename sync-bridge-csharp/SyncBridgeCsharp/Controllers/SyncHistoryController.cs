using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SyncBridgeCsharp.Data;
using SyncBridgeCsharp.Dtos;
using SyncBridgeCsharp.Exceptions;
using SyncBridgeCsharp.Models;

namespace SyncBridgeCsharp.Controllers;

[ApiController]
[Route("api/v1/sync-history")]
public class SyncHistoryController : ControllerBase
{
    private readonly SyncDbContext _context;

    public SyncHistoryController(SyncDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] int? page,
        [FromQuery] int? size,
        [FromQuery] string? status)
    {
        int p = page.HasValue && page.Value > 0 ? page.Value - 1 : 0;
        int s = size.HasValue && size.Value > 0 ? size.Value : 15;

        IQueryable<SyncHistory> query = _context.SyncHistories;

        if (!string.IsNullOrEmpty(status))
        {
            SyncStatus? enumStatus = status switch
            {
                "successful" => SyncStatus.Successful,
                "failed" => SyncStatus.Failed,
                "invalid" => SyncStatus.Invalid,
                "pending_retry" => SyncStatus.PendingRetry,
                _ => null
            };

            if (enumStatus.HasValue)
            {
                query = query.Where(sh => sh.Status == enumStatus.Value);
            }
            else
            {
                return BadRequest(new ApiResponse<object>(400, "Invalid status parameter"));
            }
        }

        long totalElements = await query.LongCountAsync();
        var content = await query
            .OrderByDescending(sh => sh.Id)
            .Skip(p * s)
            .Take(s)
            .ToListAsync();

        int totalPages = (int)Math.Ceiling((double)totalElements / s);
        bool first = p == 0;
        bool last = p >= totalPages - 1;
        bool empty = content.Count == 0;

        var pageResult = new Dictionary<string, object>
        {
            { "content", content },
            { "totalPages", totalPages },
            { "totalElements", totalElements },
            { "size", s },
            { "number", p },
            { "numberOfElements", content.Count },
            { "first", first },
            { "last", last },
            { "empty", empty }
        };

        var apiResponse = new ApiResponse<Dictionary<string, object>>(
            200,
            "Sync histories retrieved successfully",
            pageResult
        );

        return Ok(apiResponse);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(long id)
    {
        var sh = await _context.SyncHistories.FindAsync(id);
        if (sh == null)
        {
            throw new ApiException(404, "Sync history not found");
        }

        var apiResponse = new ApiResponse<SyncHistory>(
            200,
            "Sync history retrieved successfully",
            sh
        );
        return Ok(apiResponse);
    }

    [HttpPost("retry/{id}")]
    public async Task<IActionResult> Retry(long id)
    {
        var sh = await _context.SyncHistories.FindAsync(id);
        if (sh == null)
        {
            throw new ApiException(404, "Sync history not found");
        }

        if (sh.Status != SyncStatus.Failed)
        {
            throw new ApiException(400, "Only failed syncs can be retried");
        }

        sh.Status = SyncStatus.PendingRetry;
        sh.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var apiResponse = new ApiResponse<SyncHistory>(
            200,
            "Sync history will be retried",
            sh
        );
        return Ok(apiResponse);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(long id)
    {
        var sh = await _context.SyncHistories.FindAsync(id);
        if (sh == null)
        {
            throw new ApiException(404, "Sync history not found");
        }

        _context.SyncHistories.Remove(sh);
        await _context.SaveChangesAsync();

        var apiResponse = new ApiResponse<object>(
            204,
            "Sync history deleted successfully"
        );
        return StatusCode(204, apiResponse);
    }
}
