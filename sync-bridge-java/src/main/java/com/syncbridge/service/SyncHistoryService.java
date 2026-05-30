package com.syncbridge.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.syncbridge.entity.SyncHistory;
import com.syncbridge.entity.SyncStatus;
import com.syncbridge.repository.SyncHistoryRepository;

@Service
public class SyncHistoryService {

    @Autowired
    private SyncHistoryRepository repository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public SyncHistory createPending(String payload) {
        SyncHistory sh = new SyncHistory();
        sh.setPayload(payload);
        sh.setStatus(SyncStatus.PENDING_RETRY);
        return repository.save(sh);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markSuccess(Long id) {
        repository.findById(id).ifPresent(sh -> {
            sh.setStatus(SyncStatus.SUCCESSFUL);
            repository.save(sh);
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(Long id, String reason) {
        repository.findById(id).ifPresentOrElse(sh -> {
            sh.setStatus(SyncStatus.FAILED);
            sh.setFailureReason(truncate(reason));
            repository.save(sh);
        }, () -> {
            System.out.println("DEBUG: markFailed DID NOT find SyncHistory with ID=" + id);
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markInvalid(Long id, String reason) {
        repository.findById(id).ifPresent(sh -> {
            sh.setStatus(SyncStatus.INVALID);
            sh.setFailureReason(truncate(reason));
            repository.save(sh);
        });
    }

    private String truncate(String val) {
        if (val == null) return null;
        return val.length() > 255 ? val.substring(0, 255) : val;
    }
}
