# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.1].define(version: 2024_01_01_000006) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pgcrypto"
  enable_extension "plpgsql"

  create_table "column_descriptions", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "expense_id", null: false
    t.string "column_name", default: "notes", null: false
    t.text "description", null: false
    t.uuid "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["expense_id", "column_name"], name: "index_column_descriptions_on_expense_id_and_column_name", unique: true
    t.index ["expense_id"], name: "index_column_descriptions_on_expense_id"
    t.index ["user_id"], name: "index_column_descriptions_on_user_id"
  end

  create_table "expense_sheets", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name", null: false
    t.string "pin"
    t.boolean "has_pin", default: false
    t.uuid "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "name"], name: "index_expense_sheets_on_user_id_and_name"
    t.index ["user_id"], name: "index_expense_sheets_on_user_id"
  end

  create_table "expenses", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.date "date", null: false
    t.decimal "amount", precision: 15, scale: 2, null: false
    t.string "category", null: false
    t.text "description"
    t.uuid "user_id", null: false
    t.uuid "expense_sheet_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["expense_sheet_id", "category"], name: "index_expenses_on_expense_sheet_id_and_category"
    t.index ["expense_sheet_id", "date", "category"], name: "idx_expenses_unique_date_category", unique: true
    t.index ["expense_sheet_id"], name: "index_expenses_on_expense_sheet_id"
    t.index ["user_id", "expense_sheet_id", "date"], name: "index_expenses_on_user_id_and_expense_sheet_id_and_date"
    t.index ["user_id"], name: "index_expenses_on_user_id"
  end

  create_table "sheet_categories", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "expense_sheet_id", null: false
    t.string "name", null: false
    t.integer "display_order", default: 0
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["expense_sheet_id", "display_order"], name: "index_sheet_categories_on_expense_sheet_id_and_display_order"
    t.index ["expense_sheet_id", "name"], name: "index_sheet_categories_on_expense_sheet_id_and_name", unique: true
    t.index ["expense_sheet_id"], name: "index_sheet_categories_on_expense_sheet_id"
  end

  create_table "users", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "name"
    t.string "picture"
    t.string "google_id"
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.integer "sign_in_count", default: 0, null: false
    t.datetime "current_sign_in_at"
    t.datetime "last_sign_in_at"
    t.string "current_sign_in_ip"
    t.string "last_sign_in_ip"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["google_id"], name: "index_users_on_google_id", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "column_descriptions", "expenses"
  add_foreign_key "column_descriptions", "users"
  add_foreign_key "expense_sheets", "users"
  add_foreign_key "expenses", "expense_sheets"
  add_foreign_key "expenses", "users"
  add_foreign_key "sheet_categories", "expense_sheets"
end
