package com.expensetracker.service;

import com.expensetracker.model.Expense;
import com.expensetracker.model.ExpenseSheet;
import com.expensetracker.model.User;
import com.expensetracker.repository.ExpenseRepository;
import com.expensetracker.repository.ExpenseSheetRepository;
import com.expensetracker.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class DataMigrationService {

    private static final UUID DEMO_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000000");

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ExpenseSheetRepository sheetRepository;

    @Autowired
    private ExpenseRepository expenseRepository;

    /**
     * Migrates existing demo data to the first authenticated user
     * This method should be called after a new user signs in for the first time
     */
    @Transactional
    public void migrateDemoDataToUser(User user) {
        // Check if there's any demo data to migrate
        List<ExpenseSheet> demoSheets = sheetRepository.findByUserId(DEMO_USER_ID);
        List<Expense> demoExpenses = expenseRepository.findAllByUserId(DEMO_USER_ID);

        if (demoSheets.isEmpty() && demoExpenses.isEmpty()) {
            // No demo data to migrate
            return;
        }

        // Migrate expense sheets
        for (ExpenseSheet sheet : demoSheets) {
            sheet.setUserId(user.getId());
            sheetRepository.save(sheet);
        }

        // Migrate expenses
        for (Expense expense : demoExpenses) {
            expense.setUserId(user.getId());
            expenseRepository.save(expense);
        }
    }

    /**
     * Checks if demo data migration is needed for a user
     */
    public boolean needsDemoDataMigration(User user) {
        // Only migrate for the first user who signs in
        List<User> allUsers = userRepository.findAll();
        if (allUsers.size() > 1) {
            return false; // Not the first user
        }

        // Check if there's demo data
        List<ExpenseSheet> demoSheets = sheetRepository.findByUserId(DEMO_USER_ID);
        List<Expense> demoExpenses = expenseRepository.findAllByUserId(DEMO_USER_ID);

        return !demoSheets.isEmpty() || !demoExpenses.isEmpty();
    }
}
