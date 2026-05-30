package com.syncbridge.util;

import org.springframework.http.ResponseEntity;

import java.util.HashMap;
import java.util.Map;

public class ResponseUtil {
    public static ResponseEntity<Map<String, Object>> ok(String message, Object data) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", 200);
        body.put("message", message);
        if (data != null) body.put("data", data);
        return ResponseEntity.ok(body);
    }

    public static ResponseEntity<Map<String, Object>> status(int status, String message, Object data) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", status);
        body.put("message", message);
        if (data != null) body.put("data", data);
        return ResponseEntity.status(status).body(body);
    }
}

