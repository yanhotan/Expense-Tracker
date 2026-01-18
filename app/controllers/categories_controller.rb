class CategoriesController < ApplicationController
  before_action :set_expense_sheet
  before_action :set_category, only: [:update, :destroy]

  def index
    @categories = @expense_sheet.sheet_categories.ordered

    respond_to do |format|
      format.html
      format.json { render json: { data: @categories.pluck(:name), count: @categories.count } }
    end
  end

  def create
    @category = @expense_sheet.sheet_categories.build(category_params)

    respond_to do |format|
      if @category.save
        format.html { redirect_to expense_sheet_path(@expense_sheet), notice: "Category added." }
        format.turbo_stream
        format.json { render json: { data: @category.name }, status: :created }
      else
        format.html { redirect_to expense_sheet_path(@expense_sheet), alert: @category.errors.full_messages.join(", ") }
        format.json { render json: { error: @category.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def update
    old_name = @category.name
    
    respond_to do |format|
      if @category.update(category_params)
        # Update all expenses with the old category name to the new name
        @expense_sheet.expenses.where(category: old_name).update_all(category: @category.name)
        
        format.html { redirect_to expense_sheet_path(@expense_sheet), notice: "Category renamed." }
        format.turbo_stream
        format.json { render json: { data: @category.name } }
      else
        format.html { redirect_to expense_sheet_path(@expense_sheet), alert: @category.errors.full_messages.join(", ") }
        format.json { render json: { error: @category.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    # Move expenses to "uncategorized" before deleting the category
    @expense_sheet.expenses.where(category: @category.name).update_all(category: "uncategorized")
    
    # Ensure "uncategorized" category exists
    @expense_sheet.sheet_categories.find_or_create_by!(name: "uncategorized")
    
    @category.destroy

    respond_to do |format|
      format.html { redirect_to expense_sheet_path(@expense_sheet), notice: "Category deleted." }
      format.turbo_stream
      format.json { render json: { success: true } }
    end
  end

  private

  def set_expense_sheet
    @expense_sheet = current_user.expense_sheets.find(params[:expense_sheet_id])
  end

  def set_category
    @category = @expense_sheet.sheet_categories.find(params[:id])
  end

  def category_params
    params.require(:sheet_category).permit(:name, :display_order)
  end
end
