package com.syncbridge.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.syncbridge.entity.ApiResponse;
import com.syncbridge.service.SyncService;

@RestController
@RequestMapping("/sync")
public class SyncController {

    @Autowired
    private SyncService syncService;

    @PostMapping
    @SuppressWarnings("unchecked")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sync(@RequestBody Map<String, Object> payload) {
        String model = (String) payload.get("model");
        List<Map<String, Object>> data = (List<Map<String, Object>>) payload.get("data");

        Map<String, Object> result = syncService.sync(model, data);
        return ResponseEntity.ok(new ApiResponse<>(200, "Sync successful", result));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        Map<String, Object> stats = syncService.getStats();
        return ResponseEntity.ok(new ApiResponse<>(200, "Sync stats retrieved successfully", stats));
    }
}
