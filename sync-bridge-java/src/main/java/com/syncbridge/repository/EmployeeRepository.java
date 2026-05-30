package com.syncbridge.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.syncbridge.entity.Employee;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    @Query("SELECT e FROM Employee e WHERE lower(e.firstName) LIKE lower(concat('%', :search, '%')) "
            + "OR lower(e.lastName) LIKE lower(concat('%', :search, '%')) "
            + "OR lower(e.email) LIKE lower(concat('%', :search, '%'))")
    Page<Employee> searchEmployees(@Param("search") String search, Pageable pageable);
}
