class Expense < ApplicationRecord
  # Associations
  belongs_to :user
  belongs_to :expense_sheet
  has_one :column_description, dependent: :destroy

  # Validations
  validates :date, presence: true
  validates :amount, presence: true, numericality: true
  validates :category, presence: true, length: { maximum: 100 }
  validates :date, uniqueness: { 
    scope: [:expense_sheet_id, :category], 
    message: "already has an expense in this category" 
  }

  # Callbacks
  before_validation :normalize_category

  # Scopes
  scope :ordered, -> { order(date: :desc) }
  scope :for_sheet, ->(sheet_id) { where(expense_sheet_id: sheet_id) }
  scope :for_category, ->(category) { where(category: category) }
  scope :for_month, ->(month, year) { 
    start_date = Date.new(year.to_i, month.to_i, 1)
    end_date = start_date.end_of_month
    where(date: start_date..end_date)
  }
  scope :for_year, ->(year) { 
    start_date = Date.new(year.to_i, 1, 1)
    end_date = Date.new(year.to_i, 12, 31)
    where(date: start_date..end_date)
  }
  scope :for_date_range, ->(start_date, end_date) { where(date: start_date..end_date) }

  # Class methods
  def self.category_totals(scope = all)
    scope.group(:category).sum(:amount)
  end

  def self.monthly_totals(scope = all)
    scope.group_by_month(:date, format: "%Y-%m").sum(:amount)
  end

  def self.daily_totals(scope = all)
    scope.group(:date).sum(:amount)
  end

  # Instance methods
  def formatted_date
    date.strftime("%Y-%m-%d")
  end

  def formatted_amount
    ActionController::Base.helpers.number_to_currency(amount)
  end

  private

  def normalize_category
    self.category = category.downcase.strip if category.present?
  end
end
