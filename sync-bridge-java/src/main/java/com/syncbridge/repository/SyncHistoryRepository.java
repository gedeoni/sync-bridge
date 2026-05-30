package com.syncbridge.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.syncbridge.entity.SyncHistory;
import com.syncbridge.entity.SyncStatus;

public interface SyncHistoryRepository extends JpaRepository<SyncHistory, Long> {
    Page<SyncHistory> findByStatus(SyncStatus status, Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT s.status, COUNT(s) FROM SyncHistory s GROUP BY s.status")
    java.util.List<Object[]> countByStatus();
}

