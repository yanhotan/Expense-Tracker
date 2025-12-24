package com.expensetracker.service;

import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * Service demonstrating various Redis operations for caching and data storage.
 * Shows how to use RedisTemplate for direct Redis access beyond Spring Cache.
 * Only enabled when RedisTemplate bean is available.
 */
@Service
@ConditionalOnBean(name = "redisTemplate")
public class RedisService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final ValueOperations<String, Object> valueOps;

    public RedisService(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
        this.valueOps = redisTemplate.opsForValue();
    }

    /**
     * Store simple key-value data with expiration
     */
    public void cacheUserSession(String sessionId, String userData) {
        valueOps.set("session:" + sessionId, userData, Duration.ofHours(24));
    }

    /**
     * Retrieve cached session data
     */
    public String getUserSession(String sessionId) {
        return (String) valueOps.get("session:" + sessionId);
    }

    /**
     * Cache API response data
     */
    public void cacheApiResponse(String endpoint, String response, int ttlMinutes) {
        valueOps.set("api:" + endpoint, response, Duration.ofMinutes(ttlMinutes));
    }

    /**
     * Get cached API response
     */
    public String getCachedApiResponse(String endpoint) {
        return (String) valueOps.get("api:" + endpoint);
    }

    /**
     * Store analytics data (like expense totals)
     */
    public void storeAnalyticsData(String key, Object data) {
        valueOps.set("analytics:" + key, data, Duration.ofHours(1));
    }

    /**
     * Get analytics data
     */
    public Object getAnalyticsData(String key) {
        return valueOps.get("analytics:" + key);
    }

    /**
     * Increment counters (like API call counts)
     */
    public Long incrementApiCallCount(String endpoint) {
        return redisTemplate.opsForValue().increment("counter:api:" + endpoint);
    }

    /**
     * Store temporary data with TTL
     */
    public void storeTemporaryData(String key, Object data, long ttlSeconds) {
        valueOps.set("temp:" + key, data, Duration.ofSeconds(ttlSeconds));
    }

    /**
     * Delete cached data
     */
    public void invalidateCache(String pattern) {
        Set<String> keys = redisTemplate.keys(pattern);
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
    }

    /**
     * Check if key exists
     */
    public boolean exists(String key) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }

    /**
     * Set expiration on existing key
     */
    public void expire(String key, long ttlSeconds) {
        redisTemplate.expire(key, ttlSeconds, TimeUnit.SECONDS);
    }
}
