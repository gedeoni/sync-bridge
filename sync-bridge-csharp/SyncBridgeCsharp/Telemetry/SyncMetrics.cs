using Prometheus;

namespace SyncBridgeCsharp.Telemetry;

public static class SyncMetrics
{
    public static readonly Counter SyncTotal = Metrics.CreateCounter(
        "sync_total",
        "Total count of synchronization actions attempted."
    );

    public static readonly Counter SyncErrors = Metrics.CreateCounter(
        "sync_errors",
        "Categorized counter tracking error events.",
        new CounterConfiguration
        {
            LabelNames = new[] { "exception", "model" }
        }
    );

    public static readonly Histogram SyncDurationSeconds = Metrics.CreateHistogram(
        "sync_duration_seconds",
        "Histogram measuring individual model synchronization run times.",
        new HistogramConfiguration
        {
            LabelNames = new[] { "status", "model" }
        }
    );
}
