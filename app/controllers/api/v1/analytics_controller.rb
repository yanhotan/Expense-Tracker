module Api
  module V1
    class AnalyticsController < BaseController
      def show
        sheet = current_user.expense_sheets.find(params[:sheetId])
        
        month = params[:month]&.to_i || Date.today.month
        year = params[:year]&.to_i || Date.today.year

        expenses = sheet.expenses
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
          categories: sheet.categories,
          filters: {
            sheetId: params[:sheetId],
            month: month,
            year: year
          }
        }

        render_success(analytics)
      end
    end
  end
end
