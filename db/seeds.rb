# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).

puts "Seeding database..."

# Create a demo user
demo_user = User.find_or_create_by!(email: "demo@expense-tracker.local") do |user|
  user.password = "password123"
  user.password_confirmation = "password123"
  user.name = "Demo User"
end

puts "Created demo user: #{demo_user.email}"

# Create default expense sheets
sheets_data = [
  { name: "Personal Expenses" },
  { name: "Business Expenses" },
  { name: "Family Budget" }
]

sheets_data.each do |sheet_data|
  sheet = ExpenseSheet.find_or_create_by!(user: demo_user, name: sheet_data[:name])
  puts "Created expense sheet: #{sheet.name}"

  # Create default categories for each sheet
  default_categories = %w[food transport utilities entertainment shopping healthcare education savings other]
  
  default_categories.each_with_index do |category, index|
    SheetCategory.find_or_create_by!(expense_sheet: sheet, name: category) do |cat|
      cat.display_order = index
    end
  end

  # Add some sample expenses for the first sheet
  if sheet.name == "Personal Expenses" && sheet.expenses.empty?
    today = Date.today
    sample_expenses = [
      { date: today - 1.day, amount: 45.50, category: "food", description: "Grocery shopping" },
      { date: today - 2.days, amount: 25.00, category: "transport", description: "Gas" },
      { date: today - 3.days, amount: 120.00, category: "utilities", description: "Electric bill" },
      { date: today - 4.days, amount: 35.99, category: "entertainment", description: "Netflix subscription" },
      { date: today - 5.days, amount: 89.99, category: "shopping", description: "New headphones" },
      { date: today, amount: 15.00, category: "food", description: "Lunch" }
    ]

    sample_expenses.each do |expense_data|
      Expense.create!(
        user: demo_user,
        expense_sheet: sheet,
        **expense_data
      )
    end
    puts "Created #{sample_expenses.length} sample expenses for #{sheet.name}"
  end
end

puts "Seeding completed!"
