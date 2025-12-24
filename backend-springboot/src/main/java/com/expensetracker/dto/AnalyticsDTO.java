package com.expensetracker.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * DTO for analytics responses.
 */
public class AnalyticsDTO {

    private Map<String, BigDecimal> categoryTotals;
    private Map<String, BigDecimal> monthlyTotals;
    private Map<String, BigDecimal> dailyTotals;
    private BigDecimal currentMonthTotal;
    private BigDecimal previousMonthTotal;
    private List<String> categories;
    private Map<String, Object> filters;

    // Constructors
    public AnalyticsDTO() {}

    // Getters and Setters
    public Map<String, BigDecimal> getCategoryTotals() { return categoryTotals; }
    public void setCategoryTotals(Map<String, BigDecimal> categoryTotals) { 
        this.categoryTotals = categoryTotals; 
    }

    public Map<String, BigDecimal> getMonthlyTotals() { return monthlyTotals; }
    public void setMonthlyTotals(Map<String, BigDecimal> monthlyTotals) { 
        this.monthlyTotals = monthlyTotals; 
    }

    public Map<String, BigDecimal> getDailyTotals() { return dailyTotals; }
    public void setDailyTotals(Map<String, BigDecimal> dailyTotals) { 
        this.dailyTotals = dailyTotals; 
    }

    public BigDecimal getCurrentMonthTotal() { return currentMonthTotal; }
    public void setCurrentMonthTotal(BigDecimal currentMonthTotal) { 
        this.currentMonthTotal = currentMonthTotal; 
    }

    public BigDecimal getPreviousMonthTotal() { return previousMonthTotal; }
    public void setPreviousMonthTotal(BigDecimal previousMonthTotal) { 
        this.previousMonthTotal = previousMonthTotal; 
    }

    public List<String> getCategories() { return categories; }
    public void setCategories(List<String> categories) { this.categories = categories; }

    public Map<String, Object> getFilters() { return filters; }
    public void setFilters(Map<String, Object> filters) { this.filters = filters; }
}

