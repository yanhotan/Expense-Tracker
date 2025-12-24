package com.expensetracker.service;

import com.expensetracker.dto.ExpenseSheetDTO;
import com.expensetracker.exception.ResourceNotFoundException;
import com.expensetracker.model.ExpenseSheet;
import com.expensetracker.repository.ExpenseRepository;
import com.expensetracker.repository.ExpenseSheetRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service layer for ExpenseSheet operations.
 */
@Service
@Transactional
public class ExpenseSheetService {

    private final ExpenseSheetRepository sheetRepository;
    private final ExpenseRepository expenseRepository;

    public ExpenseSheetService(ExpenseSheetRepository sheetRepository, 
                                ExpenseRepository expenseRepository) {
        this.sheetRepository = sheetRepository;
        this.expenseRepository = expenseRepository;
    }

    /**
     * Get all sheets for a user.
     */
    @Transactional(readOnly = true)
    public List<ExpenseSheetDTO> getSheets(UUID userId) {
        List<ExpenseSheet> sheets = sheetRepository.findByUserId(userId);
        return sheets.stream().map(sheet -> {
            ExpenseSheetDTO dto = toDTO(sheet);
            // Get expense count
            long count = expenseRepository.countByUserIdAndSheetId(userId, sheet.getId());
            dto.setExpenseCount((int) count);
            return dto;
        }).collect(Collectors.toList());
    }

    /**
     * Get a single sheet by ID.
     */
    @Transactional(readOnly = true)
    public ExpenseSheetDTO getSheetById(UUID userId, UUID sheetId) {
        ExpenseSheet sheet = sheetRepository.findByIdAndUserId(sheetId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("ExpenseSheet", sheetId));
        ExpenseSheetDTO dto = toDTO(sheet);
        long count = expenseRepository.countByUserIdAndSheetId(userId, sheetId);
        dto.setExpenseCount((int) count);
        return dto;
    }

    /**
     * Create a new sheet.
     */
    public ExpenseSheetDTO createSheet(UUID userId, ExpenseSheetDTO dto) {
        ExpenseSheet sheet = new ExpenseSheet();
        sheet.setName(dto.getName());
        sheet.setPin(dto.getPin());
        sheet.setHasPin(dto.getPin() != null && !dto.getPin().isEmpty());
        sheet.setUserId(userId);

        ExpenseSheet saved = sheetRepository.save(sheet);
        return toDTO(saved);
    }

    /**
     * Update an existing sheet.
     */
    public ExpenseSheetDTO updateSheet(UUID userId, UUID sheetId, ExpenseSheetDTO dto) {
        ExpenseSheet sheet = sheetRepository.findByIdAndUserId(sheetId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("ExpenseSheet", sheetId));

        sheet.setName(dto.getName());
        if (dto.getPin() != null) {
            sheet.setPin(dto.getPin());
            sheet.setHasPin(!dto.getPin().isEmpty());
        }

        ExpenseSheet saved = sheetRepository.save(sheet);
        return toDTO(saved);
    }

    /**
     * Delete a sheet and all its expenses.
     */
    public void deleteSheet(UUID userId, UUID sheetId) {
        ExpenseSheet sheet = sheetRepository.findByIdAndUserId(sheetId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("ExpenseSheet", sheetId));
        
        // Delete all related expenses first (handled by cascade, but explicit for clarity)
        expenseRepository.deleteByUserIdAndSheetId(userId, sheetId);
        sheetRepository.delete(sheet);
    }

    // Helper method to convert Entity to DTO
    private ExpenseSheetDTO toDTO(ExpenseSheet sheet) {
        ExpenseSheetDTO dto = new ExpenseSheetDTO();
        dto.setId(sheet.getId());
        dto.setName(sheet.getName());
        dto.setPin(sheet.getPin());
        dto.setHasPin(sheet.isHasPin());
        dto.setUserId(sheet.getUserId());
        dto.setCreatedAt(sheet.getCreatedAt());
        return dto;
    }
}

