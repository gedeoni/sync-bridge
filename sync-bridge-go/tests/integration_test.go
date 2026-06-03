package tests

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"

	"sync-bridge-go/graph"
	"sync-bridge-go/internal/config"
	"sync-bridge-go/internal/db"
	"sync-bridge-go/internal/handlers"
	"sync-bridge-go/internal/middleware"
)

const (
	AuthHeader = "x-auth-token"
	Token      = "test-token"
)

func spawnApp(t *testing.T) (string, *sql.DB) {
	// Configure test env variables
	os.Setenv("AUTHORIZATION_KEY", Token)
	os.Setenv("DATABASE_URL", "file::memory:?cache=shared")
	os.Setenv("APP_PORT", "0") // will listen on random port

	cfg := config.LoadConfig()

	// Initialize DB
	dbConn, err := db.InitDB(cfg.DatabaseURL)
	if err != nil {
		t.Fatalf("Failed to initialize test DB: %v", err)
	}

	// Create Gin Router
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.RequestIDMiddleware())
	r.Use(middleware.AuthMiddleware(cfg.AuthToken))

	// Mount REST Endpoints
	api := r.Group("/api/v1")
	{
		api.GET("/healthz", handlers.HealthHandler(dbConn))
		api.POST("/sync", handlers.SyncHandler(dbConn))
		api.GET("/sync/stats", handlers.StatsHandler(dbConn))
		api.GET("/sync-history", handlers.ListHistoryHandler(dbConn))
		api.GET("/sync-history/:id", handlers.GetHistoryHandler(dbConn))
		api.POST("/sync-history/retry/:id", handlers.RetryHistoryHandler(dbConn))
		api.DELETE("/sync-history/:id", handlers.DeleteHistoryHandler(dbConn))
	}

	// Mount GraphQL
	broker := graph.NewEmployeeBroker()
	srv := handler.NewDefaultServer(graph.NewExecutableSchema(graph.Config{
		Resolvers: &graph.Resolver{
			DB:     dbConn,
			Broker: broker,
		},
	}))
	r.POST("/graphql", gin.WrapH(srv))
	r.GET("/graphql", gin.WrapH(srv))

	// Bind to random port
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Failed to bind random port: %v", err)
	}

	port := listener.Addr().(*net.TCPAddr).Port
	baseURL := fmt.Sprintf("http://127.0.0.1:%d", port)

	// Spawn Gin server in background
	srvHttp := &http.Server{Handler: r}
	go func() {
		_ = srvHttp.Serve(listener)
	}()

	// Cleanup on test termination
	t.Cleanup(func() {
		_ = srvHttp.Close()
		_ = dbConn.Close()
	})

	// Wait for server to start
	time.Sleep(100 * time.Millisecond)

	return baseURL, dbConn
}

func TestHealthzIsPublic(t *testing.T) {
	baseURL, _ := spawnApp(t)
	resp, err := http.Get(baseURL + "/api/v1/healthz")
	assert.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var body map[string]interface{}
	err = json.NewDecoder(resp.Body).Decode(&body)
	assert.NoError(t, err)

	assert.Equal(t, float64(200), body["status"])
	assert.Equal(t, "Service is healthy", body["message"])

	data := body["data"].(map[string]interface{})
	assert.True(t, data["read"].(bool))
	assert.True(t, data["write"].(bool))
}

func TestAuthProtectionOnRestSync(t *testing.T) {
	baseURL, _ := spawnApp(t)

	// 1. Without token
	payload := `{"model": "customers", "data": []}`
	resp, err := http.Post(baseURL+"/api/v1/sync", "application/json", strings.NewReader(payload))
	assert.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)

	// 2. With wrong token
	req, _ := http.NewRequest("POST", baseURL+"/api/v1/sync", strings.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set(AuthHeader, "wrong-token")
	resp2, err := http.DefaultClient.Do(req)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, resp2.StatusCode)

	// 3. With correct token
	req3, _ := http.NewRequest("POST", baseURL+"/api/v1/sync", strings.NewReader(`{
		"model": "customers",
		"data": [
			{ "email": "auth@example.com", "first_name": "Auth", "last_name": "Test" }
		]
	}`))
	req3.Header.Set("Content-Type", "application/json")
	req3.Header.Set(AuthHeader, Token)
	resp3, err := http.DefaultClient.Do(req3)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp3.StatusCode)
}

