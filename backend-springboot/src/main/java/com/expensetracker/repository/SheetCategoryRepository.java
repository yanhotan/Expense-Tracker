package com.expensetracker.repository;

import com.expensetracker.model.SheetCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for SheetCategory entity.
 * Manages category definitions per expense sheet.
 */
@Repository
public interface SheetCategoryRepository extends JpaRepository<SheetCategory, UUID> {

    /**
     * Find all categories for a sheet.
     * Returns categories ordered by display order.
     */
    List<SheetCategory> findBySheetIdOrderByDisplayOrderAsc(UUID sheetId);

    /**
     * Find categories by sheet ID (no ordering).
     * Used for existence checks.
     */
    List<SheetCategory> findBySheetId(UUID sheetId);

    /**
     * Find category by sheet ID and category name.
     * Used to check if category already exists.
     */
    Optional<SheetCategory> findBySheetIdAndCategory(UUID sheetId, String category);

    /**
     * Check if category exists for sheet.
     * Used for validation before insert.
     */
    boolean existsBySheetIdAndCategory(UUID sheetId, String category);

    /**
     * Get distinct categories for a sheet.
     * Used to get unique category names.
     */
    @Query("SELECT DISTINCT sc.category FROM SheetCategory sc WHERE sc.sheetId = :sheetId " +
           "ORDER BY sc.displayOrder ASC")
    List<String> findDistinctCategoriesBySheetId(@Param("sheetId") UUID sheetId);

    /**
     * Count categories for a sheet.
     * Used for validation and statistics.
     */
    long countBySheetId(UUID sheetId);

    /**
     * Delete all categories for a sheet.
     * Used when deleting a sheet (cascade cleanup).
     */
    void deleteBySheetId(UUID sheetId);

    /**
     * Delete category by sheet ID and category name.
     * Used when renaming or removing a category.
     */
    void deleteBySheetIdAndCategory(UUID sheetId, String category);

    /**
     * Find category with highest display order.
     * Used when adding new categories to determine next order.
     */
    @Query("SELECT MAX(sc.displayOrder) FROM SheetCategory sc WHERE sc.sheetId = :sheetId")
    Integer findMaxDisplayOrderBySheetId(@Param("sheetId") UUID sheetId);

    /**
     * Update display order for a category.
     * Used for reordering categories.
     */
    @Query("UPDATE SheetCategory sc SET sc.displayOrder = :displayOrder " +
           "WHERE sc.id = :id")
    void updateDisplayOrder(@Param("id") UUID id, @Param("displayOrder") Integer displayOrder);
}

