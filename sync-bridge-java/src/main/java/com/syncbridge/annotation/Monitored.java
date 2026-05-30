package com.syncbridge.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Mark any method to auto-instrument with:
 * - Execution time (latency)
 * - Success/error counters
 * - Structured logging with requestId
 *
 * Usage:
 * @Monitored(name = "sync_operation", tags = {"model"})
 * public void sync(String model, List<Map> data) { ... }
 * The "tags" array specifies which parameter names to extract as metric tags.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Monitored {
    /**
     * Metric name prefix (e.g., "sync_operation", "history_create").
     * Full metric: {name}.duration and {name}.total counters.
     */
    String name();

    /**
     * Parameter names to extract as metric tags.
     * E.g., {"model", "status"} will extract those parameter values.
     */
    String[] tags() default {};
}