func TestCustomerSyncSuccessAndDuplicates(t *testing.T) {
	baseURL, _ := spawnApp(t)

	payload := `{
		"model": "customers",
		"data": [
			{ "email": "alice@example.com", "first_name": "Alice", "last_name": "Smith", "default_currency": "USD" }
		]
	}`

	// Create customer
	req, _ := http.NewRequest("POST", baseURL+"/api/v1/sync", strings.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set(AuthHeader, Token)
	resp, err := http.DefaultClient.Do(req)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var body map[string]interface{}
	_ = json.NewDecoder(resp.Body).Decode(&body)
	results := body["data"].(map[string]interface{})["results"].([]interface{})
	firstResult := results[0].(map[string]interface{})
	assert.Equal(t, "created", firstResult["status"])
	assert.NotNil(t, firstResult["id"])

	// Try inserting duplicate
	req2, _ := http.NewRequest("POST", baseURL+"/api/v1/sync", strings.NewReader(payload))
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set(AuthHeader, Token)
	resp2, err := http.DefaultClient.Do(req2)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusConflict, resp2.StatusCode)

	var errBody map[string]interface{}
	_ = json.NewDecoder(resp2.Body).Decode(&errBody)
	assert.Contains(t, errBody["message"].(string), "Duplicate entry: field 'EMAIL' already exists")
}

