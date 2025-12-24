package com.expensetracker.service;

import com.expensetracker.exception.DuplicateResourceException;
import com.expensetracker.exception.ResourceNotFoundException;
import com.expensetracker.model.Expense;
import com.expensetracker.model.SheetCategory;
import com.expensetracker.repository.ExpenseRepository;
import com.expensetracker.repository.SheetCategoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service layer for Category operations.
 */
@Service
@Transactional
public class CategoryService {

    private final SheetCategoryRepository categoryRepository;
    private final ExpenseRepository expenseRepository;

    public CategoryService(SheetCategoryRepository categoryRepository, 
                           ExpenseRepository expenseRepository) {
        System.out.println("🔧 CategoryService constructor called");
        System.out.println("🔧 categoryRepository: " + (categoryRepository != null ? "OK" : "NULL"));
        System.out.println("🔧 expenseRepository: " + (expenseRepository != null ? "OK" : "NULL"));
        this.categoryRepository = categoryRepository;
        this.expenseRepository = expenseRepository;
        System.out.println("✅ CategoryService initialized successfully");
    }

    /**
     * Get all categories for a sheet.
     * If no categories exist in sheet_categories table, extracts unique categories from expenses.
     */
    @Transactional(readOnly = true)
    public List<String> getCategories(UUID sheetId) {
        System.out.println("🔍 CategoryService.getCategories called with sheetId: " + sheetId);
        
        List<String> categories = new ArrayList<>();
        
        // First try to get categories from sheet_categories table
        try {
            // Use simple query without ordering to avoid any JPQL/native query issues
            System.out.println("🔍 Attempting to query sheet_categories table...");
            List<SheetCategory> sheetCategories = categoryRepository.findBySheetId(sheetId);
            System.out.println("🔍 Query returned " + sheetCategories.size() + " SheetCategory records");
            
            if (!sheetCategories.isEmpty()) {
                // Sort by displayOrder in Java (nulls last), then extract distinct category names
                categories = sheetCategories.stream()
                    .sorted((a, b) -> {
                        Integer orderA = a.getDisplayOrder();
                        Integer orderB = b.getDisplayOrder();
                        if (orderA == null && orderB == null) return 0;
                        if (orderA == null) return 1; // nulls last
                        if (orderB == null) return -1;
                        return orderA.compareTo(orderB);
                    })
                    .map(SheetCategory::getCategory)
                    .distinct()
                    .collect(Collectors.toList());
                System.out.println("✅ Repository returned " + categories.size() + " categories from sheet_categories table");
            } else {
                System.out.println("⚠️ No categories found in sheet_categories, trying distinct query...");
                // Try the distinct query as fallback
                categories = categoryRepository.findDistinctCategoriesBySheetId(sheetId);
                System.out.println("✅ Distinct query returned " + categories.size() + " distinct categories");
            }
        } catch (Exception repoException) {
            System.err.println("❌ CRITICAL: Error querying sheet_categories table");
            System.err.println("❌ Exception type: " + repoException.getClass().getName());
            System.err.println("❌ Message: " + repoException.getMessage());
            if (repoException.getCause() != null) {
                System.err.println("❌ Cause: " + repoException.getCause().getClass().getName() + " - " + repoException.getCause().getMessage());
                if (repoException.getCause().getCause() != null) {
                    System.err.println("❌ Root Cause: " + repoException.getCause().getCause().getClass().getName() + " - " + repoException.getCause().getCause().getMessage());
                }
            }
            repoException.printStackTrace();
            // Re-throw to let GlobalExceptionHandler handle it properly
            throw new RuntimeException("Failed to query categories: " + repoException.getMessage(), repoException);
        }
        
        // If no categories in sheet_categories, try to get unique categories from expenses
        if (categories.isEmpty()) {
            System.out.println("⚠️ No categories in sheet_categories, extracting from expenses...");
            try {
                // Get distinct categories from expenses for this sheet
                List<Expense> expenses = expenseRepository.findByUserIdAndSheetId(
                    UUID.fromString("00000000-0000-0000-0000-000000000000"), sheetId);
                categories = expenses.stream()
                    .map(Expense::getCategory)
                    .distinct()
                    .sorted()
                    .collect(Collectors.toList());
                System.out.println("✅ Extracted " + categories.size() + " categories from expenses");
            } catch (Exception expenseException) {
                System.err.println("❌ Error extracting categories from expenses: " + expenseException.getMessage());
                expenseException.printStackTrace();
                // Re-throw to let GlobalExceptionHandler handle it
                throw new RuntimeException("Failed to extract categories from expenses: " + expenseException.getMessage(), expenseException);
            }
        }
        
        return categories;
    }

    /**
     * Create a new category.
     */
    public String createCategory(UUID sheetId, String category) {
        String normalizedCategory = category.trim().toLowerCase();

        // Check for duplicate
        if (categoryRepository.existsBySheetIdAndCategory(sheetId, normalizedCategory)) {
            throw new DuplicateResourceException("Category", normalizedCategory);
        }

        // Get next display order
        Integer maxOrder = categoryRepository.findMaxDisplayOrderBySheetId(sheetId);
        int nextOrder = (maxOrder != null ? maxOrder : 0) + 1;

        SheetCategory sheetCategory = new SheetCategory();
        sheetCategory.setSheetId(sheetId);
        sheetCategory.setCategory(normalizedCategory);
        sheetCategory.setDisplayOrder(nextOrder);

        categoryRepository.save(sheetCategory);
        return normalizedCategory;
    }

    /**
     * Rename a category.
     */
    public String updateCategory(UUID sheetId, UUID userId, String oldName, String newName) {
        String normalizedOldName = oldName.trim().toLowerCase();
        String normalizedNewName = newName.trim().toLowerCase();

        // Check if new name already exists
        if (!normalizedOldName.equals(normalizedNewName) && 
            categoryRepository.existsBySheetIdAndCategory(sheetId, normalizedNewName)) {
            throw new DuplicateResourceException("Category", normalizedNewName);
        }

        // Update category in sheet_categories table
        SheetCategory sheetCategory = categoryRepository.findBySheetIdAndCategory(sheetId, normalizedOldName)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "name", normalizedOldName));
        
        sheetCategory.setCategory(normalizedNewName);
        categoryRepository.save(sheetCategory);

        // Update all expenses with this category
        List<Expense> expenses = expenseRepository.findByUserIdAndSheetIdAndCategory(
                userId, sheetId, normalizedOldName);
        for (Expense expense : expenses) {
            expense.setCategory(normalizedNewName);
        }
        expenseRepository.saveAll(expenses);

        return normalizedNewName;
    }

    /**
     * Delete a category (moves expenses to 'uncategorized').
     */
    public void deleteCategory(UUID sheetId, UUID userId, String category) {
        String normalizedCategory = category.trim().toLowerCase();

        // Update all expenses with this category to 'uncategorized'
        List<Expense> expenses = expenseRepository.findByUserIdAndSheetIdAndCategory(
                userId, sheetId, normalizedCategory);
        for (Expense expense : expenses) {
            expense.setCategory("uncategorized");
        }
        expenseRepository.saveAll(expenses);

        // Delete category from sheet_categories table
        categoryRepository.deleteBySheetIdAndCategory(sheetId, normalizedCategory);
    }
}

