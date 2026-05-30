package com.syncbridge.aspect;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.syncbridge.annotation.Monitored;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tags;
import io.micrometer.core.instrument.Timer;

/**
 * Generic instrumentation aspect for any method marked with @Monitored.
 * Automatically captures latency, error rates, and structured logs.
 *
 * Example:
 * @Monitored(name = "sync_op", tags = {"model"})
 * public void sync(String model, List<Map> data) { ... }
 *
 * Generates metrics:
 * - sync_op.duration (latency with percentiles)
 * - sync_op.total (throughput counter with status tag)
 * - sync_op.errors (error counter with exception type)
 */
@Aspect
@Component
public class SyncAspect {

    private static final Logger logger = LoggerFactory.getLogger(SyncAspect.class);

    @Autowired
    private MeterRegistry meterRegistry;

    @Around("@annotation(monitored)")
    public Object monitoredMethodMetrics(ProceedingJoinPoint joinPoint, Monitored monitored) throws Throwable {
        String requestId = UUID.randomUUID().toString();
        MDC.put("requestId", requestId);

        // Extract method name and metric name
        String metricName = monitored.name();
        String methodName = joinPoint.getSignature().getName();

        // Extract tags from method parameters (defensive: parameter names may be unavailable)
        Map<String, String> tagMap = extractTags(joinPoint, monitored.tags());
        Tags tags = tagMap.isEmpty() ? Tags.empty() : Tags.of(convertMapToArray(tagMap));

        Timer.Sample sample = Timer.start(meterRegistry);

        try {
            logger.info("Operation started: method={}, metricName={}, tags={}", methodName, metricName, tagMap);
            Object result = joinPoint.proceed();

            // Record latency
            Timer successTimer = Timer.builder(metricName + ".duration")
                    .tags(tags.and("status", "success"))
                    .publishPercentiles(0.5, 0.95, 0.99)
                    .register(meterRegistry);
            sample.stop(successTimer);

            // Record throughput counter
            Counter.builder(metricName + ".total")
                    .tags(tags.and("status", "success"))
                    .register(meterRegistry)
                    .increment();

            logger.info("Operation completed successfully: method={}, tags={}", methodName, tagMap);

            return result;
        } catch (Exception ex) {
            // Record latency with error
            Timer errorTimer = Timer.builder(metricName + ".duration")
                    .tags(tags.and("status", "error").and("exception", ex.getClass().getSimpleName()))
                    .publishPercentiles(0.5, 0.95, 0.99)
                    .register(meterRegistry);
            sample.stop(errorTimer);

            // Record error counters
            Counter.builder(metricName + ".total")
                    .tags(tags.and("status", "error"))
                    .register(meterRegistry)
                    .increment();

            Counter.builder(metricName + ".errors")
                    .tags(tags.and("exception", ex.getClass().getSimpleName()))
                    .register(meterRegistry)
                    .increment();

            logger.error("Operation failed: method={}, tags={}, error={}", methodName, tagMap, ex.getMessage(), ex);
            throw ex;
        } finally {
            MDC.clear();
        }
    }

    /**
     * Extract parameter values as metric tags.
     * E.g., tags = {"model"}, finds the parameter named "model" and extracts its value.
     */
    private Map<String, String> extractTags(ProceedingJoinPoint joinPoint, String[] tagNames) {
        Map<String, String> result = new HashMap<>();

        if (tagNames == null || tagNames.length == 0) {
            return result;
        }

        MethodSignature sig = (MethodSignature) joinPoint.getSignature();
        String[] paramNames = sig.getParameterNames();
        Object[] paramValues = joinPoint.getArgs();

        if (paramNames == null || paramNames.length == 0) {
            // Parameter names unavailable at runtime (compiled without -parameters), skip extraction
            return result;
        }

        for (String tagName : tagNames) {
            for (int i = 0; i < paramNames.length; i++) {
                if (tagName.equals(paramNames[i]) && i < paramValues.length) {
                    Object val = paramValues[i];
                    result.put(tagName, val == null ? "null" : String.valueOf(val));
                    break;
                }
            }
        }

        return result;
    }

    /**
     * Convert Map<String, String> to String[] for Tags.
     * Expected format: ["key1", "value1", "key2", "value2", ...]
     */
    private String[] convertMapToArray(Map<String, String> map) {
        String[] result = new String[map.size() * 2];
        int idx = 0;
        for (Map.Entry<String, String> entry : map.entrySet()) {
            result[idx++] = entry.getKey();
            result[idx++] = entry.getValue();
        }
        return result;
    }
}

