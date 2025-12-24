package com.expensetracker.controller;

import com.expensetracker.dto.ApiResponse;
import com.expensetracker.service.CategoryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST Controller for Category operations.
 */
@RestController
@RequestMapping("/categories")
public class CategoryController {

    private final CategoryService categoryService;

    // Default user ID for now (until auth is implemented)
    private static final UUID DEFAULT_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000000");

    public CategoryController(CategoryService categoryService) {
        System.out.println("🔧 CategoryController constructor called - CategoryService: " + (categoryService != null ? "OK" : "NULL"));
        this.categoryService = categoryService;
    }

    /**
     * Test endpoint to verify controller is working
     */
    @GetMapping("/test")
    public ResponseEntity<ApiResponse<String>> test() {
        System.out.println("✅ TEST ENDPOINT CALLED - Controller is working!");
        System.out.println("✅ CategoryService is: " + (categoryService != null ? "OK" : "NULL"));
        return ResponseEntity.ok(ApiResponse.success("Controller is working!", "Test successful"));
    }

    /**
     * GET /categories?sheetId={sheetId} - Get all categories for a sheet
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<String>>> getCategories(@RequestParam UUID sheetId) {
        System.out.println("═══════════════════════════════════════════════════════════");
        System.out.println("🔍 CategoryController.getCategories called with sheetId: " + sheetId);
        System.out.println("═══════════════════════════════════════════════════════════");
        try {
            List<String> categories = categoryService.getCategories(sheetId);
            System.out.println("✅ Found " + categories.size() + " categories for sheet: " + sheetId);
            return ResponseEntity.ok(ApiResponse.success(categories, categories.size()));
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
            
            ApiResponse<List<String>> errorResponse = ApiResponse.error("INTERNAL_ERROR", errorMessage);
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * POST /categories - Create a new category
     * Body: { "sheetId": UUID, "category": string }
     */
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createCategory(@RequestBody Map<String, Object> body) {
        UUID sheetId = UUID.fromString((String) body.get("sheetId"));
        String category = (String) body.get("category");

        String created = categoryService.createCategory(sheetId, category);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    /**
     * PUT /categories - Rename a category
     * Body: { "sheetId": UUID, "oldName": string, "newName": string }
     */
    @PutMapping
    public ResponseEntity<ApiResponse<String>> updateCategory(@RequestBody Map<String, Object> body) {
        UUID sheetId = UUID.fromString((String) body.get("sheetId"));
        String oldName = (String) body.get("oldName");
        String newName = (String) body.get("newName");

        String updated = categoryService.updateCategory(sheetId, DEFAULT_USER_ID, oldName, newName);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    /**
     * DELETE /categories - Delete a category
     * Body: { "sheetId": UUID, "category": string }
     */
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deleteCategory(@RequestBody Map<String, Object> body) {
        UUID sheetId = UUID.fromString((String) body.get("sheetId"));
        String category = (String) body.get("category");

        categoryService.deleteCategory(sheetId, DEFAULT_USER_ID, category);
        return ResponseEntity.ok(ApiResponse.success(null, "Category deleted successfully"));
    }
}

