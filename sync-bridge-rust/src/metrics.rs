// src/metrics.rs
use lazy_static::lazy_static;
use prometheus::{
    register_counter_vec_with_registry, register_histogram_vec_with_registry, CounterVec, Encoder,
    HistogramVec, Registry, TextEncoder,
};

lazy_static! {
    pub static ref REGISTRY: Registry = Registry::new();
    pub static ref SYNC_DURATION: HistogramVec = register_histogram_vec_with_registry!(
        "sync_operation_duration_seconds",
        "Duration of sync operations in seconds",
        &["status", "model"],
        REGISTRY
    )
    .unwrap();
    pub static ref SYNC_TOTAL: CounterVec = register_counter_vec_with_registry!(
        "sync_operation_total",
        "Total number of sync operations",
        &["status", "model"],
        REGISTRY
    )
    .unwrap();
    pub static ref SYNC_ERRORS: CounterVec = register_counter_vec_with_registry!(
        "sync_operation_errors",
        "Total number of sync errors",
        &["exception", "model"],
        REGISTRY
    )
    .unwrap();
}

pub fn get_metrics_text() -> String {
    let mut buffer = Vec::new();
    let encoder = TextEncoder::new();
    let metric_families = REGISTRY.gather();
    if let Err(e) = encoder.encode(&metric_families, &mut buffer) {
        tracing::error!("Failed to encode prometheus metrics: {}", e);
    }
    String::from_utf8(buffer).unwrap_or_default()
}
