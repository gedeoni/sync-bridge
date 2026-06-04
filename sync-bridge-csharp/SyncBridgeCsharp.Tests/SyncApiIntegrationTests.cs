using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SyncBridgeCsharp.Data;
using SyncBridgeCsharp.Dtos;
using SyncBridgeCsharp.Models;
using Xunit;

namespace SyncBridgeCsharp.Tests;

public class SyncApiIntegrationTests : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private readonly string _testDbPath;
    private const string AuthHeader = "x-auth-token";
    private const string AuthToken = "test-token";
    private const string RestPath = "/api/v1";

    public SyncApiIntegrationTests(WebApplicationFactory<Program> factory)
    {
        var testDbId = Guid.NewGuid().ToString("N")[..8];
        _testDbPath = $"test_sync_{testDbId}.db";

        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((context, config) =>
            {
                config.AddInMemoryCollection(new[]
                {
                    new KeyValuePair<string, string?>("DATABASE_URL", $"Data Source={_testDbPath}"),
                    new KeyValuePair<string, string?>("App:AuthToken", AuthToken),
                    new KeyValuePair<string, string?>("AUTHORIZATION_KEY", AuthToken)
                });
            });
        });

        _client = _factory.CreateClient();

        // Ensure database is created
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<SyncDbContext>();
        context.Database.EnsureCreated();
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();

        // Clean up test database file
        if (File.Exists(_testDbPath))
        {
            try
            {
                File.Delete(_testDbPath);
            }
            catch
            {
                // Ignored
            }
        }
    }

    // =========================================================================
    // Auth Tests
    // =========================================================================

    [Fact]
    public async Task Healthz_IsPublic()
    {
        var response = await _client.GetAsync($"{RestPath}/healthz");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<ApiResponse<Dictionary<string, JsonElement>>>();
        Assert.NotNull(body);
        Assert.Equal(200, body.Status);
        Assert.True(body.Data!["read"].GetBoolean());
        Assert.True(body.Data!["write"].GetBoolean());
    }

    [Fact]
    public async Task Sync_WithoutToken_Returns401()
    {
        var response = await _client.PostAsJsonAsync($"{RestPath}/sync", new { });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Sync_WithWrongToken_Returns401()
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"{RestPath}/sync")
        {
            Content = JsonContent.Create(new { })
        };
        request.Headers.Add(AuthHeader, "wrong-token");

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SyncHistory_WithoutToken_Returns401()
    {
        var response = await _client.GetAsync($"{RestPath}/sync-history");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SyncHistory_WithCorrectToken_Returns200()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, $"{RestPath}/sync-history");
        request.Headers.Add(AuthHeader, AuthToken);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // =========================================================================
    // Customer Sync Tests
    // =========================================================================

    [Fact]
    public async Task CustomerSync_CreatesCustomer_AndDuplicateReturns409()
    {
        var customerData = new JsonObject
        {
            ["email"] = "alice@example.com",
            ["first_name"] = "Alice",
            ["last_name"] = "Smith",
            ["default_currency"] = "USD"
        };

        var payload = new JsonObject
        {
            ["model"] = "customers",
            ["data"] = new JsonArray { customerData }
        };

        // First sync - should succeed
        var req1 = new HttpRequestMessage(HttpMethod.Post, $"{RestPath}/sync")
        {
            Content = JsonContent.Create(payload)
        };
        req1.Headers.Add(AuthHeader, AuthToken);

        var res1 = await _client.SendAsync(req1);
        Assert.Equal(HttpStatusCode.OK, res1.StatusCode);

        var body1 = await res1.Content.ReadFromJsonAsync<ApiResponse<Dictionary<string, object>>>();
        Assert.NotNull(body1);
        var results = JsonSerializer.Deserialize<List<Dictionary<string, object>>>(body1.Data!["results"].ToString()!);
        Assert.NotNull(results);
        Assert.Equal("created", results[0]["status"].ToString());

        // Second sync with same email - should return 409 Conflict
        var req2 = new HttpRequestMessage(HttpMethod.Post, $"{RestPath}/sync")
        {
            Content = JsonContent.Create(payload)
        };
        req2.Headers.Add(AuthHeader, AuthToken);

        var res2 = await _client.SendAsync(req2);
        Assert.Equal(HttpStatusCode.Conflict, res2.StatusCode);

        var body2 = await res2.Content.ReadFromJsonAsync<ApiResponse<object>>();
        Assert.NotNull(body2);
        Assert.Contains("Duplicate entry: field 'EMAIL' already exists", body2.Message);
    }

    // =========================================================================
    // Product Sync Tests
    // =========================================================================

    [Fact]
    public async Task ProductSync_CreatesProduct()
    {
        var productData = new JsonObject
        {
            ["name"] = "Compiler",
            ["price"] = 29999,
            ["currency"] = "USD",
            ["active"] = true
        };

        var payload = new JsonObject
        {
            ["model"] = "products",
            ["data"] = new JsonArray { productData }
        };

        var request = new HttpRequestMessage(HttpMethod.Post, $"{RestPath}/sync")
        {
            Content = JsonContent.Create(payload)
        };
        request.Headers.Add(AuthHeader, AuthToken);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<ApiResponse<Dictionary<string, object>>>();
        Assert.NotNull(body);
        var results = JsonSerializer.Deserialize<List<Dictionary<string, object>>>(body.Data!["results"].ToString()!);
        Assert.NotNull(results);
        Assert.Equal("created", results[0]["status"].ToString());
    }

    // =========================================================================
    // Order Sync Tests
    // =========================================================================

    [Fact]
    public async Task OrderSync_Returns400_WhenNoItemsAndNoAmount()
    {
        var orderData = new JsonObject
        {
            ["order_number"] = "ORD-FAIL-01",
            ["customer_id"] = 1,
            ["status"] = "pending"
        };

        var payload = new JsonObject
        {
            ["model"] = "orders",
            ["data"] = new JsonArray { orderData }
        };

        var request = new HttpRequestMessage(HttpMethod.Post, $"{RestPath}/sync")
        {
            Content = JsonContent.Create(payload)
        };
        request.Headers.Add(AuthHeader, AuthToken);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task OrderSync_CreatesOrder_WithExplicitAmount()
    {
        // 1. Create a customer first to avoid foreign key violations
        var customerData = new JsonObject
        {
            ["email"] = "orderok@example.com",
            ["first_name"] = "Order",
            ["last_name"] = "Customer"
        };
        var custPayload = new JsonObject
        {
            ["model"] = "customers",
            ["data"] = new JsonArray { customerData }
        };
        var custReq = new HttpRequestMessage(HttpMethod.Post, $"{RestPath}/sync")
        {
            Content = JsonContent.Create(custPayload)
        };
        custReq.Headers.Add(AuthHeader, AuthToken);
        var custRes = await _client.SendAsync(custReq);
        Assert.Equal(HttpStatusCode.OK, custRes.StatusCode);

        var custBody = await custRes.Content.ReadFromJsonAsync<ApiResponse<Dictionary<string, object>>>();
        Assert.NotNull(custBody);
        var custResults = JsonSerializer.Deserialize<List<Dictionary<string, object>>>(custBody.Data!["results"].ToString()!);
        long customerId = long.Parse(custResults![0]["id"].ToString()!);

        // 2. Create the order referencing the customer
        var orderData = new JsonObject
        {
            ["order_number"] = "ORD-OK-01",
            ["customer_id"] = customerId,
            ["status"] = "pending",
            ["amount"] = 1500
        };

        var payload = new JsonObject
        {
            ["model"] = "orders",
            ["data"] = new JsonArray { orderData }
        };

        var request = new HttpRequestMessage(HttpMethod.Post, $"{RestPath}/sync")
        {
            Content = JsonContent.Create(payload)
        };
        request.Headers.Add(AuthHeader, AuthToken);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<ApiResponse<Dictionary<string, object>>>();
        Assert.NotNull(body);
        var results = JsonSerializer.Deserialize<List<Dictionary<string, object>>>(body.Data!["results"].ToString()!);
        Assert.NotNull(results);
        Assert.Equal("created", results[0]["status"].ToString());
    }

    // =========================================================================
    // Sync History Operations Tests
    // =========================================================================

    [Fact]
    public async Task SyncHistory_CanListDeleteAndRetry()
    {
        // 1. Create a successful sync history entry
        var customerData = new JsonObject
        {
            ["email"] = "stats@example.com",
            ["first_name"] = "Stats",
            ["last_name"] = "Test"
        };

        var payload = new JsonObject
        {
            ["model"] = "customers",
            ["data"] = new JsonArray { customerData }
        };

        var request = new HttpRequestMessage(HttpMethod.Post, $"{RestPath}/sync")
        {
            Content = JsonContent.Create(payload)
        };
        request.Headers.Add(AuthHeader, AuthToken);
        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // 2. Fetch stats
        var reqStats = new HttpRequestMessage(HttpMethod.Get, $"{RestPath}/sync/stats");
        reqStats.Headers.Add(AuthHeader, AuthToken);
        var resStats = await _client.SendAsync(reqStats);
        Assert.Equal(HttpStatusCode.OK, resStats.StatusCode);
        var statsBody = await resStats.Content.ReadFromJsonAsync<ApiResponse<Dictionary<string, long>>>();
        Assert.NotNull(statsBody);
        Assert.True(statsBody.Data!["successful"] > 0);
        Assert.True(statsBody.Data!["total"] > 0);

        // 3. List history
        var reqList = new HttpRequestMessage(HttpMethod.Get, $"{RestPath}/sync-history?page=1&size=10");
        reqList.Headers.Add(AuthHeader, AuthToken);
        var resList = await _client.SendAsync(reqList);
        Assert.Equal(HttpStatusCode.OK, resList.StatusCode);
        var listBody = await resList.Content.ReadFromJsonAsync<ApiResponse<Dictionary<string, object>>>();
        Assert.NotNull(listBody);
        var content = JsonSerializer.Deserialize<List<SyncHistory>>(listBody.Data!["content"].ToString()!, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower) }
        });
        Assert.NotEmpty(content);

        long historyId = content![0].Id;

        // 4. Get by ID
        var reqGet = new HttpRequestMessage(HttpMethod.Get, $"{RestPath}/sync-history/{historyId}");
        reqGet.Headers.Add(AuthHeader, AuthToken);
        var resGet = await _client.SendAsync(reqGet);
        Assert.Equal(HttpStatusCode.OK, resGet.StatusCode);

        // 5. Retry failed check (should return 400 since it is successful, not failed)
        var reqRetry = new HttpRequestMessage(HttpMethod.Post, $"{RestPath}/sync-history/retry/{historyId}");
        reqRetry.Headers.Add(AuthHeader, AuthToken);
        var resRetry = await _client.SendAsync(reqRetry);
        Assert.Equal(HttpStatusCode.BadRequest, resRetry.StatusCode);

        // 6. Delete
        var reqDelete = new HttpRequestMessage(HttpMethod.Delete, $"{RestPath}/sync-history/{historyId}");
        reqDelete.Headers.Add(AuthHeader, AuthToken);
        var resDelete = await _client.SendAsync(reqDelete);
        Assert.Equal(HttpStatusCode.NoContent, resDelete.StatusCode);
    }

    // =========================================================================
    // GraphQL Boundary Tests
    // =========================================================================

    [Fact]
    public async Task GraphQL_Hello_IsPublic()
    {
        var gqlRequest = new
        {
            query = "query { hello }"
        };

        var response = await _client.PostAsJsonAsync("/graphql", gqlRequest);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonNode>();
        Assert.NotNull(body);
        Assert.Equal("Hello from Sync Bridge", body["data"]?["hello"]?.ToString());
    }

    [Fact]
    public async Task GraphQL_CreateEmployee_RequiresAuth_AndSucceedsWithToken()
    {
        var gqlRequest = new
        {
            query = @"
                mutation($data: CreateEmployeeInput!) {
                    createEmployee(data: $data) {
                        id
                        firstName
                        lastName
                        fullName
                        email
                    }
                }",
            variables = new
            {
                data = new
                {
                    id = 12345,
                    employeeId = "E-12345",
                    firstName = "Jane",
                    lastName = "Doe",
                    email = "jane.doe@example.com"
                }
            }
        };

        // 1. Without token - should fail with 401
        var response1 = await _client.PostAsJsonAsync("/graphql", gqlRequest);
        Assert.Equal(HttpStatusCode.Unauthorized, response1.StatusCode);

        // 2. With token - should succeed
        var request = new HttpRequestMessage(HttpMethod.Post, "/graphql")
        {
            Content = JsonContent.Create(gqlRequest)
        };
        request.Headers.Add(AuthHeader, AuthToken);

        var response2 = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response2.StatusCode);

        var body2 = await response2.Content.ReadFromJsonAsync<JsonNode>();
        Assert.NotNull(body2);
        Assert.Null(body2["errors"]);
        Assert.Equal("Jane Doe", body2["data"]?["createEmployee"]?["fullName"]?.ToString());
    }

    // =========================================================================
    // Prometheus Metrics Tests
    // =========================================================================

    [Fact]
    public async Task Metrics_Endpoint_Returns200()
    {
        var response = await _client.GetAsync("/metrics");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("sync_total", content);
    }
}
