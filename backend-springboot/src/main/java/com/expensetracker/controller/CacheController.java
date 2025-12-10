package com.expensetracker.controller;

import com.expensetracker.service.RedisService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Example controller showing how to use Redis for caching in your application.
 * This demonstrates various Redis operations for different use cases.
 */
@RestController
@RequestMapping("/api/cache")
public class CacheController {

    private final RedisService redisService;

    public CacheController(RedisService redisService) {
        this.redisService = redisService;
    }

    /**
     * Example: Cache user session data
     */
    @PostMapping("/session/{sessionId}")
    public ResponseEntity<String> cacheSession(
            @PathVariable String sessionId,
            @RequestBody String userData) {
        redisService.cacheUserSession(sessionId, userData);
        return ResponseEntity.ok("Session cached");
    }

    /**
     * Example: Get cached session data
     */
    @GetMapping("/session/{sessionId}")
    public ResponseEntity<String> getSession(@PathVariable String sessionId) {
        String sessionData = redisService.getUserSession(sessionId);
        if (sessionData != null) {
            return ResponseEntity.ok(sessionData);
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * Example: Cache API response (like expensive calculations)
     */
    @PostMapping("/api-response")
    public ResponseEntity<String> cacheApiResponse(
            @RequestParam String endpoint,
            @RequestBody String response,
            @RequestParam(defaultValue = "30") int ttlMinutes) {
        redisService.cacheApiResponse(endpoint, response, ttlMinutes);
        return ResponseEntity.ok("API response cached for " + ttlMinutes + " minutes");
    }

    /**
     * Example: Get cached API response
     */
    @GetMapping("/api-response")
    public ResponseEntity<String> getCachedApiResponse(@RequestParam String endpoint) {
        String cachedResponse = redisService.getCachedApiResponse(endpoint);
        if (cachedResponse != null) {
            return ResponseEntity.ok(cachedResponse);
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * Example: Store analytics data (like expense totals)
     */
    @PostMapping("/analytics")
    public ResponseEntity<String> storeAnalytics(
            @RequestParam String key,
            @RequestBody Object data) {
        redisService.storeAnalyticsData(key, data);
        return ResponseEntity.ok("Analytics data stored");
    }

    /**
     * Example: Get analytics data
     */
    @GetMapping("/analytics/{key}")
    public ResponseEntity<Object> getAnalytics(@PathVariable String key) {
        Object data = redisService.getAnalyticsData(key);
        if (data != null) {
            return ResponseEntity.ok(data);
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * Example: Increment API call counter
     */
    @PostMapping("/counter/{endpoint}")
    public ResponseEntity<Long> incrementCounter(@PathVariable String endpoint) {
        Long count = redisService.incrementApiCallCount(endpoint);
        return ResponseEntity.ok(count);
    }

    /**
     * Example: Store temporary data
     */
    @PostMapping("/temp")
    public ResponseEntity<String> storeTempData(
            @RequestParam String key,
            @RequestBody Object data,
            @RequestParam(defaultValue = "300") long ttlSeconds) {
        redisService.storeTemporaryData(key, data, ttlSeconds);
        return ResponseEntity.ok("Temporary data stored for " + ttlSeconds + " seconds");
    }

    /**
     * Example: Invalidate cache pattern
     */
    @DeleteMapping("/invalidate")
    public ResponseEntity<String> invalidateCache(@RequestParam String pattern) {
        redisService.invalidateCache(pattern);
        return ResponseEntity.ok("Cache invalidated for pattern: " + pattern);
    }

    /**
     * Example: Check if key exists
     */
    @GetMapping("/exists")
    public ResponseEntity<Boolean> keyExists(@RequestParam String key) {
        boolean exists = redisService.exists(key);
        return ResponseEntity.ok(exists);
    }
}
