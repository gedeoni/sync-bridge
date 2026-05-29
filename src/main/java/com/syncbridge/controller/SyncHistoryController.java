package com.syncbridge.controller;

import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.syncbridge.entity.SyncHistory;
import com.syncbridge.entity.SyncStatus;
import com.syncbridge.exception.ApiException;
import com.syncbridge.repository.SyncHistoryRepository;
import com.syncbridge.util.ResponseUtil;

@RestController
@RequestMapping("/sync-history")
public class SyncHistoryController {
    private final SyncHistoryRepository repository;

    public SyncHistoryController(SyncHistoryRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> list(@RequestParam(required = false) Integer page,
                                                    @RequestParam(required = false) Integer size,
                                                    @RequestParam(required = false) String status) {
        int p = page != null && page > 0 ? page - 1 : 0;
        int s = size != null && size > 0 ? size : 15;
        Pageable pageable = PageRequest.of(p, s);

        Page<SyncHistory> data;
        if (status != null) {
            data = repository.findByStatus(SyncStatus.valueOf(status), pageable);
        } else {
            data = repository.findAll(pageable);
        }
        return ResponseUtil.ok("Sync histories retrieved successfully", data);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> get(@PathVariable Long id) {
        SyncHistory sh = repository.findById(id).orElseThrow(() -> new ApiException(404, "Sync history not found"));
        return ResponseUtil.ok("Sync history retrieved successfully", sh);
    }

    @PostMapping("/retry/{id}")
    public ResponseEntity<Map<String, Object>> retry(@PathVariable Long id) {
        SyncHistory sh = repository.findById(id).orElseThrow(() -> new ApiException(404, "Sync history not found"));
        if (sh.getStatus() != SyncStatus.FAILED) {
            throw new ApiException(400, "Only failed syncs can be retried");
        }
        sh.setStatus(SyncStatus.PENDING_RETRY);
        repository.save(sh);
        return ResponseUtil.ok("Sync history will be retried", sh);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Long id) {
        SyncHistory sh = repository.findById(id).orElseThrow(() -> new ApiException(404, "Sync history not found"));
        repository.delete(sh);
        return ResponseUtil.status(204, "Sync history deleted successfully", null);
    }
}

