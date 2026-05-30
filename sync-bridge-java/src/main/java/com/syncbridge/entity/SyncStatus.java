package com.syncbridge.entity;


public enum SyncStatus {
    SUCCESSFUL("successful"),
    FAILED("failed"),
    INVALID("invalid"),
    PENDING_RETRY("pending_retry");

    private final String value;

    SyncStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
