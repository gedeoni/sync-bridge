using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace SyncBridgeCsharp.Middleware;

public class RequestIdMiddleware
{
    private readonly RequestDelegate _next;

    public RequestIdMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        const string headerKey = "X-Request-Id";
        if (!context.Request.Headers.TryGetValue(headerKey, out var requestId))
        {
            requestId = Guid.NewGuid().ToString();
        }

        context.Response.Headers[headerKey] = requestId;
        context.Items["RequestId"] = requestId.ToString();

        await _next(context);
    }
}
