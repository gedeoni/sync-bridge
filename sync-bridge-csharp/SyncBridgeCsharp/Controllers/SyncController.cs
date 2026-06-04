using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using SyncBridgeCsharp.Dtos;
using SyncBridgeCsharp.Services;

namespace SyncBridgeCsharp.Controllers;

[ApiController]
[Route("api/v1/sync")]
public class SyncController : ControllerBase
{
    private readonly ISyncService _syncService;

    public SyncController(ISyncService syncService)
    {
        _syncService = syncService;
    }

    [HttpPost]
    public async Task<IActionResult> Sync([FromBody] SyncRequest request)
    {
        var result = await _syncService.SyncAsync(request.Model, request.Data);
        var apiResponse = new ApiResponse<Dictionary<string, object>>(
            200,
            "Sync successful",
            result
        );
        return Ok(apiResponse);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var stats = await _syncService.GetStatsAsync();
        var apiResponse = new ApiResponse<Dictionary<string, object>>(
            200,
            "Sync stats retrieved successfully",
            stats
        );
        return Ok(apiResponse);
    }
}
