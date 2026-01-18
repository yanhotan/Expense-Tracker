class CreateColumnDescriptions < ActiveRecord::Migration[7.1]
  def change
    create_table :column_descriptions, id: :uuid do |t|
      t.references :expense, null: false, foreign_key: true, type: :uuid
      t.string :column_name, null: false, default: "notes"
      t.text :description, null: false
      t.references :user, null: false, foreign_key: true, type: :uuid

      t.timestamps
    end

    add_index :column_descriptions, [:expense_id, :column_name], unique: true
  end
end
