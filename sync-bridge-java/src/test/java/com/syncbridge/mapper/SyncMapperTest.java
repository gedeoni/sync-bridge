package com.syncbridge.mapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import com.syncbridge.dto.SyncDtos;
import com.syncbridge.entity.Customer;
import com.syncbridge.entity.Order;
import com.syncbridge.entity.Product;
import com.syncbridge.exception.ApiException;

/**
 * Pure unit tests for SyncMapper — no Spring context needed.
 */
class SyncMapperTest {

    private SyncMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new SyncMapper();
    }

    // -------------------------------------------------------------------------
    // Customer mapping
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("mapCustomer")
    class MapCustomer {

        @Test
        @DisplayName("maps all fields correctly")
        void mapsAllFields() {
            SyncDtos.CustomerDto dto = new SyncDtos.CustomerDto();
            dto.setId(42L);
            dto.setEmail("alice@example.com");
            dto.setFirstName("Alice");
            dto.setLastName("Smith");
            dto.setDefaultCurrency("EUR");

            Customer customer = mapper.mapCustomer(dto);

            assertThat(customer.getId()).isEqualTo(42L);
            assertThat(customer.getEmail()).isEqualTo("alice@example.com");
            assertThat(customer.getFirstName()).isEqualTo("Alice");
            assertThat(customer.getLastName()).isEqualTo("Smith");
            assertThat(customer.getDefaultCurrency()).isEqualTo("EUR");
        }

        @Test
        @DisplayName("defaults currency to USD when not provided")
        void defaultsCurrencyToUsd() {
            SyncDtos.CustomerDto dto = new SyncDtos.CustomerDto();
            dto.setEmail("bob@example.com");
            dto.setFirstName("Bob");
            dto.setLastName("Jones");
            // defaultCurrency intentionally left null

            Customer customer = mapper.mapCustomer(dto);

            assertThat(customer.getDefaultCurrency()).isEqualTo("USD");
        }

        @Test
        @DisplayName("omits id when dto id is null")
        void omitsIdWhenNull() {
            SyncDtos.CustomerDto dto = new SyncDtos.CustomerDto();
            dto.setEmail("no-id@example.com");
            dto.setFirstName("No");
            dto.setLastName("Id");

            Customer customer = mapper.mapCustomer(dto);

            assertThat(customer.getId()).isNull();
        }
    }

    // -------------------------------------------------------------------------
    // Product mapping
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("mapProduct")
    class MapProduct {

        @Test
        @DisplayName("maps all fields correctly")
        void mapsAllFields() {
            SyncDtos.ProductDto dto = new SyncDtos.ProductDto();
            dto.setId(7L);
            dto.setName("Widget");
            dto.setDescription("A small widget");
            dto.setPrice(999);
            dto.setCurrency("GBP");
            dto.setActive(false);
            dto.setWeightGrams(250);

            Product product = mapper.mapProduct(dto);

            assertThat(product.getId()).isEqualTo(7L);
            assertThat(product.getName()).isEqualTo("Widget");
            assertThat(product.getDescription()).isEqualTo("A small widget");
            assertThat(product.getPrice()).isEqualTo(999);
            assertThat(product.getCurrency()).isEqualTo("GBP");
            assertThat(product.getActive()).isFalse();
            assertThat(product.getWeightGrams()).isEqualTo(250);
        }

        @Test
        @DisplayName("defaults currency to USD when not provided")
        void defaultsCurrencyToUsd() {
            SyncDtos.ProductDto dto = new SyncDtos.ProductDto();
            dto.setName("Gadget");
            dto.setPrice(100);

            Product product = mapper.mapProduct(dto);

            assertThat(product.getCurrency()).isEqualTo("USD");
        }

        @Test
        @DisplayName("defaults active to true when not provided")
        void defaultsActiveToTrue() {
            SyncDtos.ProductDto dto = new SyncDtos.ProductDto();
            dto.setName("Thing");
            dto.setPrice(50);

            Product product = mapper.mapProduct(dto);

            assertThat(product.getActive()).isTrue();
        }
    }

    // -------------------------------------------------------------------------
    // Order mapping
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("mapOrder")
    class MapOrder {

        @Test
        @DisplayName("calculates amount from items when amount is absent")
        void calculatesAmountFromItems() {
            SyncDtos.OrderDto dto = buildOrderDtoWithItems(null);

            Order order = mapper.mapOrder(dto);

            // 2 * 500 + 1 * 300 = 1300
            assertThat(order.getAmount()).isEqualTo(1300);
            assertThat(order.getItems()).hasSize(2);
        }

        @Test
        @DisplayName("accepts provided amount when it matches computed total")
        void acceptsMatchingAmount() {
            SyncDtos.OrderDto dto = buildOrderDtoWithItems(1300);

            Order order = mapper.mapOrder(dto);

            assertThat(order.getAmount()).isEqualTo(1300);
        }

        @Test
        @DisplayName("throws ApiException when provided amount mismatches computed total")
        void throwsWhenAmountMismatch() {
            SyncDtos.OrderDto dto = buildOrderDtoWithItems(999);

            assertThatThrownBy(() -> mapper.mapOrder(dto))
                    .isInstanceOf(ApiException.class)
                    .hasMessageContaining("Calculated=1300");
        }

        @Test
        @DisplayName("throws ApiException when no items and no amount")
        void throwsWhenNoItemsAndNoAmount() {
            SyncDtos.OrderDto dto = new SyncDtos.OrderDto();
            dto.setOrderNumber("ORD-001");
            dto.setCustomerId(1L);
            dto.setStatus("pending");
            // no items, no amount

            assertThatThrownBy(() -> mapper.mapOrder(dto))
                    .isInstanceOf(ApiException.class)
                    .hasMessageContaining("items or an amount");
        }

        @Test
        @DisplayName("throws ApiException when order item is missing qty")
        void throwsWhenItemMissingQty() {
            SyncDtos.OrderItemDto item = new SyncDtos.OrderItemDto();
            item.setProductId(1L);
            // qty intentionally missing
            item.setUnitPrice(500);

            SyncDtos.OrderDto dto = new SyncDtos.OrderDto();
            dto.setOrderNumber("ORD-002");
            dto.setCustomerId(1L);
            dto.setStatus("pending");
            dto.setItems(List.of(item));

            assertThatThrownBy(() -> mapper.mapOrder(dto))
                    .isInstanceOf(ApiException.class)
                    .hasMessageContaining("qty");
        }

        @Test
        @DisplayName("defaults currency to USD when not provided")
        void defaultsCurrencyToUsd() {
            SyncDtos.OrderDto dto = new SyncDtos.OrderDto();
            dto.setOrderNumber("ORD-003");
            dto.setCustomerId(1L);
            dto.setStatus("pending");
            dto.setAmount(500);

            Order order = mapper.mapOrder(dto);

            assertThat(order.getCurrency()).isEqualTo("USD");
        }

        /** Helper: order with two items totalling 1300 */
        private SyncDtos.OrderDto buildOrderDtoWithItems(Integer amount) {
            SyncDtos.OrderItemDto item1 = new SyncDtos.OrderItemDto();
            item1.setProductId(1L);
            item1.setQty(2);
            item1.setUnitPrice(500);

            SyncDtos.OrderItemDto item2 = new SyncDtos.OrderItemDto();
            item2.setProductId(2L);
            item2.setQty(1);
            item2.setUnitPrice(300);

            SyncDtos.OrderDto dto = new SyncDtos.OrderDto();
            dto.setOrderNumber("ORD-TEST");
            dto.setCustomerId(10L);
            dto.setStatus("pending");
            dto.setAmount(amount);
            dto.setItems(List.of(item1, item2));
            return dto;
        }
    }
}
