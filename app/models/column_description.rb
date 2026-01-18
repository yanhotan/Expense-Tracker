class ColumnDescription < ApplicationRecord
  # Associations
  belongs_to :expense
  belongs_to :user

  # Validations
  validates :description, presence: true
  validates :column_name, presence: true, length: { maximum: 50 }
  validates :expense_id, uniqueness: { scope: :column_name, message: "already has a description for this column" }

  # Scopes
  scope :for_expense, ->(expense_id) { where(expense_id: expense_id) }
  scope :for_column, ->(column_name) { where(column_name: column_name) }

  # Callbacks
  before_validation :set_defaults

  private

  def set_defaults
    self.column_name ||= "notes"
  end
end
