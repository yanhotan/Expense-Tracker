-- Performance indexes for Expense Tracker
-- These indexes optimize common query patterns

-- Indexes for expenses table
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_sheet_id ON expenses(sheet_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_user_sheet ON expenses(user_id, sheet_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_sheet_date ON expenses(sheet_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_sheet_date ON expenses(user_id, sheet_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_sheet_category ON expenses(user_id, sheet_id, category);

-- Indexes for expense_sheets table
CREATE INDEX IF NOT EXISTS idx_expense_sheets_user_id ON expense_sheets(user_id);

-- Indexes for column_descriptions table
CREATE INDEX IF NOT EXISTS idx_column_descriptions_expense_id ON column_descriptions(expense_id);
CREATE INDEX IF NOT EXISTS idx_column_descriptions_user_id ON column_descriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_column_descriptions_expense_column ON column_descriptions(expense_id, column_name);

-- Indexes for sheet_categories table
CREATE INDEX IF NOT EXISTS idx_sheet_categories_sheet_id ON sheet_categories(sheet_id);
CREATE INDEX IF NOT EXISTS idx_sheet_categories_category ON sheet_categories(category);
CREATE INDEX IF NOT EXISTS idx_sheet_categories_sheet_category ON sheet_categories(sheet_id, category);
CREATE INDEX IF NOT EXISTS idx_sheet_categories_display_order ON sheet_categories(sheet_id, display_order);

