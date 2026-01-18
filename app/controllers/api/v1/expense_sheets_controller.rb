module Api
  module V1
    class ExpenseSheetsController < BaseController
      before_action :set_sheet, only: [:show, :update, :destroy, :analytics]

      def index
        sheets = current_user.expense_sheets.ordered
        render_success(sheets.map { |s| sheet_json(s) }, count: sheets.count)
      end

      def show
        render_success(sheet_json(@sheet))
      end

      def create
        sheet = current_user.expense_sheets.build(sheet_params)

        if sheet.save
          create_default_categories(sheet)
          render_success(sheet_json(sheet), status: :created)
        else
          render_error("VALIDATION_ERROR", sheet.errors.full_messages.join(", "), :unprocessable_entity)
        end
      end

      def update
        if @sheet.update(sheet_params)
          render_success(sheet_json(@sheet))
        else
          render_error("VALIDATION_ERROR", @sheet.errors.full_messages.join(", "), :unprocessable_entity)
        end
      end

      def destroy
        @sheet.destroy
        render_success(nil, message: "Sheet deleted successfully")
      end

      def analytics
        month = params[:month]&.to_i || Date.today.month
        year = params[:year]&.to_i || Date.today.year

        expenses = @sheet.expenses
        current_date = Date.new(year, month, 1)
        previous_date = current_date - 1.month

        current_expenses = expenses.for_month(month, year)
        previous_expenses = expenses.for_month(previous_date.month, previous_date.year)

        analytics = {
          categoryTotals: current_expenses.group(:category).sum(:amount).transform_values(&:to_f),
          monthlyTotals: expenses.for_year(year).group_by { |e| e.date.strftime("%Y-%m") }
                                 .transform_values { |exps| exps.sum(&:amount).to_f },
          dailyTotals: current_expenses.group(:date).sum(:amount)
                                       .transform_keys(&:to_s)
                                       .transform_values(&:to_f),
          currentMonthTotal: current_expenses.sum(:amount).to_f,
          previousMonthTotal: previous_expenses.sum(:amount).to_f,
          categories: @sheet.categories
        }

        render_success(analytics)
      end

      private

      def set_sheet
        @sheet = current_user.expense_sheets.find(params[:id])
      end

      def sheet_params
        params.permit(:name, :pin)
      end

      def sheet_json(sheet)
        {
          id: sheet.id,
          name: sheet.name,
          has_pin: sheet.has_pin,
          user_id: sheet.user_id,
          created_at: sheet.created_at.iso8601
        }
      end

      def create_default_categories(sheet)
        default_categories = %w[food transport utilities entertainment shopping healthcare education savings other]
        default_categories.each_with_index do |name, index|
          sheet.sheet_categories.create!(name: name, display_order: index)
        end
      end
    end
  end
end
