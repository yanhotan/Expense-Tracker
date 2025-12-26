// API configuration for connecting to Spring Boot backend
import { Expense, ColumnDescription } from './types.js'

// Spring Boot Backend - Single source for all API calls
const SPRING_BOOT_API = 'http://localhost:8080/api'

// Use Spring Boot backend for all API calls
const API_BASE = process.env.NODE_ENV === 'production'
  ? '/api'  // Production: use Next.js proxy or same domain
  : SPRING_BOOT_API  // Development: connect directly to Spring Boot

console.log(`🔗 API Base URL: ${API_BASE}`)

// All endpoints now use Spring Boot backend
function getApiBase(endpoint: string): string {
  return API_BASE
}

// Get JWT token from NextAuth session
async function getAuthToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/session')
    if (response.ok) {
      const session = await response.json()
      return session?.user?.accessToken || null
    }
  } catch (error) {
    console.error('Failed to get auth token:', error)
  }
  return null
}

// Generic API request function with error handling
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBase(endpoint)
  const url = `${baseUrl}${endpoint}`

  console.log(`API Request: ${options.method || 'GET'} ${url}`);
  if (options.body) {
    console.log('Request body:', options.body);
  }

  try {
    // Get JWT token for authenticated requests
    const token = await getAuthToken()
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // Add timeout to prevent hanging requests
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      ...options,
    })

    clearTimeout(timeoutId)

    // Log the response status for debugging
    console.log(`API Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: 'Network error' };
      }

      console.error('API error response:', errorData);
      throw new Error(errorData.error || errorData.message || errorData.details || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('API response data:', data);
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Transform Spring Boot response to match frontend expected format
function transformExpense(expense: any): Expense {
  return {
    id: expense.id,
    date: expense.date,
    amount: Number(expense.amount),
    category: expense.category,
    description: expense.description,
    user_id: expense.userId,
    sheet_id: expense.sheetId,
    created_at: expense.createdAt
  }
}

// Expense API functions
export const expenseApi = {
  // Get expenses with filters
  async getAll(params: {
    sheetId?: string
    month?: string // YYYY-MM format
    year?: string
    limit?: number
    offset?: number
  } = {}) {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString())
      }
    })

    const queryString = searchParams.toString()
    const endpoint = `/expenses${queryString ? `?${queryString}` : ''}`

    const response = await apiRequest<{ data: any[]; count: number; success: boolean }>(endpoint)

    // Transform to frontend format
    return {
      data: (response.data || []).map(transformExpense),
      count: response.count || 0,
      filters: params
    }
  },

  // Create new expense
  async create(expense: Omit<Expense, 'id' | 'created_at' | 'user_id'>) {
    const payload = {
      date: expense.date,
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      sheetId: expense.sheet_id
    }

    const response = await apiRequest<{ data: any; success: boolean }>('/expenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    return { data: transformExpense(response.data) }
  },

  // Update expense
  async update(id: string, expense: Partial<Expense>) {
    const payload: any = {}
    if (expense.date !== undefined) payload.date = expense.date
    if (expense.amount !== undefined) payload.amount = expense.amount
    if (expense.category !== undefined) payload.category = expense.category
    if (expense.description !== undefined) payload.description = expense.description
    if (expense.sheet_id !== undefined) payload.sheetId = expense.sheet_id

    const response = await apiRequest<{ data: any; success: boolean }>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })

    return { data: transformExpense(response.data) }
  },

  // Delete expense
  async delete(id: string) {
    return apiRequest<{ success: boolean }>(`/expenses/${id}`, {
      method: 'DELETE',
    })
  },

  // Batch operations for better performance
  async createBatch(expenses: Omit<Expense, 'id' | 'created_at'>[]) {
    // Process one at a time for now
    const results = []
    for (const expense of expenses) {
      const result = await this.create(expense)
      results.push(result.data)
    }
    return { data: results }
  }
}

// Analytics API functions
export const analyticsApi = {
  async getAll(params: {
    sheetId?: string
    month?: string
    year?: string
  } = {}) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString())
      }
    })
    const queryString = searchParams.toString()
    const endpoint = `/analytics${queryString ? `?${queryString}` : ''}`

    const response = await apiRequest<{ data: any; success: boolean }>(endpoint)
    const analytics = response.data || {}

    // Transform BigDecimal strings to numbers
    const transformTotals = (obj: Record<string, any>) => {
      const result: Record<string, number> = {}
      for (const [key, value] of Object.entries(obj || {})) {
        result[key] = Number(value) || 0
      }
      return result
    }

    return {
      categoryTotals: transformTotals(analytics.categoryTotals),
      monthlyTotals: transformTotals(analytics.monthlyTotals),
      dailyTotals: transformTotals(analytics.dailyTotals),
      currentMonthTotal: Number(analytics.currentMonthTotal) || 0,
      previousMonthTotal: Number(analytics.previousMonthTotal) || 0,
      categories: analytics.categories || [],
      filters: analytics.filters || params
    }
  }
}

// Sheets API functions
export const sheetsApi = {
  async getAll() {
    const response = await apiRequest<{ data: any[]; success: boolean }>('/sheets')

    return {
      data: (response.data || []).map((sheet: any) => ({
        id: sheet.id,
        name: sheet.name,
        pin: sheet.pin,
        has_pin: sheet.hasPin,
        user_id: sheet.userId,
        created_at: sheet.createdAt,
        expense_count: sheet.expenseCount
      }))
    }
  },

  async create(sheet: { name: string; pin?: string }) {
    const response = await apiRequest<{ data: any; success: boolean }>('/sheets', {
      method: 'POST',
      body: JSON.stringify(sheet),
    })

    return { data: response.data }
  },

  async update(id: string, updates: { name?: string; pin?: string }) {
    const response = await apiRequest<{ data: any; success: boolean }>(`/sheets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })

    return { data: response.data }
  },

  async delete(id: string) {
    return apiRequest<{ success: boolean }>(`/sheets/${id}`, {
      method: 'DELETE',
    })
  }
}

