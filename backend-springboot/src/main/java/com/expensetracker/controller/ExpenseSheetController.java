package com.expensetracker.controller;

import com.expensetracker.dto.ApiResponse;
import com.expensetracker.dto.ExpenseSheetDTO;
import com.expensetracker.service.ExpenseSheetService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST Controller for ExpenseSheet operations.
 */
@RestController
@RequestMapping("/sheets")
public class ExpenseSheetController {

    private final ExpenseSheetService sheetService;

    // Default user ID for now (until auth is implemented)
    private static final UUID DEFAULT_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000000");

    public ExpenseSheetController(ExpenseSheetService sheetService) {
        this.sheetService = sheetService;
    }

    /**
     * GET /sheets - Get all sheets for the current user
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ExpenseSheetDTO>>> getSheets() {
        List<ExpenseSheetDTO> sheets = sheetService.getSheets(DEFAULT_USER_ID);
        return ResponseEntity.ok(ApiResponse.success(sheets, sheets.size()));
    }

    /**
     * GET /sheets/{id} - Get a single sheet by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ExpenseSheetDTO>> getSheetById(@PathVariable UUID id) {
        ExpenseSheetDTO sheet = sheetService.getSheetById(DEFAULT_USER_ID, id);
        return ResponseEntity.ok(ApiResponse.success(sheet));
    }

    /**
     * POST /sheets - Create a new sheet
     */
    @PostMapping
    public ResponseEntity<ApiResponse<ExpenseSheetDTO>> createSheet(@Valid @RequestBody ExpenseSheetDTO sheetDTO) {
        ExpenseSheetDTO created = sheetService.createSheet(DEFAULT_USER_ID, sheetDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    /**
     * PUT /sheets/{id} - Update an existing sheet
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ExpenseSheetDTO>> updateSheet(
            @PathVariable UUID id,
            @Valid @RequestBody ExpenseSheetDTO sheetDTO) {
        ExpenseSheetDTO updated = sheetService.updateSheet(DEFAULT_USER_ID, id, sheetDTO);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    /**
     * DELETE /sheets/{id} - Delete a sheet and all its expenses
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSheet(@PathVariable UUID id) {
        sheetService.deleteSheet(DEFAULT_USER_ID, id);
        return ResponseEntity.ok(ApiResponse.success(null, "Sheet deleted successfully"));
    }
}

