package com.syncbridge.service;

import java.util.HashMap;
import java.util.Map;

import org.springframework.data.domain.Example;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.syncbridge.entity.Customer;
import com.syncbridge.repository.CustomerRepository;

@Service
public class HealthService {
    private final CustomerRepository customerRepository;

    public HealthService(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    @Transactional
    public Map<String, Object> healthCheck() {
        boolean readOk = false;
        boolean writeOk = false;

        try {
            customerRepository.findOne(Example.of(new Customer()));
            readOk = true;
        } catch (Exception ignored) {}

        try {
            Customer temp = new Customer();
            temp.setEmail("healthcheck@example.com");
            temp.setFirstName("Health");
            temp.setLastName("Check");
            temp = customerRepository.save(temp);
            customerRepository.delete(temp);
            writeOk = true;
        } catch (Exception ignored) {}

        Map<String, Object> res = new HashMap<>();
        res.put("read", readOk);
        res.put("write", writeOk);
        res.put("timestamp", java.time.Instant.now().toString());
        return res;
    }
}

