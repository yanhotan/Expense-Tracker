module Api
  module V1
    class DescriptionsController < BaseController
      before_action :set_description, only: [:show, :destroy]

      def index
        descriptions = current_user.column_descriptions

        if params[:expenseId].present?
          descriptions = descriptions.where(expense_id: params[:expenseId])
        end

        if params[:sheetId].present?
          expense_ids = current_user.expenses.where(expense_sheet_id: params[:sheetId]).pluck(:id)
          descriptions = descriptions.where(expense_id: expense_ids)
        end

        if params[:columnName].present?
          descriptions = descriptions.where(column_name: params[:columnName])
        end

        render_success(
          descriptions.map { |d| description_json(d) },
          count: descriptions.count
        )
      end

      def show
        render_success(description_json(@description))
      end

      def create
        expense = current_user.expenses.find(params[:expense_id])
        
        # Find or create description for this expense/column
        description = ColumnDescription.find_or_initialize_by(
          expense_id: expense.id,
          column_name: params[:column_name] || "notes"
        )
        
        description.user = current_user
        description.description = params[:description]

        if description.save
          render_success(description_json(description), status: :created)
        else
          render_error("VALIDATION_ERROR", description.errors.full_messages.join(", "), :unprocessable_entity)
        end
      end

      def destroy
        @description.destroy
        render_success(nil, message: "Description deleted successfully")
      end

      def destroy_by_expense
        expense_id = params[:expense_id]
        column_name = params[:columnName]

        descriptions = current_user.column_descriptions.where(expense_id: expense_id)
        descriptions = descriptions.where(column_name: column_name) if column_name.present?
        
        deleted_count = descriptions.destroy_all.count
        render_success(nil, message: "Deleted #{deleted_count} description(s)")
      end

      private

      def set_description
        @description = current_user.column_descriptions.find(params[:id])
      end

      def description_json(description)
        {
          id: description.id,
          expense_id: description.expense_id,
          column_name: description.column_name,
          description: description.description,
          user_id: description.user_id,
          created_at: description.created_at.iso8601
        }
      end
    end
  end
end
