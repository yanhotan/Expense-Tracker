class CreateExpenseSheets < ActiveRecord::Migration[7.1]
  def change
    create_table :expense_sheets, id: :uuid do |t|
      t.string :name, null: false
      t.string :pin
      t.boolean :has_pin, default: false
      t.references :user, null: false, foreign_key: true, type: :uuid

      t.timestamps
    end

    add_index :expense_sheets, [:user_id, :name]
  end
end