func TestProductSyncSuccess(t *testing.T) {
	baseURL, _ := spawnApp(t)

	payload := `{
		"model": "products",
		"data": [
			{ "name": "Widget", "price": 999, "currency": "USD", "active": true, "weight_grams": 150 }
		]
	}`

	req, _ := http.NewRequest("POST", baseURL+"/api/v1/sync", strings.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set(AuthHeader, Token)
	resp, err := http.DefaultClient.Do(req)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var body map[string]interface{}
	_ = json.NewDecoder(resp.Body).Decode(&body)
	results := body["data"].(map[string]interface{})["results"].([]interface{})
	assert.Equal(t, "created", results[0].(map[string]interface{})["status"].(string))
}

func TestOrderSyncValidationAndCalculations(t *testing.T) {
	baseURL, _ := spawnApp(t)

	// 1. Sync customer & product first to resolve foreign keys
	reqCust, _ := http.NewRequest("POST", baseURL+"/api/v1/sync", strings.NewReader(`{
		"model": "customers",
		"data": [{ "id": 100, "email": "customer@example.com", "first_name": "C", "last_name": "T" }]
	}`))
	reqCust.Header.Set("Content-Type", "application/json")
	reqCust.Header.Set(AuthHeader, Token)
	respCust, _ := http.DefaultClient.Do(reqCust)
	assert.Equal(t, http.StatusOK, respCust.StatusCode)

	reqProd, _ := http.NewRequest("POST", baseURL+"/api/v1/sync", strings.NewReader(`{
		"model": "products",
		"data": [{ "id": 200, "name": "Widget P", "price": 500 }]
	}`))
	reqProd.Header.Set("Content-Type", "application/json")
	reqProd.Header.Set(AuthHeader, Token)
	respProd, _ := http.DefaultClient.Do(reqProd)
	assert.Equal(t, http.StatusOK, respProd.StatusCode)

	// 2. Order without items and without amount fails
	reqOrd1, _ := http.NewRequest("POST", baseURL+"/api/v1/sync", strings.NewReader(`{
		"model": "orders",
		"data": [{ "order_number": "ORD-1", "customer_id": 100, "status": "pending" }]
	}`))
	reqOrd1.Header.Set("Content-Type", "application/json")
	reqOrd1.Header.Set(AuthHeader, Token)
	respOrd1, _ := http.DefaultClient.Do(reqOrd1)
	assert.Equal(t, http.StatusBadRequest, respOrd1.StatusCode)

	// 3. Order with wrong amount sum fails
	reqOrd2, _ := http.NewRequest("POST", baseURL+"/api/v1/sync", strings.NewReader(`{
		"model": "orders",
		"data": [{
			"order_number": "ORD-1",
			"customer_id": 100,
			"status": "pending",
			"amount": 1000,
			"items": [{ "product_id": 200, "qty": 3, "unit_price": 500 }]
		}]
	}`))
	reqOrd2.Header.Set("Content-Type", "application/json")
	reqOrd2.Header.Set(AuthHeader, Token)
	respOrd2, _ := http.DefaultClient.Do(reqOrd2)
	assert.Equal(t, http.StatusBadRequest, respOrd2.StatusCode)

	// 4. Order with correct items succeeds
	reqOrd3, _ := http.NewRequest("POST", baseURL+"/api/v1/sync", strings.NewReader(`{
		"model": "orders",
		"data": [{
			"order_number": "ORD-1",
			"customer_id": 100,
			"status": "pending",
			"items": [{ "product_id": 200, "qty": 3, "unit_price": 500 }]
		}]
	}`))
	reqOrd3.Header.Set("Content-Type", "application/json")
	reqOrd3.Header.Set(AuthHeader, Token)
	respOrd3, _ := http.DefaultClient.Do(reqOrd3)
	assert.Equal(t, http.StatusOK, respOrd3.StatusCode)
}

func TestStatsHandler(t *testing.T) {
	baseURL, _ := spawnApp(t)

	// Perform a sync
	req, _ := http.NewRequest("POST", baseURL+"/api/v1/sync", strings.NewReader(`{
		"model": "customers",
		"data": [{ "email": "stats@example.com", "first_name": "S", "last_name": "T" }]
	}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set(AuthHeader, Token)
	resp, _ := http.DefaultClient.Do(req)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// Request stats
	reqStats, _ := http.NewRequest("GET", baseURL+"/api/v1/sync/stats", nil)
	reqStats.Header.Set(AuthHeader, Token)
	respStats, err := http.DefaultClient.Do(reqStats)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, respStats.StatusCode)

	var body map[string]interface{}
	_ = json.NewDecoder(respStats.Body).Decode(&body)
	data := body["data"].(map[string]interface{})
	assert.GreaterOrEqual(t, data["total"].(float64), float64(1))
	assert.Equal(t, float64(1), data["successful"].(float64))
}

func TestSyncHistoryListDetailsAndDelete(t *testing.T) {
	baseURL, _ := spawnApp(t)

	// 1. Perform sync to populate history
	req, _ := http.NewRequest("POST", baseURL+"/api/v1/sync", strings.NewReader(`{
		"model": "customers",
		"data": [{ "email": "hist@example.com", "first_name": "H", "last_name": "T" }]
	}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set(AuthHeader, Token)
	resp, _ := http.DefaultClient.Do(req)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// 2. List history
	reqList, _ := http.NewRequest("GET", baseURL+"/api/v1/sync-history?page=1&size=5", nil)
	reqList.Header.Set(AuthHeader, Token)
	respList, err := http.DefaultClient.Do(reqList)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, respList.StatusCode)

	var body map[string]interface{}
	_ = json.NewDecoder(respList.Body).Decode(&body)
	content := body["data"].(map[string]interface{})["content"].([]interface{})
	assert.NotEmpty(t, content)
	histID := int64(content[0].(map[string]interface{})["id"].(float64))

	// 3. Get single history item
	reqGet, _ := http.NewRequest("GET", fmt.Sprintf("%s/api/v1/sync-history/%d", baseURL, histID), nil)
	reqGet.Header.Set(AuthHeader, Token)
	respGet, err := http.DefaultClient.Do(reqGet)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, respGet.StatusCode)

	// 4. Delete history item
	reqDel, _ := http.NewRequest("DELETE", fmt.Sprintf("%s/api/v1/sync-history/%d", baseURL, histID), nil)
	reqDel.Header.Set(AuthHeader, Token)
	respDel, err := http.DefaultClient.Do(reqDel)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusNoContent, respDel.StatusCode)

	// 5. Verify deleted
	reqGet2, _ := http.NewRequest("GET", fmt.Sprintf("%s/api/v1/sync-history/%d", baseURL, histID), nil)
	reqGet2.Header.Set(AuthHeader, Token)
	respGet2, err := http.DefaultClient.Do(reqGet2)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, respGet2.StatusCode)
}

