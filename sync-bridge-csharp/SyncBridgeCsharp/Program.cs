using System;
using System.Collections.Generic;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Prometheus;
using SyncBridgeCsharp.Data;
using SyncBridgeCsharp.Dtos;
using SyncBridgeCsharp.Exceptions;
using SyncBridgeCsharp.GraphQL;
using SyncBridgeCsharp.Middleware;
using SyncBridgeCsharp.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Configure Kestrel Port
var portStr = Environment.GetEnvironmentVariable("PORT") ?? "3000";
if (int.TryParse(portStr, out int port))
{
    builder.WebHost.ConfigureKestrel(options => options.ListenAnyIP(port));
}
else
{
    builder.WebHost.ConfigureKestrel(options => options.ListenAnyIP(3000));
}

// 2. Add DbContext and DbContextFactory
builder.Services.AddDbContextFactory<SyncDbContext>((serviceProvider, options) =>
{
    var configuration = serviceProvider.GetRequiredService<IConfiguration>();
    var dbUrl = configuration["DATABASE_URL"]
                ?? Environment.GetEnvironmentVariable("DATABASE_URL")
                ?? configuration.GetConnectionString("DefaultConnection")
                ?? "Data Source=sync-bridge.db";
    options.UseSqlite(dbUrl);
});

builder.Services.AddDbContext<SyncDbContext>((serviceProvider, options) =>
{
    var configuration = serviceProvider.GetRequiredService<IConfiguration>();
    var dbUrl = configuration["DATABASE_URL"]
                ?? Environment.GetEnvironmentVariable("DATABASE_URL")
                ?? configuration.GetConnectionString("DefaultConnection")
                ?? "Data Source=sync-bridge.db";
    options.UseSqlite(dbUrl);
});

// 3. Add Custom Services
builder.Services.AddScoped<ISyncMapper, SyncMapper>();
builder.Services.AddScoped<ISyncHistoryService, SyncHistoryService>();
builder.Services.AddScoped<ISyncService, SyncService>();
builder.Services.AddScoped<IHealthService, HealthService>();

// 4. Configure Controllers and JSON Formatting
builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = new Dictionary<string, string>();
            foreach (var key in context.ModelState.Keys)
            {
                var entry = context.ModelState[key];
                if (entry != null && entry.Errors.Count > 0)
                {
                    // Convert key to camelCase
                    var fieldName = JsonNamingPolicy.CamelCase.ConvertName(key);
                    // Handle nested properties (e.g. Data[0].Email)
                    if (fieldName.Contains('.'))
                    {
                        fieldName = fieldName.Split('.')[^1];
                    }
                    errors[fieldName] = entry.Errors[0].ErrorMessage;
                }
            }
            var response = new Dictionary<string, object>
            {
                { "status", 400 },
                { "message", "Validation failed" },
                { "errors", errors }
            };
            return new BadRequestObjectResult(response);
        };
    })
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.WriteIndented = false;
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower));
    });

// 5. Add GraphQL Server via Hot Chocolate
builder.Services
    .AddGraphQLServer()
    .AddQueryType<EmployeeQueries>()
    .AddMutationType<EmployeeMutations>()
    .AddSubscriptionType<EmployeeSubscriptions>()
    .AddInMemorySubscriptions();

builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

// 6. DB Initialization & Migrations
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<SyncDbContext>();
    context.Database.EnsureCreated();
}

// 7. HTTP Request Pipeline Middlewares

// Enable WebSockets (needed for GraphQL Subscriptions)
app.UseWebSockets();

// A. Global Exception Handler Middleware
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        context.Response.ContentType = "application/json";
        int statusCode = 500;
        string message = "Internal Server Error";

        if (ex is ApiException apiEx)
        {
            statusCode = apiEx.Status;
            message = apiEx.Message;
        }

        context.Response.StatusCode = statusCode;
        var response = new ApiResponse<object>(statusCode, message);
        await context.Response.WriteAsJsonAsync(response);
    }
});

// B. Correlation tracking
app.UseMiddleware<RequestIdMiddleware>();

// C. Authentication check
app.UseMiddleware<AuthMiddleware>();

// 8. Map Routing Endpoints
app.MapControllers();
app.MapGraphQL();

// Prometheus Telemetry metrics scraping endpoints
app.MapMetrics("/metrics");
app.MapMetrics("/actuator/prometheus");

app.Run();

// Required to reference Program from integration tests
public partial class Program { }
