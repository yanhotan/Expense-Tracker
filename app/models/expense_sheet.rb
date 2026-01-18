class ExpenseSheet < ApplicationRecord
  # Default categories that are created for new sheets
  DEFAULT_CATEGORIES = %w[food transport utilities entertainment shopping healthcare education savings other].freeze

  # Associations
  belongs_to :user
  has_many :expenses, dependent: :destroy
  has_many :sheet_categories, dependent: :destroy

  # Validations
  validates :name, presence: true, length: { maximum: 100 }
  validates :name, uniqueness: { scope: :user_id, message: "already exists" }
  validates :pin, length: { is: 4 }, allow_blank: true, numericality: { only_integer: true }, if: -> { pin.present? }

  # Callbacks
  before_save :update_has_pin
  after_create :create_default_categories

  # Scopes
  scope :ordered, -> { order(created_at: :desc) }

  # Instance methods
  def verify_pin(input_pin)
    return true unless has_pin?
    return false if input_pin.blank?
    pin == input_pin.to_s
  end

  def pin_protected?
    has_pin? && pin.present?
  end

  def categories
    sheet_categories.ordered.pluck(:name)
  end

  def category_objects
    sheet_categories.ordered
  end

  def total_expenses(month: nil, year: nil)
    scope = expenses
    scope = scope.for_month(month, year) if month && year
    scope.sum(:amount)
  end

  def expenses_by_category(month: nil, year: nil)
    scope = expenses
    scope = scope.for_month(month, year) if month && year
    scope.group(:category).sum(:amount)
  end

  def monthly_totals
    expenses.group("DATE_TRUNC('month', date)").sum(:amount).transform_keys do |key|
      key.strftime('%Y-%m')
    end
  end

  def daily_totals(month: nil, year: nil)
    scope = expenses
    scope = scope.for_month(month, year) if month && year
    scope.group(:date).sum(:amount)
  end

  private

  def update_has_pin
    self.has_pin = pin.present?
  end

  def create_default_categories
    DEFAULT_CATEGORIES.each_with_index do |category_name, index|
      sheet_categories.create!(name: category_name, display_order: index)
    end
  end
end
