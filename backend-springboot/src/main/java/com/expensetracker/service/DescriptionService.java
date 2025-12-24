package com.expensetracker.service;

import com.expensetracker.dto.ColumnDescriptionDTO;
import com.expensetracker.exception.ResourceNotFoundException;
import com.expensetracker.model.ColumnDescription;
import com.expensetracker.repository.ColumnDescriptionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service layer for ColumnDescription operations.
 */
@Service
@Transactional
public class DescriptionService {

    private final ColumnDescriptionRepository descriptionRepository;

    public DescriptionService(ColumnDescriptionRepository descriptionRepository) {
        this.descriptionRepository = descriptionRepository;
    }

    /**
     * Get descriptions by expense IDs (bulk).
     */
    @Transactional(readOnly = true)
    public List<ColumnDescriptionDTO> getDescriptionsByExpenseIds(List<UUID> expenseIds) {
        return descriptionRepository.findByExpenseIdIn(expenseIds)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get descriptions by expense IDs and column name.
     */
    @Transactional(readOnly = true)
    public List<ColumnDescriptionDTO> getDescriptionsByExpenseIdsAndColumn(
            List<UUID> expenseIds, String columnName) {
        return descriptionRepository.findByExpenseIdInAndColumnName(expenseIds, columnName)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get all descriptions for a user.
     */
    @Transactional(readOnly = true)
    public List<ColumnDescriptionDTO> getDescriptionsByUserId(UUID userId) {
        return descriptionRepository.findByUserId(userId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Save or update a description.
     */
    public ColumnDescriptionDTO saveDescription(UUID userId, ColumnDescriptionDTO dto) {
        // Check if description already exists for this expense and column
        ColumnDescription description = descriptionRepository
                .findByExpenseIdAndColumnName(dto.getExpenseId(), dto.getColumnName())
                .orElse(null);

        if (description == null) {
            description = new ColumnDescription();
            description.setExpenseId(dto.getExpenseId());
            description.setColumnName(dto.getColumnName());
            description.setUserId(userId);
        }

        description.setDescription(dto.getDescription());

        ColumnDescription saved = descriptionRepository.save(description);
        return toDTO(saved);
    }

    /**
     * Delete a description by ID.
     */
    public void deleteDescription(UUID descriptionId) {
        if (!descriptionRepository.existsById(descriptionId)) {
            throw new ResourceNotFoundException("Description", descriptionId);
        }
        descriptionRepository.deleteById(descriptionId);
    }

    /**
     * Delete description by expense ID.
     */
    public void deleteByExpenseId(UUID expenseId) {
        descriptionRepository.deleteByExpenseId(expenseId);
    }

    /**
     * Delete description by expense ID and column name.
     */
    public void deleteByExpenseIdAndColumn(UUID expenseId, String columnName) {
        descriptionRepository.deleteByExpenseIdAndColumnName(expenseId, columnName);
    }

    // Helper method to convert Entity to DTO
    private ColumnDescriptionDTO toDTO(ColumnDescription description) {
        ColumnDescriptionDTO dto = new ColumnDescriptionDTO();
        dto.setId(description.getId());
        dto.setExpenseId(description.getExpenseId());
        dto.setColumnName(description.getColumnName());
        dto.setDescription(description.getDescription());
        dto.setUserId(description.getUserId());
        dto.setCreatedAt(description.getCreatedAt());
        return dto;
    }
}

