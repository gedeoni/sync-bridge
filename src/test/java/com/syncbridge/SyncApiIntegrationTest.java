package com.syncbridge;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.syncbridge.repository.CustomerRepository;
import com.syncbridge.repository.SyncHistoryRepository;

/**
 * Integration tests: full Spring Boot context with in-memory H2.
 *
 * The DispatcherServlet is mounted at /api/v1 (spring.mvc.servlet.path).
 * Each MockMvc request must include .servletPath("/api/v1") so Spring
 * correctly resolves controller mappings (e.g. /healthz, /sync, etc.).
 *
 * Auth header: x-auth-token: test-token
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SyncApiIntegrationTest {

    private static final String AUTH         = "x-auth-token";
    private static final String TOKEN        = "test-token";
    /** Servlet path prefix; controllers map relative to this. */
    private static final String SP           = "/api/v1";

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired CustomerRepository customerRepository;
    @Autowired SyncHistoryRepository syncHistoryRepository;

    // =========================================================================
    // Auth
    // =========================================================================

    @Nested
    @DisplayName("Authentication")
    class AuthTests {

        @Test
        @DisplayName("GET /healthz is publicly accessible")
        void healthzIsPublic() throws Exception {
            mockMvc.perform(get(SP + "/healthz").servletPath(SP))
                   .andExpect(status().isOk());
        }

        @Test
        @DisplayName("POST /sync without token returns 401")
        void syncWithoutTokenReturns401() throws Exception {
            mockMvc.perform(post(SP + "/sync").servletPath(SP)
                           .contentType(MediaType.APPLICATION_JSON)
                           .content("{}"))
                   .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("POST /sync with wrong token returns 401")
        void syncWithWrongTokenReturns401() throws Exception {
            mockMvc.perform(post(SP + "/sync").servletPath(SP)
                           .header(AUTH, "wrong-token")
                           .contentType(MediaType.APPLICATION_JSON)
                           .content("{}"))
                   .andExpect(status().isUnauthorized());
        }
    }

    // =========================================================================
    // Customer sync
    // =========================================================================

    @Nested
    @DisplayName("POST /sync — customers")
    class CustomerSyncTests {

        @Test
        @DisplayName("creates a customer and returns status=created")
        void createsCustomer() throws Exception {
            String body = """
                    {
                      "model": "customers",
                      "data": [
                        { "email": "alice@example.com", "first_name": "Alice", "last_name": "Smith", "default_currency": "USD" }
                      ]
                    }
                    """;

            mockMvc.perform(post(SP + "/sync").servletPath(SP)
                           .header(AUTH, TOKEN)
                           .contentType(MediaType.APPLICATION_JSON)
                           .content(body))
                   .andExpect(status().isOk())
                   .andExpect(jsonPath("$.data.results[0].status").value("created"))
                   .andExpect(jsonPath("$.data.results[0].id").isNumber());

            assertThat(customerRepository.count()).isEqualTo(1);
        }

        @Test
        @DisplayName("syncing a duplicate email returns 409 Conflict")
        void duplicateEmailReturns409() throws Exception {
            String body = """
                    {
                      "model": "customers",
                      "data": [
                        { "email": "dup@example.com", "first_name": "Dup", "last_name": "User" }
                      ]
                    }
                    """;

            // First insert — should succeed
            mockMvc.perform(post(SP + "/sync").servletPath(SP)
                           .header(AUTH, TOKEN)
                           .contentType(MediaType.APPLICATION_JSON)
                           .content(body))
                   .andExpect(status().isOk());

            // Second insert with same email — should conflict
            mockMvc.perform(post(SP + "/sync").servletPath(SP)
                           .header(AUTH, TOKEN)
                           .contentType(MediaType.APPLICATION_JSON)
                           .content(body))
                   .andExpect(status().isConflict())
                   .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Duplicate entry")));
        }

        @Test
        @DisplayName("invalid model returns 500 (service throws IllegalArgumentException)")
        void invalidModelReturns500() throws Exception {
            String body = """
                    {
                      "model": "unicorns",
                      "data": [ {} ]
                    }
                    """;

            mockMvc.perform(post(SP + "/sync").servletPath(SP)
                           .header(AUTH, TOKEN)
                           .contentType(MediaType.APPLICATION_JSON)
                           .content(body))
                   .andExpect(status().isInternalServerError());
        }

        @Test
        @DisplayName("records a SUCCESSFUL sync history entry on success")
        void recordsSuccessfulSyncHistory() throws Exception {
            String body = """
                    {
                      "model": "customers",
                      "data": [
                        { "email": "history@example.com", "first_name": "H", "last_name": "Test" }
                      ]
                    }
                    """;

            mockMvc.perform(post(SP + "/sync").servletPath(SP)
                           .header(AUTH, TOKEN)
                           .contentType(MediaType.APPLICATION_JSON)
                           .content(body))
                   .andExpect(status().isOk());

            assertThat(syncHistoryRepository.findAll())
                    .anyMatch(sh -> sh.getStatus().getValue().equals("successful"));
        }
    }

    // =========================================================================
    // Product sync
    // =========================================================================

    @Nested
    @DisplayName("POST /sync — products")
    class ProductSyncTests {

        @Test
        @DisplayName("creates a product and returns status=created")
        void createsProduct() throws Exception {
            String body = """
                    {
                      "model": "products",
                      "data": [
                        { "name": "Widget", "price": 999, "currency": "USD" }
                      ]
                    }
                    """;

            mockMvc.perform(post(SP + "/sync").servletPath(SP)
                           .header(AUTH, TOKEN)
                           .contentType(MediaType.APPLICATION_JSON)
                           .content(body))
                   .andExpect(status().isOk())
                   .andExpect(jsonPath("$.data.results[0].status").value("created"));
        }
    }

    // =========================================================================
    // Order sync
    // =========================================================================

    @Nested
    @DisplayName("POST /sync — orders")
    class OrderSyncTests {

        /** Creates a customer via API and returns its generated ID. */
        private long createCustomer(String email) throws Exception {
            String body = String.format("""
                    {"model":"customers","data":[
                      {"email":"%s","first_name":"Test","last_name":"Customer"}
                    ]}
                    """, email);
            MvcResult res = mockMvc.perform(post(SP + "/sync").servletPath(SP)
                                   .header(AUTH, TOKEN)
                                   .contentType(MediaType.APPLICATION_JSON)
                                   .content(body))
                           .andExpect(status().isOk())
                           .andReturn();
            return objectMapper.readTree(res.getResponse().getContentAsString())
                               .at("/data/results/0/id").asLong();
        }

        @Test
        @DisplayName("returns 400 when order has no items and no amount")
        void orderWithNoItemsNoAmountFails() throws Exception {
            long custId = createCustomer("orderfail@example.com");
            String body = String.format("""
                    {
                      "model": "orders",
                      "data": [
                        { "order_number": "ORD-NOOP-001", "customer_id": %d, "status": "pending" }
                      ]
                    }
                    """, custId);

            // ApiException(400) is thrown by the mapper and handled as a 400 Bad Request
            mockMvc.perform(post(SP + "/sync").servletPath(SP)
                           .header(AUTH, TOKEN)
                           .contentType(MediaType.APPLICATION_JSON)
                           .content(body))
                   .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("creates order with explicit amount when no items provided")
        void createsOrderWithExplicitAmount() throws Exception {
            long custId = createCustomer("orderok@example.com");
            String orderNum = "ORD-" + java.util.UUID.randomUUID().toString().substring(0, 8);
            String body = String.format("""
                    {
                      "model": "orders",
                      "data": [
                        { "order_number": "%s", "customer_id": %d, "status": "pending", "amount": 1500 }
                      ]
                    }
                    """, orderNum, custId);

            mockMvc.perform(post(SP + "/sync").servletPath(SP)
                           .header(AUTH, TOKEN)
                           .contentType(MediaType.APPLICATION_JSON)
                           .content(body))
                   .andExpect(status().isOk())
                   .andExpect(jsonPath("$.data.results[0].status").value("created"));
        }
    }


    // =========================================================================
    // Sync stats
    // =========================================================================

    @Nested
    @DisplayName("GET /sync/stats")
    class SyncStatsTests {

        @Test
        @DisplayName("returns stats with a total field")
        void returnsStats() throws Exception {
            mockMvc.perform(get(SP + "/sync/stats").servletPath(SP)
                           .header(AUTH, TOKEN))
                   .andExpect(status().isOk())
                   .andExpect(jsonPath("$.data.total").isNumber());
        }

        @Test
        @DisplayName("total increments after a successful sync")
        void totalIncrementsAfterSync() throws Exception {
            // Baseline total
            MvcResult before = mockMvc.perform(get(SP + "/sync/stats").servletPath(SP)
                                              .header(AUTH, TOKEN))
                                      .andReturn();
            int totalBefore = objectMapper.readTree(before.getResponse().getContentAsString())
                                          .at("/data/total").asInt();

            // Perform a sync
            mockMvc.perform(post(SP + "/sync").servletPath(SP)
                           .header(AUTH, TOKEN)
                           .contentType(MediaType.APPLICATION_JSON)
                           .content("""
                                   {"model":"customers","data":[
                                     {"email":"stats@example.com","first_name":"S","last_name":"T"}
                                   ]}
                                   """))
                   .andExpect(status().isOk());

            MvcResult after = mockMvc.perform(get(SP + "/sync/stats").servletPath(SP)
                                             .header(AUTH, TOKEN))
                                     .andReturn();
            int totalAfter = objectMapper.readTree(after.getResponse().getContentAsString())
                                         .at("/data/total").asInt();

            assertThat(totalAfter).isGreaterThan(totalBefore);
        }
    }

    // =========================================================================
    // Sync history
    // =========================================================================

    @Nested
    @DisplayName("GET /sync-history")
    class SyncHistoryTests {

        @Test
        @DisplayName("returns paginated sync history")
        void returnsPaginatedHistory() throws Exception {
            mockMvc.perform(get(SP + "/sync-history").servletPath(SP)
                           .header(AUTH, TOKEN))
                   .andExpect(status().isOk())
                   .andExpect(jsonPath("$.data").exists());
        }

        @Test
        @DisplayName("GET /sync-history/{id} returns 404 for unknown id")
        void unknownIdReturns404() throws Exception {
            mockMvc.perform(get(SP + "/sync-history/99999").servletPath(SP)
                           .header(AUTH, TOKEN))
                   .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("DELETE /sync-history/{id} removes the record")
        void deletesRecord() throws Exception {
            // Create a record via sync
            mockMvc.perform(post(SP + "/sync").servletPath(SP)
                           .header(AUTH, TOKEN)
                           .contentType(MediaType.APPLICATION_JSON)
                           .content("""
                                   {"model":"customers","data":[
                                     {"email":"del@example.com","first_name":"D","last_name":"E"}
                                   ]}
                                   """))
                   .andExpect(status().isOk());

            long id = syncHistoryRepository.findAll().get(0).getId();

            mockMvc.perform(delete(SP + "/sync-history/" + id).servletPath(SP)
                           .header(AUTH, TOKEN))
                   .andExpect(status().isNoContent());

            assertThat(syncHistoryRepository.findById(id)).isEmpty();
        }
    }
}
