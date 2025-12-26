package com.expensetracker.controller;

import com.expensetracker.dto.ApiResponse;
import com.expensetracker.dto.ColumnDescriptionDTO;
import com.expensetracker.service.DescriptionService;
import com.expensetracker.util.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST Controller for ColumnDescription operations.
 */
@RestController
@RequestMapping("/descriptions")
public class DescriptionController {

    private final DescriptionService descriptionService;

    public DescriptionController(DescriptionService descriptionService) {
        this.descriptionService = descriptionService;
    }

    /**
     * GET /descriptions - Get all descriptions for the current user
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ColumnDescriptionDTO>>> getDescriptions(
            @RequestParam(required = false) String columnName) {
        List<ColumnDescriptionDTO> descriptions = descriptionService.getDescriptionsByUserId(SecurityUtils.getCurrentUserId());
        return ResponseEntity.ok(ApiResponse.success(descriptions, descriptions.size()));
    }

    /**
     * POST /descriptions - Create or update a description
     * Body: { "expense_id": UUID, "description": string, "column_name": string }
     */
    @PostMapping
    public ResponseEntity<ApiResponse<ColumnDescriptionDTO>> saveDescription(
            @Valid @RequestBody ColumnDescriptionDTO dto) {
        // Set column name default if not provided
        if (dto.getColumnName() == null || dto.getColumnName().isEmpty()) {
            dto.setColumnName("notes");
        }
        
        ColumnDescriptionDTO saved = descriptionService.saveDescription(SecurityUtils.getCurrentUserId(), dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(saved));
    }

    /**
     * DELETE /descriptions/{id} - Delete a description by ID
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDescription(@PathVariable UUID id) {
        descriptionService.deleteDescription(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Description deleted successfully"));
    }

    /**
     * DELETE /descriptions/expense/{expenseId} - Delete description by expense ID
     */
    @DeleteMapping("/expense/{expenseId}")
    public ResponseEntity<ApiResponse<Void>> deleteByExpenseId(
            @PathVariable UUID expenseId,
            @RequestParam(required = false) String columnName) {
        if (columnName != null && !columnName.isEmpty()) {
            descriptionService.deleteByExpenseIdAndColumn(expenseId, columnName);
        } else {
            descriptionService.deleteByExpenseId(expenseId);
        }
        return ResponseEntity.ok(ApiResponse.success(null, "Description deleted successfully"));
    }
}

