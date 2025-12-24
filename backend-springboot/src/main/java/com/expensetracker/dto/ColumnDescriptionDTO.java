package com.expensetracker.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for ColumnDescription entity.
 */
public class ColumnDescriptionDTO {

    private UUID id;

    @NotNull(message = "Expense ID is required")
    private UUID expenseId;

    @NotBlank(message = "Column name is required")
    private String columnName;

    @NotBlank(message = "Description is required")
    private String description;

    private UUID userId;

    private LocalDateTime createdAt;

    // Constructors
    public ColumnDescriptionDTO() {}

    public ColumnDescriptionDTO(UUID id, UUID expenseId, String columnName, 
                                 String description, UUID userId, LocalDateTime createdAt) {
        this.id = id;
        this.expenseId = expenseId;
        this.columnName = columnName;
        this.description = description;
        this.userId = userId;
        this.createdAt = createdAt;
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getExpenseId() { return expenseId; }
    public void setExpenseId(UUID expenseId) { this.expenseId = expenseId; }

    public String getColumnName() { return columnName; }
    public void setColumnName(String columnName) { this.columnName = columnName; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}

