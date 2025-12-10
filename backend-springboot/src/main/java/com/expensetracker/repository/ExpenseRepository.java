package com.expensetracker.repository;

import com.expensetracker.model.Expense;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for Expense entity with optimized queries to prevent N+1 problems.
 * Uses @EntityGraph for efficient loading of related entities.
 */
@Repository
public interface ExpenseRepository extends JpaRepository<Expense, UUID> {

    /**
     * Find all expenses for a specific user with pagination.
     * Uses EntityGraph to eagerly fetch sheet relationship.
     * Cached for 30 minutes to improve performance.
     */
    @EntityGraph(attributePaths = {"sheet"})
    @org.springframework.cache.annotation.Cacheable(value = "expenses", key = "'user_' + #userId + '_page_' + #pageable.pageNumber + '_size_' + #pageable.pageSize")
    Page<Expense> findByUserId(UUID userId, Pageable pageable);

    /**
     * Find expenses by user and sheet ID with pagination.
     * Optimized with EntityGraph to avoid N+1 queries.
     */
    @EntityGraph(attributePaths = {"sheet"})
    Page<Expense> findByUserIdAndSheetId(UUID userId, UUID sheetId, Pageable pageable);

    /**
     * Find expenses by user ID and sheet ID (no pagination).
     * Used for bulk operations and aggregations.
     */
    @EntityGraph(attributePaths = {"sheet"})
    List<Expense> findByUserIdAndSheetId(UUID userId, UUID sheetId);

    /**
     * Find expenses by user ID within a date range.
     * Optimized for analytics and reporting queries.
     */
    @EntityGraph(attributePaths = {"sheet"})
    List<Expense> findByUserIdAndDateBetween(UUID userId, LocalDate startDate, LocalDate endDate);

    /**
     * Find expenses by user, sheet, and date range.
     * Used for monthly/yearly filtering.
     */
    @EntityGraph(attributePaths = {"sheet"})
    List<Expense> findByUserIdAndSheetIdAndDateBetween(
            UUID userId, 
            UUID sheetId, 
            LocalDate startDate, 
            LocalDate endDate
    );

    /**
     * Find expenses by user, sheet, and category.
     * Used for category-specific queries.
     */
    @EntityGraph(attributePaths = {"sheet"})
    List<Expense> findByUserIdAndSheetIdAndCategory(UUID userId, UUID sheetId, String category);

    /**
     * Find expenses by user, sheet, date, and category.
     * Used to check for duplicate expenses (same date + category).
     */
    @Query("SELECT e FROM Expense e WHERE e.userId = :userId " +
           "AND e.sheet.id = :sheetId AND e.date = :date AND e.category = :category")
    List<Expense> findByUserIdAndSheetIdAndDateAndCategory(
            @Param("userId") UUID userId,
            @Param("sheetId") UUID sheetId,
            @Param("date") LocalDate date,
            @Param("category") String category
    );

    /**
     * Calculate total amount for expenses in a sheet.
     * Uses database-level aggregation for performance.
     */
    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e " +
           "WHERE e.userId = :userId AND e.sheet.id = :sheetId")
    BigDecimal getTotalBySheet(@Param("userId") UUID userId, @Param("sheetId") UUID sheetId);

    /**
     * Calculate total amount for expenses in a sheet within date range.
     * Used for monthly/yearly totals.
     */
    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e " +
           "WHERE e.userId = :userId AND e.sheet.id = :sheetId " +
           "AND e.date BETWEEN :startDate AND :endDate")
    BigDecimal getTotalBySheetAndDateRange(
            @Param("userId") UUID userId,
            @Param("sheetId") UUID sheetId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    /**
     * Calculate total amount by category for a sheet.
     * Used for category breakdown analytics.
     */
    @Query("SELECT e.category, COALESCE(SUM(e.amount), 0) FROM Expense e " +
           "WHERE e.userId = :userId AND e.sheet.id = :sheetId " +
           "GROUP BY e.category")
    List<Object[]> getTotalByCategory(@Param("userId") UUID userId, @Param("sheetId") UUID sheetId);

    /**
     * Count expenses by user and sheet.
     * Used for statistics and validation.
     */
    long countByUserIdAndSheetId(UUID userId, UUID sheetId);

    /**
     * Check if expense exists for user, sheet, date, and category.
     * Used for duplicate detection before insert.
     */
    @Query("SELECT COUNT(e) > 0 FROM Expense e WHERE e.userId = :userId " +
           "AND e.sheet.id = :sheetId AND e.date = :date AND e.category = :category")
    boolean existsByUserIdAndSheetIdAndDateAndCategory(
            @Param("userId") UUID userId,
            @Param("sheetId") UUID sheetId,
            @Param("date") LocalDate date,
            @Param("category") String category
    );

    /**
     * Find expense by ID and user ID for security.
     * Ensures users can only access their own expenses.
     */
    @EntityGraph(attributePaths = {"sheet"})
    Optional<Expense> findByIdAndUserId(UUID id, UUID userId);

    /**
     * Delete all expenses for a sheet (cascade delete).
     * Used when deleting an entire sheet.
     */
    void deleteBySheetId(UUID sheetId);

    /**
     * Delete expenses by user and sheet ID.
     * Used for bulk operations.
     */
    void deleteByUserIdAndSheetId(UUID userId, UUID sheetId);
}

