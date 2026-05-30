package com.syncbridge.controller;

import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.graphql.data.method.annotation.SubscriptionMapping;
import org.springframework.stereotype.Controller;

import com.syncbridge.entity.Employee;
import com.syncbridge.repository.EmployeeRepository;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

@Controller
public class EmployeeGraphqlController {

    private final EmployeeRepository employeeRepository;
    private final Sinks.Many<Employee> employeeCreatedSink = Sinks.many().multicast().onBackpressureBuffer();

    public EmployeeGraphqlController(EmployeeRepository employeeRepository) {
        this.employeeRepository = employeeRepository;
    }

    @QueryMapping
    public String hello() {
        return "Hello from Sync Bridge";
    }

    @QueryMapping
    public List<Employee> employees(@Argument int offset, @Argument int limit) {
        PageRequest pageRequest = toPageRequest(offset, limit);
        return employeeRepository.findAll(pageRequest).getContent();
    }

    @QueryMapping
    public Employee employee(@Argument Long id) {
        return employeeRepository.findById(id).orElse(null);
    }

    @QueryMapping
    public List<Employee> searchEmployees(@Argument String search, @Argument int offset, @Argument int limit) {
        PageRequest pageRequest = toPageRequest(offset, limit);
        return employeeRepository.searchEmployees(search, pageRequest).getContent();
    }

    @MutationMapping
    public Employee createEmployee(@Argument CreateEmployeeInput data) {
        Employee employee = new Employee();
        applyCreateInput(employee, data);
        Employee saved = employeeRepository.save(employee);
        employeeCreatedSink.tryEmitNext(saved);
        return saved;
    }

    @MutationMapping
    public Employee updateEmployee(@Argument Long id, @Argument UpdateEmployeeInput data) {
        return employeeRepository.findById(id)
                .map(existing -> {
                    applyUpdateInput(existing, data);
                    return employeeRepository.save(existing);
                })
                .orElse(null);
    }

    @MutationMapping
    public boolean deleteEmployee(@Argument Long id) {
        if (!employeeRepository.existsById(id)) {
            return false;
        }
        employeeRepository.deleteById(id);
        return true;
    }

    @SubscriptionMapping
    public Flux<Employee> employeeCreated() {
        return employeeCreatedSink.asFlux();
    }

    @SchemaMapping(typeName = "Employee", field = "fullName")
    public String fullName(Employee employee) {
        StringBuilder builder = new StringBuilder();
        if (employee.getFirstName() != null) {
            builder.append(employee.getFirstName());
        }
        if (employee.getMiddleName() != null && !employee.getMiddleName().isBlank()) {
            if (builder.length() > 0) {
                builder.append(" ");
            }
            builder.append(employee.getMiddleName());
        }
        if (employee.getLastName() != null) {
            if (builder.length() > 0) {
                builder.append(" ");
            }
            builder.append(employee.getLastName());
        }
        return builder.toString();
    }

    private PageRequest toPageRequest(int offset, int limit) {
        int safeLimit = limit > 0 ? limit : 10;
        int safeOffset = Math.max(offset, 0);
        int page = safeOffset / safeLimit;
        return PageRequest.of(page, safeLimit);
    }

    private void applyCreateInput(Employee employee, CreateEmployeeInput data) {
        employee.setId(data.id());
        employee.setEmployeeId(data.employeeId());
        employee.setFirstName(data.firstName());
        employee.setMiddleName(data.middleName());
        employee.setLastName(data.lastName());
        employee.setEmail(data.email());
        employee.setCompany(data.company());
        employee.setJobTitle(data.jobTitle());
    }

    private void applyUpdateInput(Employee employee, UpdateEmployeeInput data) {
        if (data.firstName() != null) {
            employee.setFirstName(data.firstName());
        }
        if (data.middleName() != null) {
            employee.setMiddleName(data.middleName());
        }
        if (data.lastName() != null) {
            employee.setLastName(data.lastName());
        }
        if (data.email() != null) {
            employee.setEmail(data.email());
        }
        if (data.company() != null) {
            employee.setCompany(data.company());
        }
        if (data.jobTitle() != null) {
            employee.setJobTitle(data.jobTitle());
        }
    }

    public record CreateEmployeeInput(Long id, String employeeId, String firstName, String lastName, String email,
            String middleName, String company, String jobTitle) {
    }

    public record UpdateEmployeeInput(String firstName, String lastName, String email, String middleName,
            String company, String jobTitle) {
    }
}
