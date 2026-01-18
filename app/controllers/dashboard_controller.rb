class DashboardController < ApplicationController
  skip_before_action :authenticate_user!, only: [:index]

  def index
    if user_signed_in?
      @expense_sheets = current_user.expense_sheets.ordered.includes(:expenses)
      @current_sheet = @expense_sheets.first
      
      if @current_sheet
        @current_month = Date.today.beginning_of_month
        @expenses = @current_sheet.expenses.for_month(@current_month.month, @current_month.year).ordered
        @categories = @current_sheet.sheet_categories.ordered
        @analytics = calculate_analytics(@current_sheet)
      end
    end
    
    render :index
  end

  private

  def calculate_analytics(sheet)
    return {} unless sheet

    current_date = Date.today
    current_expenses = sheet.expenses.for_month(current_date.month, current_date.year)
    previous_month = current_date - 1.month
    previous_expenses = sheet.expenses.for_month(previous_month.month, previous_month.year)

    {
      category_totals: current_expenses.group(:category).sum(:amount),
      current_month_total: current_expenses.sum(:amount),
      previous_month_total: previous_expenses.sum(:amount)
    }
  end
end
