package com.syncbridge.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.syncbridge.service.HealthService;
import com.syncbridge.util.ResponseUtil;

@RestController
@RequestMapping("/healthz")
public class StatusController {
    private final HealthService healthService;

    public StatusController(HealthService healthService) {
        this.healthService = healthService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> res = healthService.healthCheck();
        boolean ok = Boolean.TRUE.equals(res.get("read")) && Boolean.TRUE.equals(res.get("write"));
        int status = ok ? 200 : 503;
        return ResponseUtil.status(status, ok ? "Service is healthy" : "Service is unhealthy", res);
    }
}

