using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using SyncBridgeCsharp.Dtos;
using SyncBridgeCsharp.Services;

namespace SyncBridgeCsharp.Controllers;

[ApiController]
[Route("api/v1/healthz")]
public class StatusController : ControllerBase
{
    private readonly IHealthService _healthService;

    public StatusController(IHealthService healthService)
    {
        _healthService = healthService;
    }

    [HttpGet]
    public async Task<IActionResult> Health()
    {
        var res = await _healthService.HealthCheckAsync();
        bool ok = res.TryGetValue("read", out var readObj) && readObj is true &&
                  res.TryGetValue("write", out var writeObj) && writeObj is true;

        int status = ok ? 200 : 503;
        var apiResponse = new ApiResponse<Dictionary<string, object>>(
            status,
            ok ? "Service is healthy" : "Service is unhealthy",
            res
        );

        return StatusCode(status, apiResponse);
    }
}
