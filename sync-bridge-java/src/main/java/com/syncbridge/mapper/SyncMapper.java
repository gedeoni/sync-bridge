package com.syncbridge.mapper;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.syncbridge.dto.SyncDtos;
import com.syncbridge.entity.Customer;
import com.syncbridge.entity.Employee;
import com.syncbridge.entity.Order;
import com.syncbridge.entity.OrderItem;
import com.syncbridge.entity.Product;
import com.syncbridge.exception.ApiException;

@Component
public class SyncMapper {

    public Customer mapCustomer(SyncDtos.CustomerDto d) {
        Customer c = new Customer();
        if (d.getId() != null) c.setId(d.getId());
        c.setEmail(d.getEmail());
        c.setFirstName(d.getFirstName());
        c.setLastName(d.getLastName());
        c.setDefaultCurrency(d.getDefaultCurrency() == null ? "USD" : d.getDefaultCurrency());
        return c;
    }

    public Product mapProduct(SyncDtos.ProductDto d) {
        Product p = new Product();
        if (d.getId() != null) p.setId(d.getId());
        p.setName(d.getName());
        p.setDescription(d.getDescription());
        p.setPrice(d.getPrice());
        p.setCurrency(d.getCurrency() == null ? "USD" : d.getCurrency());
        Boolean active = d.getActive();
        p.setActive(active == null ? Boolean.TRUE : active);
        p.setWeightGrams(d.getWeightGrams());
        return p;
    }

    public Order mapOrder(SyncDtos.OrderDto d) {
        Order o = new Order();
        if (d.getId() != null) o.setId(d.getId());
        o.setOrderNumber(d.getOrderNumber());
        if (d.getCustomerId() != null) {
            Customer c = new Customer();
            c.setId(d.getCustomerId());
            o.setCustomer(c);
        }
        o.setStatus(d.getStatus());
        o.setCurrency(d.getCurrency() == null ? "USD" : d.getCurrency());
        // If amount not provided, compute from items (qty * unitPrice)
        if (d.getItems() != null && !d.getItems().isEmpty()) {
            // validate items have qty and unitPrice
            if (d.getItems().stream().anyMatch(it -> it.getQty() == null || it.getUnitPrice() == null)) {
                throw new ApiException(400, "Order items must include non-null qty and unit_price");
            }
            int calc = d.getItems().stream()
                .mapToInt(it -> it.getQty() * it.getUnitPrice())
                .sum();
            if (d.getAmount() == null) {
                o.setAmount(calc);
            } else if (!d.getAmount().equals(calc)) {
                throw new ApiException(400, "Order amount must equal the sum of item prices (qty * unit_price). Calculated=" + calc + " provided=" + d.getAmount());
            } else {
                o.setAmount(d.getAmount());
            }
        } else {
            // no items provided; require amount to be present
            if (d.getAmount() == null) {
                throw new ApiException(400, "Order must include items or an amount");
            }
            o.setAmount(d.getAmount());
        }
        if (d.getItems() != null) {
            List<OrderItem> items = d.getItems().stream().map(it -> {
                OrderItem oi = new OrderItem();
                if (it.getId() != null) oi.setId(it.getId());
                if (it.getProductId() != null) {
                    Product p = new Product();
                    p.setId(it.getProductId());
                    oi.setProduct(p);
                }
                oi.setQty(it.getQty());
                oi.setUnitPrice(it.getUnitPrice());
                oi.setOrder(o);
                return oi;
            }).collect(Collectors.toList());
            o.setItems(items);
        }
        return o;
    }

    public Employee mapEmployee(SyncDtos.EmployeeDto d) {
        Employee e = new Employee();
        try {
            if (d.getId() != null) e.setId(Long.valueOf(d.getId()));
        } catch (NumberFormatException ignored) {}
        e.setEmployeeId(d.getEmployeeId());
        e.setFirstName(d.getFirstName());
        e.setMiddleName(d.getMiddleName());
        e.setLastName(d.getLastName());
        e.setGender(d.getGender());
        e.setEmail(d.getEmail());
        e.setPhoneNumber(d.getPhoneNumber());
        e.setDateOfBirth(d.getDateOfBirth());
        e.setNationality(d.getNationality());
        e.setJobLevel(d.getJobLevel());
        e.setDepartment(d.getDepartment());
        e.setLocation(d.getLocation());
        e.setBankAccountNumber(d.getBankAccountNumber());
        e.setCompany(d.getCompany());
        e.setJobTitle(d.getJobTitle());
        e.setCostCenter(d.getCostCenter());
        e.setStartDate(d.getStartDate());
        e.setEmployeeStatus(d.getEmployeeStatus());
        e.setManagerId(d.getManagerId());
        e.setManagerEmail(d.getManagerEmail());
        e.setLastModifiedOn(d.getLastModifiedOn());
        e.setLastModified(d.getLastModified());
        return e;
    }
}