// Categories API functions
export const categoriesApi = {
  async getAll(sheetId: string) {
    const response = await apiRequest<{ data: string[]; success: boolean }>(`/categories?sheetId=${sheetId}`)
    return { data: response.data || [] }
  },
  async create(sheetId: string, category: string) {
    const response = await apiRequest<{ data: string; success: boolean }>(`/categories`, {
      method: 'POST',
      body: JSON.stringify({ sheetId, category }),
    })
    return { data: response.data }
  },
  async update(sheetId: string, oldName: string, newName: string) {
    const response = await apiRequest<{ data: string; success: boolean }>(`/categories`, {
      method: 'PUT',
      body: JSON.stringify({ sheetId, oldName, newName }),
    })
    return { data: response.data }
  },
  async delete(sheetId: string, category: string) {
    return apiRequest<{ success: boolean }>(`/categories`, {
      method: 'DELETE',
      body: JSON.stringify({ sheetId, category }),
    })
  },
}

// Transform column description from Spring Boot format
function transformDescription(desc: any): ColumnDescription {
  return {
    id: desc.id,
    expense_id: desc.expenseId,
    column_name: desc.columnName,
    description: desc.description,
    user_id: desc.userId,
    created_at: desc.createdAt
  }
}

// Descriptions API functions
export const descriptionsApi = {
  async getAll(params: { sheetId?: string; expenseId?: string; columnName?: string } = {}) {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString())
      }
    })

    const queryString = searchParams.toString()
    const endpoint = `/descriptions${queryString ? `?${queryString}` : ''}`

    const response = await apiRequest<{ data: any[]; success: boolean }>(endpoint)
    return { data: (response.data || []).map(transformDescription) }
  },

  async saveDescription(expenseId: string, description: string, columnName: string = 'notes') {
    const payload = {
      expenseId: expenseId,
      description: description,
      columnName: columnName
    }

    const response = await apiRequest<{ data: any; success: boolean }>('/descriptions', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    return { data: transformDescription(response.data) }
  },

  async delete(id: string) {
    return apiRequest<{ success: boolean }>(`/descriptions/${id}`, {
      method: 'DELETE',
    })
  },

  async deleteByExpenseId(expenseId: string, columnName?: string) {
    let endpoint = `/descriptions/expense/${expenseId}`;
    if (columnName) {
      endpoint += `?columnName=${encodeURIComponent(columnName)}`;
    }

    return apiRequest<{ success: boolean }>(endpoint, {
      method: 'DELETE',
    })
  }
}

// Delete an expense by ID via API
export async function deleteExpenseApi(id: string) {
  return expenseApi.delete(id)
}

// Update an expense by ID via API
export async function updateExpenseApi(expense: {
  id: string
  amount: number
  category: string
  description?: string
  date: string
}) {
  return expenseApi.update(expense.id, expense)
}

// Fetch unique categories from the API
export async function getCategoriesApi() {
  // This is a legacy function - use categoriesApi.getAll(sheetId) instead
  console.warn('getCategoriesApi is deprecated. Use categoriesApi.getAll(sheetId) instead.')
  return { data: [] }
}

// Utility functions for common data transformations
export const dataUtils = {
  // Format date for API
  formatDateForApi(date: Date): string {
    return date.toISOString().split('T')[0]
  },

  // Format month for API (YYYY-MM)
  formatMonthForApi(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  },

  // Parse API date
  parseApiDate(dateString: string): Date {
    return new Date(dateString)
  },

  // Group expenses by date
  groupExpensesByDate(expenses: Expense[]): Record<string, Expense[]> {
    return expenses.reduce((acc, expense) => {
      const date = expense.date
      if (!acc[date]) acc[date] = []
      acc[date].push(expense)
      return acc
    }, {} as Record<string, Expense[]>)
  },

  // Calculate totals
  calculateTotal(expenses: Expense[]): number {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0)
  },

  // Get unique categories
  getUniqueCategories(expenses: Expense[]): string[] {
    return [...new Set(expenses.map(e => e.category))].filter(Boolean).sort()
  }
}

// Cache keys for React Query
export const cacheKeys = {
  expenses: (params: any) => ['expenses', params],
  analytics: (params: any) => ['analytics', params],
  sheets: () => ['sheets'],
  categories: (sheetId: string) => ['categories', sheetId],
}
