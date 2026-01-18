module Api
  module V1
    class CategoriesController < BaseController
      before_action :set_sheet
      before_action :set_category, only: [:update, :destroy]

      def index
        categories = @sheet.sheet_categories.ordered.pluck(:name)
        render_success(categories, count: categories.count)
      end

      def create
        category = @sheet.sheet_categories.build(name: params[:category])

        if category.save
          render_success(category.name, status: :created)
        else
          render_error("VALIDATION_ERROR", category.errors.full_messages.join(", "), :unprocessable_entity)
        end
      end

      def update
        old_name = @category.name
        
        if @category.update(name: params[:newName])
          # Update all expenses with the old category name
          @sheet.expenses.where(category: old_name).update_all(category: @category.name)
          render_success(@category.name)
        else
          render_error("VALIDATION_ERROR", @category.errors.full_messages.join(", "), :unprocessable_entity)
        end
      end

      def destroy
        # Move expenses to "uncategorized" before deleting
        @sheet.expenses.where(category: @category.name).update_all(category: "uncategorized")
        @sheet.sheet_categories.find_or_create_by!(name: "uncategorized")
        
        @category.destroy
        render_success(nil, message: "Category deleted successfully")
      end

      private

      def set_sheet
        @sheet = current_user.expense_sheets.find(params[:sheetId])
      end

      def set_category
        # Find by name for update/delete operations
        category_name = params[:oldName] || params[:category]
        @category = @sheet.sheet_categories.find_by!(name: category_name)
      end
    end
  end
end
