package com.expensetracker.controller;

import com.expensetracker.dto.ApiResponse;
import com.expensetracker.dto.ExpenseDTO;
import com.expensetracker.service.ExpenseService;
import com.expensetracker.util.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST Controller for Expense operations.
 */
@RestController
@RequestMapping("/expenses")
public class ExpenseController {

    private final ExpenseService expenseService;

    public ExpenseController(ExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    /**
     * GET /expenses - Get all expenses with optional filters
     * Query params: sheetId, month (YYYY-MM format), year
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ExpenseDTO>>> getExpenses(
            @RequestParam(required = false) UUID sheetId,
            @RequestParam(required = false) String month,
            @RequestParam(required = false) String year) {
        System.out.println("═══════════════════════════════════════════════════════════");
        System.out.println("🔍 Parameters - sheetId: " + sheetId + ", month: " + month + ", year: " + year);
        System.out.println("═══════════════════════════════════════════════════════════");
        try {
            UUID userId = SecurityUtils.getCurrentUserId();
            System.out.println("🔍 ExpenseController.getExpenses called with userId: " + userId);
            List<ExpenseDTO> expenses = expenseService.getExpenses(userId, sheetId, month, year);
            System.out.println("✅ Returning " + expenses.size() + " expenses");
            return ResponseEntity.ok(ApiResponse.success(expenses, expenses.size()));
        } catch (Exception e) {
            System.err.println("❌ ERROR IN CONTROLLER - Catching exception directly");
            System.err.println("❌ Exception type: " + e.getClass().getName());
            System.err.println("❌ Exception message: " + e.getMessage());
            if (e.getCause() != null) {
                System.err.println("❌ Cause: " + e.getCause().getClass().getName() + " - " + e.getCause().getMessage());
            }
            e.printStackTrace();
            
            // Return error response directly from controller to bypass any default handlers
            String errorMessage = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            if (e.getCause() != null && e.getCause().getMessage() != null) {
                errorMessage += " | Cause: " + e.getCause().getMessage();
            }
            
            ApiResponse<List<ExpenseDTO>> errorResponse = ApiResponse.error("INTERNAL_ERROR", errorMessage);
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * GET /expenses/{id} - Get a single expense by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ExpenseDTO>> getExpenseById(@PathVariable UUID id) {
        ExpenseDTO expense = expenseService.getExpenseById(SecurityUtils.getCurrentUserId(), id);
        return ResponseEntity.ok(ApiResponse.success(expense));
    }

    /**
     * POST /expenses - Create a new expense
     */
    @PostMapping
    public ResponseEntity<ApiResponse<ExpenseDTO>> createExpense(@Valid @RequestBody ExpenseDTO expenseDTO) {
        ExpenseDTO created = expenseService.createExpense(SecurityUtils.getCurrentUserId(), expenseDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    /**
     * PUT /expenses/{id} - Update an existing expense
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ExpenseDTO>> updateExpense(
            @PathVariable UUID id,
            @Valid @RequestBody ExpenseDTO expenseDTO) {
        ExpenseDTO updated = expenseService.updateExpense(SecurityUtils.getCurrentUserId(), id, expenseDTO);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    /**
     * DELETE /expenses/{id} - Delete an expense
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteExpense(@PathVariable UUID id) {
        expenseService.deleteExpense(SecurityUtils.getCurrentUserId(), id);
        return ResponseEntity.ok(ApiResponse.success(null, "Expense deleted successfully"));
    }
}

