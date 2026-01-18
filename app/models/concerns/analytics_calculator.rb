module AnalyticsCalculator
  extend ActiveSupport::Concern

  class_methods do
    def calculate_analytics(expenses, month: nil, year: nil)
      current_date = if month && year
        Date.new(year.to_i, month.to_i, 1)
      else
        Date.today
      end

      current_month_start = current_date.beginning_of_month
      current_month_end = current_date.end_of_month
      previous_month_start = (current_date - 1.month).beginning_of_month
      previous_month_end = (current_date - 1.month).end_of_month

      current_expenses = expenses.where(date: current_month_start..current_month_end)
      previous_expenses = expenses.where(date: previous_month_start..previous_month_end)

      {
        category_totals: current_expenses.group(:category).sum(:amount).transform_values(&:to_f),
        monthly_totals: expenses.group_by { |e| e.date.strftime("%Y-%m") }
                               .transform_values { |exps| exps.sum(&:amount).to_f },
        daily_totals: current_expenses.group(:date).sum(:amount)
                                      .transform_keys { |d| d.to_s }
                                      .transform_values(&:to_f),
        current_month_total: current_expenses.sum(:amount).to_f,
        previous_month_total: previous_expenses.sum(:amount).to_f,
        categories: expenses.distinct.pluck(:category).sort
      }
    end
  end
end
