package com.expensetracker.controller;

import com.expensetracker.dto.AnalyticsDTO;
import com.expensetracker.dto.ApiResponse;
import com.expensetracker.service.AnalyticsService;
import com.expensetracker.util.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST Controller for Analytics operations.
 */
@RestController
@RequestMapping("/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    /**
     * GET /analytics - Get analytics data
     * Query params: sheetId, month (YYYY-MM format), year
     */
    @GetMapping
    public ResponseEntity<ApiResponse<AnalyticsDTO>> getAnalytics(
            @RequestParam UUID sheetId,
            @RequestParam(required = false) String month,
            @RequestParam(required = false) String year) {

        AnalyticsDTO analytics = analyticsService.getAnalytics(SecurityUtils.getCurrentUserId(), sheetId, month, year);
        return ResponseEntity.ok(ApiResponse.success(analytics));
    }
}

