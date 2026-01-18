class CreateExpenses < ActiveRecord::Migration[7.1]
  def change
    create_table :expenses, id: :uuid do |t|
      t.date :date, null: false
      t.decimal :amount, precision: 15, scale: 2, null: false
      t.string :category, null: false
      t.text :description
      t.references :user, null: false, foreign_key: true, type: :uuid
      t.references :expense_sheet, null: false, foreign_key: true, type: :uuid

      t.timestamps
    end

    add_index :expenses, [:user_id, :expense_sheet_id, :date]
    add_index :expenses, [:expense_sheet_id, :category]
    add_index :expenses, [:expense_sheet_id, :date, :category], unique: true, name: "idx_expenses_unique_date_category"
  end
end
