// Type definitions for the API
export interface Expense {
  id: string
  date: string
  amount: number
  category: string
  description?: string
  user_id?: string
  sheet_id?: string
  created_at?: string
}

export interface ColumnDescription {
  id: string
  expense_id: string
  column_name: string
  description: string
  user_id?: string
  created_at?: string
}

export interface ExpenseSheet {
  id: string
  name: string
  pin?: string | null
  has_pin: boolean
  user_id: string
  created_at: string
}

export interface ApiResponse<T> {
  data: T
  count?: number
  filters?: any
  error?: string
}

export interface PaginationParams {
  limit?: number
  offset?: number
}

export interface DateFilters {
  month?: string // YYYY-MM format
  year?: string
  startDate?: string
  endDate?: string
}

export interface ExpenseFilters extends DateFilters, PaginationParams {
  sheetId?: string
  category?: string
  minAmount?: number
  maxAmount?: number
}

export interface AnalyticsData {
  categoryTotals: Record<string, number>
  monthlyTotals: Record<string, number>
  dailyTotals: Record<string, number>
  currentMonthTotal: number
  previousMonthTotal: number
  topCategories: Array<{ category: string; total: number }>
  monthlyComparison: {
    current: number
    previous: number
    percentChange: number
  }
}
