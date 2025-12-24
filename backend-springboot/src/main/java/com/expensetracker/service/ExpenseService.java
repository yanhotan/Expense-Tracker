package com.expensetracker.service;

import com.expensetracker.dto.ExpenseDTO;
import com.expensetracker.exception.DuplicateResourceException;
import com.expensetracker.exception.ResourceNotFoundException;
import com.expensetracker.model.Expense;
import com.expensetracker.model.ExpenseSheet;
import com.expensetracker.repository.ExpenseRepository;
import com.expensetracker.repository.ExpenseSheetRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service layer for Expense operations.
 */
@Service
@Transactional
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final ExpenseSheetRepository sheetRepository;

    public ExpenseService(ExpenseRepository expenseRepository, ExpenseSheetRepository sheetRepository) {
        this.expenseRepository = expenseRepository;
        this.sheetRepository = sheetRepository;
    }

    /**
     * Get all expenses for a user with optional filters.
     */
    @Transactional(readOnly = true)
    public List<ExpenseDTO> getExpenses(UUID userId, UUID sheetId, String month, String year) {
        try {
            System.out.println("🔍 ExpenseService.getExpenses called with userId: " + userId + 
                             ", sheetId: " + sheetId + ", month: " + month + ", year: " + year);
            
            List<Expense> expenses;

            if (sheetId != null && month != null) {
                // Parse month (YYYY-MM format)
                YearMonth yearMonth = YearMonth.parse(month);
                LocalDate startDate = yearMonth.atDay(1);
                LocalDate endDate = yearMonth.atEndOfMonth();
                expenses = expenseRepository.findByUserIdAndSheetIdAndDateBetween(userId, sheetId, startDate, endDate);
                System.out.println("✅ Found " + expenses.size() + " expenses for sheet " + sheetId + " in month " + month);
            } else if (sheetId != null) {
                expenses = expenseRepository.findByUserIdAndSheetId(userId, sheetId);
                System.out.println("✅ Found " + expenses.size() + " expenses for sheet " + sheetId);
            } else if (month != null) {
                YearMonth yearMonth = YearMonth.parse(month);
                LocalDate startDate = yearMonth.atDay(1);
                LocalDate endDate = yearMonth.atEndOfMonth();
                expenses = expenseRepository.findByUserIdAndDateBetween(userId, startDate, endDate);
                System.out.println("✅ Found " + expenses.size() + " expenses for month " + month);
            } else {
                // Get all expenses for user - use a large page size instead of unpaged
                System.out.println("🔍 Querying all expenses for user " + userId + " (no filters)");
                Page<Expense> expensePage = expenseRepository.findByUserId(userId, PageRequest.of(0, 10000));
                expenses = expensePage.getContent();
                System.out.println("✅ Found " + expenses.size() + " total expenses for user " + userId);
            }

            return expenses.stream().map(this::toDTO).collect(Collectors.toList());
        } catch (Exception e) {
            System.err.println("❌ Error in ExpenseService.getExpenses: " + e.getClass().getName());
            System.err.println("❌ Message: " + e.getMessage());
            System.err.println("❌ Cause: " + (e.getCause() != null ? e.getCause().getMessage() : "null"));
            e.printStackTrace();
            throw e;
        }
    }

    /**
     * Get a single expense by ID.
     */
    @Transactional(readOnly = true)
    public ExpenseDTO getExpenseById(UUID userId, UUID expenseId) {
        Expense expense = expenseRepository.findByIdAndUserId(expenseId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense", expenseId));
        return toDTO(expense);
    }

    /**
     * Create a new expense.
     */
    public ExpenseDTO createExpense(UUID userId, ExpenseDTO dto) {
        // Check for duplicate (same date + category + sheet)
        if (dto.getAmount().compareTo(BigDecimal.ZERO) != 0) {
            boolean exists = expenseRepository.existsByUserIdAndSheetIdAndDateAndCategory(
                    userId, dto.getSheetId(), dto.getDate(), dto.getCategory());
            if (exists) {
                throw new DuplicateResourceException("Expense", 
                    "An expense already exists for this date and category");
            }
        }

        // Verify sheet exists
        ExpenseSheet sheet = sheetRepository.findByIdAndUserId(dto.getSheetId(), userId)
                .orElseThrow(() -> new ResourceNotFoundException("ExpenseSheet", dto.getSheetId()));

        Expense expense = new Expense();
        expense.setDate(dto.getDate());
        expense.setAmount(dto.getAmount());
        expense.setCategory(dto.getCategory().toLowerCase());
        expense.setDescription(dto.getDescription());
        expense.setUserId(userId);
        expense.setSheet(sheet);

        Expense saved = expenseRepository.save(expense);
        return toDTO(saved);
    }

    /**
     * Update an existing expense.
     */
    public ExpenseDTO updateExpense(UUID userId, UUID expenseId, ExpenseDTO dto) {
        Expense expense = expenseRepository.findByIdAndUserId(expenseId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense", expenseId));

        // Check for duplicate if date/category changed
        if (!expense.getDate().equals(dto.getDate()) || !expense.getCategory().equals(dto.getCategory())) {
            boolean exists = expenseRepository.existsByUserIdAndSheetIdAndDateAndCategory(
                    userId, expense.getSheet().getId(), dto.getDate(), dto.getCategory());
            if (exists) {
                // Check if it's a different expense
                List<Expense> existing = expenseRepository.findByUserIdAndSheetIdAndDateAndCategory(
                        userId, expense.getSheet().getId(), dto.getDate(), dto.getCategory());
                if (!existing.isEmpty() && !existing.get(0).getId().equals(expenseId)) {
                    throw new DuplicateResourceException("Expense", 
                        "An expense already exists for this date and category");
                }
            }
        }

        expense.setDate(dto.getDate());
        expense.setAmount(dto.getAmount());
        expense.setCategory(dto.getCategory().toLowerCase());
        expense.setDescription(dto.getDescription());

        Expense saved = expenseRepository.save(expense);
        return toDTO(saved);
    }

    /**
     * Delete an expense.
     */
    public void deleteExpense(UUID userId, UUID expenseId) {
        Expense expense = expenseRepository.findByIdAndUserId(expenseId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense", expenseId));
        expenseRepository.delete(expense);
    }

    /**
     * Get category totals for analytics.
     */
    @Transactional(readOnly = true)
    public Map<String, BigDecimal> getCategoryTotals(UUID userId, UUID sheetId) {
        List<Object[]> results = expenseRepository.getTotalByCategory(userId, sheetId);
        return results.stream()
                .collect(Collectors.toMap(
                        row -> (String) row[0],
                        row -> (BigDecimal) row[1]
                ));
    }

    /**
     * Get total for a sheet within date range.
     */
    @Transactional(readOnly = true)
    public BigDecimal getTotal(UUID userId, UUID sheetId, LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null) {
            return expenseRepository.getTotalBySheetAndDateRange(userId, sheetId, startDate, endDate);
        }
        return expenseRepository.getTotalBySheet(userId, sheetId);
    }

    // Helper method to convert Entity to DTO
    private ExpenseDTO toDTO(Expense expense) {
        ExpenseDTO dto = new ExpenseDTO();
        dto.setId(expense.getId());
        dto.setDate(expense.getDate());
        dto.setAmount(expense.getAmount());
        dto.setCategory(expense.getCategory());
        dto.setDescription(expense.getDescription());
        dto.setSheetId(expense.getSheet() != null ? expense.getSheet().getId() : null);
        dto.setUserId(expense.getUserId());
        dto.setCreatedAt(expense.getCreatedAt());
        return dto;
    }
}

