class SheetCategory < ApplicationRecord
  # Associations
  belongs_to :expense_sheet

  # Validations
  validates :name, presence: true, length: { maximum: 100 }
  validates :name, uniqueness: { scope: :expense_sheet_id, case_sensitive: false }

  # Callbacks
  before_validation :normalize_name
  before_create :set_display_order

  # Scopes
  scope :ordered, -> { order(display_order: :asc, name: :asc) }

  # Instance methods
  def expenses
    expense_sheet.expenses.for_category(name)
  end

  def total
    expenses.sum(:amount)
  end

  private

  def normalize_name
    self.name = name.downcase.strip if name.present?
  end

  def set_display_order
    return if display_order.present?
    max_order = expense_sheet.sheet_categories.maximum(:display_order) || -1
    self.display_order = max_order + 1
  end
end
