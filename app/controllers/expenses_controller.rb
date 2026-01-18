class ExpensesController < ApplicationController
  before_action :set_expense_sheet
  before_action :set_expense, only: [:show, :edit, :update, :destroy]

  def index
    @expenses = @expense_sheet.expenses.ordered

    if params[:month].present?
      year, month = params[:month].split("-").map(&:to_i)
      @expenses = @expenses.for_month(month, year)
    end

    respond_to do |format|
      format.html
      format.json { render json: { data: @expenses, count: @expenses.count } }
    end
  end

  def show
    respond_to do |format|
      format.html
      format.json { render json: { data: @expense } }
    end
  end

  def new
    @expense = @expense_sheet.expenses.build(date: Date.today)
    @categories = @expense_sheet.categories
  end

  def create
    @expense = @expense_sheet.expenses.build(expense_params)
    @expense.user = current_user

    respond_to do |format|
      if @expense.save
        format.html { redirect_to expense_sheet_path(@expense_sheet), notice: "Expense added successfully." }
        format.turbo_stream
        format.json { render json: { data: @expense }, status: :created }
      else
        format.html { render :new, status: :unprocessable_entity }
        format.turbo_stream { render :create_error, status: :unprocessable_entity }
        format.json { render json: { error: @expense.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def edit
    @categories = @expense_sheet.categories
  end

  def update
    respond_to do |format|
      if @expense.update(expense_params)
        format.html { redirect_to expense_sheet_path(@expense_sheet), notice: "Expense updated successfully." }
        format.turbo_stream
        format.json { render json: { data: @expense } }
      else
        format.html { render :edit, status: :unprocessable_entity }
        format.turbo_stream { render :update_error, status: :unprocessable_entity }
        format.json { render json: { error: @expense.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @expense.destroy

    respond_to do |format|
      format.html { redirect_to expense_sheet_path(@expense_sheet), notice: "Expense deleted." }
      format.turbo_stream
      format.json { render json: { success: true } }
    end
  end

  private

  def set_expense_sheet
    @expense_sheet = current_user.expense_sheets.find(params[:expense_sheet_id])
  end

  def set_expense
    @expense = @expense_sheet.expenses.find(params[:id])
  end

  def expense_params
    params.require(:expense).permit(:date, :amount, :category, :description)
  end
end
