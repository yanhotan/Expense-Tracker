package com.expensetracker.repository;

import com.expensetracker.model.ColumnDescription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for ColumnDescription entity.
 * Handles metadata descriptions for expense cells.
 */
@Repository
public interface ColumnDescriptionRepository extends JpaRepository<ColumnDescription, UUID> {

    /**
     * Find description by expense ID.
     * Used to get description for a specific expense cell.
     */
    Optional<ColumnDescription> findByExpenseId(UUID expenseId);

    /**
     * Find descriptions by expense ID and column name.
     * Used when multiple columns can have descriptions.
     */
    Optional<ColumnDescription> findByExpenseIdAndColumnName(UUID expenseId, String columnName);

    /**
     * Find all descriptions for a user.
     * Used for bulk operations.
     */
    List<ColumnDescription> findByUserId(UUID userId);

    /**
     * Find descriptions by expense IDs (bulk lookup).
     * Used to load all descriptions for a sheet's expenses efficiently.
     */
    @Query("SELECT cd FROM ColumnDescription cd WHERE cd.expenseId IN :expenseIds")
    List<ColumnDescription> findByExpenseIdIn(@Param("expenseIds") List<UUID> expenseIds);

    /**
     * Find descriptions by expense IDs and column name.
     * Used for specific column descriptions.
     */
    @Query("SELECT cd FROM ColumnDescription cd WHERE cd.expenseId IN :expenseIds " +
           "AND cd.columnName = :columnName")
    List<ColumnDescription> findByExpenseIdInAndColumnName(
            @Param("expenseIds") List<UUID> expenseIds,
            @Param("columnName") String columnName
    );

    /**
     * Delete description by expense ID.
     * Used when expense is deleted (cascade cleanup).
     */
    void deleteByExpenseId(UUID expenseId);

    /**
     * Delete descriptions by expense IDs (bulk delete).
     * Used for efficient cleanup when deleting multiple expenses.
     */
    void deleteByExpenseIdIn(List<UUID> expenseIds);

    /**
     * Delete description by expense ID and column name.
     * Used for specific column cleanup.
     */
    void deleteByExpenseIdAndColumnName(UUID expenseId, String columnName);

    /**
     * Check if description exists for expense.
     * Used for validation before operations.
     */
    boolean existsByExpenseId(UUID expenseId);

    /**
     * Count descriptions by user ID.
     * Used for statistics.
     */
    long countByUserId(UUID userId);
}

