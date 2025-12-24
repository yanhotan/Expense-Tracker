package com.expensetracker.service;

import com.expensetracker.dto.AnalyticsDTO;
import com.expensetracker.model.Expense;
import com.expensetracker.repository.ExpenseRepository;
import com.expensetracker.repository.SheetCategoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service layer for Analytics operations.
 */
@Service
@Transactional(readOnly = true)
public class AnalyticsService {

    private final ExpenseRepository expenseRepository;
    private final SheetCategoryRepository categoryRepository;

    public AnalyticsService(ExpenseRepository expenseRepository, 
                            SheetCategoryRepository categoryRepository) {
        this.expenseRepository = expenseRepository;
        this.categoryRepository = categoryRepository;
    }

    /**
     * Get comprehensive analytics for a sheet.
     */
    public AnalyticsDTO getAnalytics(UUID userId, UUID sheetId, String month, String year) {
        AnalyticsDTO analytics = new AnalyticsDTO();
        Map<String, Object> filters = new HashMap<>();
        filters.put("sheetId", sheetId);
        filters.put("month", month);
        filters.put("year", year);
        analytics.setFilters(filters);

        // Get date range for filtering
        LocalDate startDate;
        LocalDate endDate;
        
        if (month != null) {
            YearMonth yearMonth = YearMonth.parse(month);
            startDate = yearMonth.atDay(1);
            endDate = yearMonth.atEndOfMonth();
        } else if (year != null) {
            int yearNum = Integer.parseInt(year);
            startDate = LocalDate.of(yearNum, 1, 1);
            endDate = LocalDate.of(yearNum, 12, 31);
        } else {
            // Default to current month
            YearMonth currentMonth = YearMonth.now();
            startDate = currentMonth.atDay(1);
            endDate = currentMonth.atEndOfMonth();
        }

        // Get expenses for the date range
        List<Expense> expenses = expenseRepository.findByUserIdAndSheetIdAndDateBetween(
                userId, sheetId, startDate, endDate);

        // Calculate category totals
        Map<String, BigDecimal> categoryTotals = new LinkedHashMap<>();
        for (Expense expense : expenses) {
            String category = expense.getCategory();
            categoryTotals.merge(category, expense.getAmount(), BigDecimal::add);
        }
        analytics.setCategoryTotals(categoryTotals);

        // Calculate daily totals
        Map<String, BigDecimal> dailyTotals = new TreeMap<>();
        for (Expense expense : expenses) {
            String dateKey = expense.getDate().toString();
            dailyTotals.merge(dateKey, expense.getAmount(), BigDecimal::add);
        }
        analytics.setDailyTotals(dailyTotals);

        // Calculate monthly totals (for yearly view)
        Map<String, BigDecimal> monthlyTotals = new LinkedHashMap<>();
        DateTimeFormatter monthFormatter = DateTimeFormatter.ofPattern("yyyy-MM");
        for (Expense expense : expenses) {
            String monthKey = expense.getDate().format(monthFormatter);
            monthlyTotals.merge(monthKey, expense.getAmount(), BigDecimal::add);
        }
        analytics.setMonthlyTotals(monthlyTotals);

        // Current month total
        BigDecimal currentMonthTotal = expenseRepository.getTotalBySheetAndDateRange(
                userId, sheetId, startDate, endDate);
        analytics.setCurrentMonthTotal(currentMonthTotal != null ? currentMonthTotal : BigDecimal.ZERO);

        // Previous month total
        YearMonth previousMonth = YearMonth.from(startDate).minusMonths(1);
        BigDecimal previousMonthTotal = expenseRepository.getTotalBySheetAndDateRange(
                userId, sheetId, 
                previousMonth.atDay(1), 
                previousMonth.atEndOfMonth());
        analytics.setPreviousMonthTotal(previousMonthTotal != null ? previousMonthTotal : BigDecimal.ZERO);

        // Get categories
        List<String> categories = categoryRepository.findDistinctCategoriesBySheetId(sheetId);
        analytics.setCategories(categories);

        return analytics;
    }
}

