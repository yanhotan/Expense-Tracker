module Api
  module V1
    class ExpensesController < BaseController
      before_action :set_expense, only: [:show, :update, :destroy]

      def index
        expenses = current_user.expenses

        # Filter by sheet
        if params[:sheetId].present?
          expenses = expenses.where(expense_sheet_id: params[:sheetId])
        end

        # Filter by month (YYYY-MM format)
        if params[:month].present?
          year, month = params[:month].split("-").map(&:to_i)
          expenses = expenses.for_month(month, year)
        elsif params[:year].present?
          expenses = expenses.for_year(params[:year].to_i)
        end

        expenses = expenses.ordered.includes(:column_description)

        render_success(
          expenses.map { |e| expense_json(e) },
          count: expenses.count,
          filters: { sheetId: params[:sheetId], month: params[:month], year: params[:year] }
        )
      end

      def show
        render_success(expense_json(@expense))
      end

      def create
        sheet = current_user.expense_sheets.find(params[:sheetId])
        expense = sheet.expenses.build(expense_params)
        expense.user = current_user

        if expense.save
          render_success(expense_json(expense), status: :created)
        else
          render_error("VALIDATION_ERROR", expense.errors.full_messages.join(", "), :unprocessable_entity)
        end
      end

      def update
        if @expense.update(expense_params)
          render_success(expense_json(@expense))
        else
          render_error("VALIDATION_ERROR", @expense.errors.full_messages.join(", "), :unprocessable_entity)
        end
      end

      def destroy
        @expense.destroy
        render_success(nil, message: "Expense deleted successfully")
      end

      private

      def set_expense
        @expense = current_user.expenses.find(params[:id])
      end

      def expense_params
        params.permit(:date, :amount, :category, :description)
      end

      def expense_json(expense)
        {
          id: expense.id,
          date: expense.date.to_s,
          amount: expense.amount.to_f,
          category: expense.category,
          description: expense.description,
          user_id: expense.user_id,
          sheetId: expense.expense_sheet_id,
          created_at: expense.created_at.iso8601
        }
      end
    end
  end
end