func TestFailedSyncTransactionRollbackButHistoryPreserved(t *testing.T) {
	baseURL, dbConn := spawnApp(t)

	// Try to sync customer with empty first_name (triggers validation failure)
	req, _ := http.NewRequest("POST", baseURL+"/api/v1/sync", strings.NewReader(`{
		"model": "customers",
		"data": [{ "email": "fail_tx@example.com", "first_name": "", "last_name": "Test" }]
	}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set(AuthHeader, Token)
	resp, _ := http.DefaultClient.Do(req)
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)

	// 1. Verify no customer was inserted in DB
	var count int64
	err := dbConn.QueryRow("SELECT COUNT(*) FROM customers WHERE email = 'fail_tx@example.com'").Scan(&count)
	assert.NoError(t, err)
	assert.Equal(t, int64(0), count)

	// 2. Verify history contains a FAILED entry with the validation failure reason
	reqHist, _ := http.NewRequest("GET", baseURL+"/api/v1/sync-history", nil)
	reqHist.Header.Set(AuthHeader, Token)
	respHist, err := http.DefaultClient.Do(reqHist)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, respHist.StatusCode)

	var histBody map[string]interface{}
	_ = json.NewDecoder(respHist.Body).Decode(&histBody)
	content := histBody["data"].(map[string]interface{})["content"].([]interface{})
	assert.NotEmpty(t, content)
	firstHist := content[0].(map[string]interface{})
	assert.Equal(t, "FAILED", firstHist["status"].(string))
	assert.Contains(t, firstHist["failureReason"].(string), "Validation failed")
}

func TestGraphQLPublicAccessAndMutationAuth(t *testing.T) {
	baseURL, _ := spawnApp(t)

	// 1. hello query is public
	queryHello := `{"query": "query { hello }"}`
	respHello, err := http.Post(baseURL+"/graphql", "application/json", strings.NewReader(queryHello))
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, respHello.StatusCode)

	var helloBody map[string]interface{}
	_ = json.NewDecoder(respHello.Body).Decode(&helloBody)
	assert.Equal(t, "Hello from Sync Bridge", helloBody["data"].(map[string]interface{})["hello"].(string))

	// 2. employees query is public without header
	queryEmps := `{"query": "query { employees { id firstName } }"}`
	respEmps, err := http.Post(baseURL+"/graphql", "application/json", strings.NewReader(queryEmps))
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, respEmps.StatusCode)

	// 3. createEmployee mutation without header returns 401 Unauthorized
	queryCreate := `{
		"query": "mutation($data: CreateEmployeeInput!) { createEmployee(data: $data) { id firstName } }",
		"variables": {
			"data": {
				"id": 999,
				"employeeId": "E999",
				"firstName": "Jane",
				"lastName": "Doe",
				"email": "jane.doe@example.com"
			}
		}
	}`
	respCreate, err := http.Post(baseURL+"/graphql", "application/json", strings.NewReader(queryCreate))
	assert.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, respCreate.StatusCode)

	// 4. createEmployee mutation with correct header succeeds
	reqCreate2, _ := http.NewRequest("POST", baseURL+"/graphql", strings.NewReader(queryCreate))
	reqCreate2.Header.Set("Content-Type", "application/json")
	reqCreate2.Header.Set(AuthHeader, Token)
	respCreate2, err := http.DefaultClient.Do(reqCreate2)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, respCreate2.StatusCode)

	var createBody map[string]interface{}
	bodyBytes, _ := io.ReadAll(respCreate2.Body)
	_ = json.Unmarshal(bodyBytes, &createBody)

	// Print body on failure to debug if necessary
	if !assert.NotNil(t, createBody["data"]) {
		t.Logf("Response body: %s", string(bodyBytes))
	}

	createEmployee := createBody["data"].(map[string]interface{})["createEmployee"].(map[string]interface{})
	assert.Equal(t, float64(999), createEmployee["id"].(float64))
}
