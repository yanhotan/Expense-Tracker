class CreateSheetCategories < ActiveRecord::Migration[7.1]
  def change
    create_table :sheet_categories, id: :uuid do |t|
      t.references :expense_sheet, null: false, foreign_key: true, type: :uuid
      t.string :name, null: false
      t.integer :display_order, default: 0

      t.timestamps
    end

    add_index :sheet_categories, [:expense_sheet_id, :name], unique: true
    add_index :sheet_categories, [:expense_sheet_id, :display_order]
  end
end
