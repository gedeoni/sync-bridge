package com.syncbridge.dto;

import java.time.Instant;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class SyncDtos {

    public static class SyncRequest {
        @NotBlank
        @Pattern(regexp = "customers|products|orders|employees", message = "Invalid model")
        public String model;

        @NotNull
        @Size(min = 1)
        public List<Object> data;

        public String getModel() { return model; }
        public void setModel(String model) { this.model = model; }
        public List<Object> getData() { return data; }
        public void setData(List<Object> data) { this.data = data; }
    }

    public static class CustomerDto {
        public Long id;
        @NotBlank @Email public String email;
        @JsonProperty("first_name") @NotBlank public String firstName;
        @JsonProperty("last_name") @NotBlank public String lastName;
        @JsonProperty("default_currency") @Size(min=3,max=3) public String defaultCurrency;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getFirstName() { return firstName; }
        public void setFirstName(String firstName) { this.firstName = firstName; }
        public String getLastName() { return lastName; }
        public void setLastName(String lastName) { this.lastName = lastName; }
        public String getDefaultCurrency() { return defaultCurrency; }
        public void setDefaultCurrency(String defaultCurrency) { this.defaultCurrency = defaultCurrency; }
    }

    public static class ProductDto {
        public Long id;
        @NotBlank public String name;
        public String description;
        @NotNull public Integer price;
        @Size(min=3,max=3) public String currency;
        public Boolean active;
        @JsonProperty("weight_grams") public Integer weightGrams;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public Integer getPrice() { return price; }
        public void setPrice(Integer price) { this.price = price; }
        public String getCurrency() { return currency; }
        public void setCurrency(String currency) { this.currency = currency; }
        public Boolean getActive() { return active; }
        public void setActive(Boolean active) { this.active = active; }
        public Integer getWeightGrams() { return weightGrams; }
        public void setWeightGrams(Integer weightGrams) { this.weightGrams = weightGrams; }
    }

    public static class OrderItemDto {
        public Long id;
        @JsonProperty("product_id") @NotNull public Long productId;
        @NotNull public Integer qty;
        @JsonProperty("unit_price") @NotNull public Integer unitPrice;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }
        public Integer getQty() { return qty; }
        public void setQty(Integer qty) { this.qty = qty; }
        public Integer getUnitPrice() { return unitPrice; }
        public void setUnitPrice(Integer unitPrice) { this.unitPrice = unitPrice; }
    }

    public static class OrderDto {
        public Long id;
        @JsonProperty("order_number") @NotBlank public String orderNumber;
        @JsonProperty("customer_id") @NotNull public Long customerId;
        @NotBlank @Pattern(regexp = "pending|paid|shipped|completed|cancelled|refunded")
        public String status;
        @Size(min=3,max=3) public String currency;
        public Integer amount;
        public List<@Valid OrderItemDto> items;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getOrderNumber() { return orderNumber; }
        public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }
        public Long getCustomerId() { return customerId; }
        public void setCustomerId(Long customerId) { this.customerId = customerId; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public String getCurrency() { return currency; }
        public void setCurrency(String currency) { this.currency = currency; }
        public Integer getAmount() { return amount; }
        public void setAmount(Integer amount) { this.amount = amount; }
        public List<OrderItemDto> getItems() { return items; }
        public void setItems(List<OrderItemDto> items) { this.items = items; }
    }

    public static class EmployeeDto {
        @NotBlank public String id;
        @NotBlank public String employeeId;
        @NotBlank public String firstName;
        public String middleName;
        @NotBlank public String lastName;
        public String gender;
        @Email public String email;
        public String phoneNumber;
        public Instant dateOfBirth;
        public String nationality;
        public String jobLevel;
        public String department;
        public String location;
        public String bankAccountNumber;
        public String company;
        public String jobTitle;
        public String costCenter;
        public Instant startDate;
        public String employeeStatus;
        public String managerId;
        @Email public String managerEmail;
        public Instant lastModifiedOn;
        public Long lastModified;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getEmployeeId() { return employeeId; }
        public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }
        public String getFirstName() { return firstName; }
        public void setFirstName(String firstName) { this.firstName = firstName; }
        public String getMiddleName() { return middleName; }
        public void setMiddleName(String middleName) { this.middleName = middleName; }
        public String getLastName() { return lastName; }
        public void setLastName(String lastName) { this.lastName = lastName; }
        public String getGender() { return gender; }
        public void setGender(String gender) { this.gender = gender; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPhoneNumber() { return phoneNumber; }
        public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
        public Instant getDateOfBirth() { return dateOfBirth; }
        public void setDateOfBirth(Instant dateOfBirth) { this.dateOfBirth = dateOfBirth; }
        public String getNationality() { return nationality; }
        public void setNationality(String nationality) { this.nationality = nationality; }
        public String getJobLevel() { return jobLevel; }
        public void setJobLevel(String jobLevel) { this.jobLevel = jobLevel; }
        public String getDepartment() { return department; }
        public void setDepartment(String department) { this.department = department; }
        public String getLocation() { return location; }
        public void setLocation(String location) { this.location = location; }
        public String getBankAccountNumber() { return bankAccountNumber; }
        public void setBankAccountNumber(String bankAccountNumber) { this.bankAccountNumber = bankAccountNumber; }
        public String getCompany() { return company; }
        public void setCompany(String company) { this.company = company; }
        public String getJobTitle() { return jobTitle; }
        public void setJobTitle(String jobTitle) { this.jobTitle = jobTitle; }
        public String getCostCenter() { return costCenter; }
        public void setCostCenter(String costCenter) { this.costCenter = costCenter; }
        public Instant getStartDate() { return startDate; }
        public void setStartDate(Instant startDate) { this.startDate = startDate; }
        public String getEmployeeStatus() { return employeeStatus; }
        public void setEmployeeStatus(String employeeStatus) { this.employeeStatus = employeeStatus; }
        public String getManagerId() { return managerId; }
        public void setManagerId(String managerId) { this.managerId = managerId; }
        public String getManagerEmail() { return managerEmail; }
        public void setManagerEmail(String managerEmail) { this.managerEmail = managerEmail; }
        public Instant getLastModifiedOn() { return lastModifiedOn; }
        public void setLastModifiedOn(Instant lastModifiedOn) { this.lastModifiedOn = lastModifiedOn; }
        public Long getLastModified() { return lastModified; }
        public void setLastModified(Long lastModified) { this.lastModified = lastModified; }
    }
}

