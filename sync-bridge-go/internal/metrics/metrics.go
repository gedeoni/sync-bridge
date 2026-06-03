package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	SyncDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name: "sync_operation_duration_seconds",
			Help: "Duration of sync operations in seconds",
		},
		[]string{"status", "model"},
	)

	SyncTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "sync_operation_total",
			Help: "Total number of sync operations",
		},
		[]string{"status", "model"},
	)

	SyncErrors = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "sync_operation_errors",
			Help: "Total number of sync errors",
		},
		[]string{"exception", "model"},
	)
)
