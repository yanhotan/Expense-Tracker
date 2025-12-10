package com.expensetracker.repository;

import com.expensetracker.model.ExpenseSheet;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for ExpenseSheet entity.
 * Uses @EntityGraph to efficiently load expenses when needed.
 */
@Repository
public interface ExpenseSheetRepository extends JpaRepository<ExpenseSheet, UUID> {

    /**
     * Find all sheets for a user.
     * Uses EntityGraph to eagerly fetch expenses if needed.
     */
    @EntityGraph(attributePaths = {"expenses"})
    List<ExpenseSheet> findByUserId(UUID userId);

    /**
     * Find sheet by ID and user ID for security.
     * Ensures users can only access their own sheets.
     */
    @EntityGraph(attributePaths = {"expenses"})
    Optional<ExpenseSheet> findByIdAndUserId(UUID id, UUID userId);

    /**
     * Find sheet by ID with expenses loaded.
     * Used when you need the full sheet with all expenses.
     */
    @EntityGraph(attributePaths = {"expenses"})
    Optional<ExpenseSheet> findById(UUID id);

    /**
     * Check if sheet exists for user.
     * Used for validation before operations.
     */
    boolean existsByIdAndUserId(UUID id, UUID userId);

    /**
     * Count sheets by user ID.
     * Used for statistics and limits.
     */
    long countByUserId(UUID userId);

    /**
     * Find sheets by user ID with expense count.
     * Used for dashboard listings with summary data.
     */
    @Query("SELECT s FROM ExpenseSheet s WHERE s.userId = :userId")
    List<ExpenseSheet> findByUserIdWithExpenseCount(@Param("userId") UUID userId);

    /**
     * Delete all sheets for a user.
     * Used for account deletion scenarios.
     */
    void deleteByUserId(UUID userId);
}

