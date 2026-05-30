package com.syncbridge.exception;

import java.util.HashMap;
import java.util.Map;

import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, Object> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(err -> {
            String field = ((FieldError) err).getField();
            String message = err.getDefaultMessage();
            errors.put(field, message);
        });
        Map<String, Object> body = new HashMap<>();
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("message", "Validation failed");
        body.put("errors", errors);
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleHibernateConstraint(ConstraintViolationException ex) {
        String fields = extractViolatedFields(ex.getMessage());
        Map<String, Object> body = new HashMap<>();
        body.put("status", HttpStatus.CONFLICT.value());
        body.put("message", "Duplicate entry: field " + fields + " already exists");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        Throwable specificCause = ex.getMostSpecificCause();
        String msg = specificCause != null && specificCause.getMessage() != null ? specificCause.getMessage() : ex.getMessage();
        String fields = extractViolatedFields(msg);
        Map<String, Object> body = new HashMap<>();
        body.put("status", HttpStatus.CONFLICT.value());
        body.put("message", "Duplicate entry: field " + fields + " already exists");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> handleApi(ApiException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", ex.getStatus());
        body.put("message", ex.getMessage());
        return ResponseEntity.status(ex.getStatus()).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        body.put("message", "Internal Server Error");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }

    /**
     * Extract field names from H2 constraint violation message.
     * Example input: "Unique index or primary key violation: ... ON PUBLIC.CUSTOMERS(EMAIL NULLS FIRST) VALUES ..."
     * Extracts: "EMAIL"
     */
    private String extractViolatedFields(String message) {
        if (message == null) return "unknown";

        // Try to extract field names from pattern: ON TABLE(FIELD...)
        int startIdx = message.indexOf('(');
        int endIdx = message.indexOf(')', startIdx);

        if (startIdx != -1 && endIdx != -1) {
            String fields = message.substring(startIdx + 1, endIdx);
            // Remove NULLS FIRST/LAST annotations
            fields = fields.replaceAll("\\s+(NULLS\\s+(FIRST|LAST))", "").trim();
            return "'" + fields + "'";
        }

        return "unknown";
    }
}

