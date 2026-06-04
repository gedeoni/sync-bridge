using System;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using SyncBridgeCsharp.Dtos;

namespace SyncBridgeCsharp.Middleware;

public class AuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly string _configuredToken;

    public AuthMiddleware(RequestDelegate next, IConfiguration configuration)
    {
        _next = next;
        // Default to "your-secret-auth-key" if not set in config
        _configuredToken = configuration["App:AuthToken"]
                           ?? configuration["AUTHORIZATION_KEY"]
                           ?? "your-secret-auth-key";
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? string.Empty;

        // 1. Check for standard REST endpoints
        if (path.StartsWith("/api/v1/sync", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/api/v1/sync-history", StringComparison.OrdinalIgnoreCase))
        {
            // Exclude healthz if it somehow matches (it doesn't, but let's be safe)
            if (!path.Equals("/api/v1/healthz", StringComparison.OrdinalIgnoreCase))
            {
                if (!IsAuthorized(context))
                {
                    await SendUnauthorizedAsync(context);
                    return;
                }
            }
        }

        // 2. Check for GraphQL endpoints
        if (path.Equals("/graphql", StringComparison.OrdinalIgnoreCase) ||
            path.Equals("/graphql/", StringComparison.OrdinalIgnoreCase))
        {
            context.Request.EnableBuffering();

            string bodyStr;
            using (var reader = new StreamReader(context.Request.Body, encoding: Encoding.UTF8, detectEncodingFromByteOrderMarks: true, bufferSize: 1024, leaveOpen: true))
            {
                bodyStr = await reader.ReadToEndAsync();
                context.Request.Body.Position = 0; // reset for Hot Chocolate
            }

            // Enforce token auth only for create mutations
            if (bodyStr.Contains("createEmployee") || (bodyStr.Contains("mutation") && bodyStr.Contains("create")))
            {
                if (!IsAuthorized(context))
                {
                    await SendUnauthorizedAsync(context);
                    return;
                }
            }
        }

        await _next(context);
    }

    private bool IsAuthorized(HttpContext context)
    {
        // Headers are case-insensitive in ASP.NET Core
        if (context.Request.Headers.TryGetValue("x-auth-token", out var tokenValues))
        {
            var token = tokenValues.ToString();
            return !string.IsNullOrEmpty(_configuredToken) && _configuredToken.Equals(token);
        }
        return false;
    }

    private static async Task SendUnauthorizedAsync(HttpContext context)
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        context.Response.ContentType = "application/json";

        var response = new ApiResponse<object>(
            StatusCodes.Status401Unauthorized,
            "Access Denied"
        );

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase // Matching Spring's default camelCase response keys or let's use default
        });

        await context.Response.WriteAsync(json);
    }
}
