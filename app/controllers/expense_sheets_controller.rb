class ExpenseSheetsController < ApplicationController
  before_action :set_expense_sheet, only: [:show, :edit, :update, :destroy, :verify_pin, :analytics]

  def index
    @expense_sheets = current_user.expense_sheets.ordered
  end

  def show
    @current_month = params[:month] ? Date.parse(params[:month] + "-01") : Date.today.beginning_of_month
    @expenses = @expense_sheet.expenses.for_month(@current_month.month, @current_month.year).ordered
    @categories = @expense_sheet.sheet_categories.ordered
    @column_descriptions = ColumnDescription.where(expense_id: @expenses.pluck(:id))
                                           .index_by(&:expense_id)
  end

  def new
    @expense_sheet = current_user.expense_sheets.build
  end

  def create
    @expense_sheet = current_user.expense_sheets.build(expense_sheet_params)

    if @expense_sheet.save
      create_default_categories(@expense_sheet)
      respond_to do |format|
        format.html { redirect_to @expense_sheet, notice: "Sheet created successfully." }
        format.turbo_stream
      end
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @expense_sheet.update(expense_sheet_params)
      respond_to do |format|
        format.html { redirect_to @expense_sheet, notice: "Sheet updated successfully." }
        format.turbo_stream
      end
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @expense_sheet.destroy
    respond_to do |format|
      format.html { redirect_to expense_sheets_path, notice: "Sheet deleted successfully." }
      format.turbo_stream
    end
  end

  def verify_pin
    if @expense_sheet.verify_pin(params[:pin])
      session["sheet_#{@expense_sheet.id}_verified"] = true
      redirect_to @expense_sheet
    else
      flash.now[:alert] = "Invalid PIN"
      render :show
    end
  end

  def analytics
    month = params[:month]&.to_i || Date.today.month
    year = params[:year]&.to_i || Date.today.year

    expenses = @expense_sheet.expenses
    
    current_date = Date.new(year, month, 1)
    previous_date = current_date - 1.month

    current_expenses = expenses.for_month(month, year)
    previous_expenses = expenses.for_month(previous_date.month, previous_date.year)

    @analytics = {
      category_totals: current_expenses.group(:category).sum(:amount),
      monthly_totals: expenses.for_year(year).group_by { |e| e.date.strftime("%Y-%m") }
                              .transform_values { |exps| exps.sum(&:amount) },
      daily_totals: current_expenses.group(:date).sum(:amount),
      current_month_total: current_expenses.sum(:amount),
      previous_month_total: previous_expenses.sum(:amount),
      categories: @expense_sheet.categories
    }

    respond_to do |format|
      format.html
      format.json { render json: @analytics }
    end
  end

  private

  def set_expense_sheet
    @expense_sheet = current_user.expense_sheets.find(params[:id])
  end

  def expense_sheet_params
    params.require(:expense_sheet).permit(:name, :pin)
  end

  def create_default_categories(sheet)
    default_categories = %w[food transport utilities entertainment shopping healthcare education savings other]
    default_categories.each_with_index do |name, index|
      sheet.sheet_categories.create!(name: name, display_order: index)
    end
  end
end
