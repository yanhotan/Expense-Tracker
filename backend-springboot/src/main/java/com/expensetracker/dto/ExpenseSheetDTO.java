package com.expensetracker.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for ExpenseSheet entity.
 */
public class ExpenseSheetDTO {

    private UUID id;

    @NotBlank(message = "Sheet name is required")
    @Size(min = 1, max = 100, message = "Sheet name must be between 1 and 100 characters")
    private String name;

    private String pin;

    private boolean hasPin;

    private UUID userId;

    private LocalDateTime createdAt;

    private int expenseCount;

    // Constructors
    public ExpenseSheetDTO() {}

    public ExpenseSheetDTO(UUID id, String name, String pin, boolean hasPin, 
                           UUID userId, LocalDateTime createdAt, int expenseCount) {
        this.id = id;
        this.name = name;
        this.pin = pin;
        this.hasPin = hasPin;
        this.userId = userId;
        this.createdAt = createdAt;
        this.expenseCount = expenseCount;
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPin() { return pin; }
    public void setPin(String pin) { this.pin = pin; }

    public boolean isHasPin() { return hasPin; }
    public void setHasPin(boolean hasPin) { this.hasPin = hasPin; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public int getExpenseCount() { return expenseCount; }
    public void setExpenseCount(int expenseCount) { this.expenseCount = expenseCount; }
}

