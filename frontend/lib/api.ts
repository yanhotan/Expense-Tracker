// New API-based data fetching functions
import { Expense, ColumnDescription } from './types.js'

// Base API configuration
const API_BASE = 'http://localhost:4000/api'

// Generic API request function with error handling
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  
  console.log(`API Request: ${options.method || 'GET'} ${url}`);
  if (options.body) {
    console.log('Request body:', options.body);
  }
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

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
      throw new Error(errorData.error || errorData.details || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('API response data:', data);
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
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
    
    return apiRequest<{ data: Expense[]; count: number; filters: any }>(endpoint)
  },

  // Create new expense
  async create(expense: Omit<Expense, 'id' | 'created_at'>) {
    return apiRequest<{ data: Expense }>('/expenses', {
      method: 'POST',
      body: JSON.stringify(expense),
    })
  },

  // Update expense
  async update(id: string, expense: Partial<Expense>) {
    return apiRequest<{ data: Expense }>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(expense),
    })
  },

  // Delete expense
  async delete(id: string) {
    return apiRequest<{ success: boolean }>(`/expenses/${id}`, {
      method: 'DELETE',
    })
  },

  // Batch operations for better performance
  async createBatch(expenses: Omit<Expense, 'id' | 'created_at'>[]) {
    return apiRequest<{ data: Expense[] }>('/expenses/batch', {
      method: 'POST',
      body: JSON.stringify({ expenses }),
    })
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
    return apiRequest<{
      categoryTotals: Record<string, number>
      monthlyTotals: Record<string, number>
      dailyTotals: Record<string, number>
      currentMonthTotal: number
      previousMonthTotal: number
      filters: any
    }>(endpoint)
  }
}

// Sheets API functions
export const sheetsApi = {
  async getAll() {
    return apiRequest<{ data: any[] }>('/sheets')
  },

  async create(sheet: { name: string; pin?: string }) {
    return apiRequest<{ data: any }>('/sheets', {
      method: 'POST',
      body: JSON.stringify(sheet),
    })
  },

  async update(id: string, updates: { name?: string; pin?: string }) {
    return apiRequest<{ data: any }>(`/sheets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
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
    return apiRequest<{ data: string[] }>(`/categories?sheetId=${sheetId}`)
  },
  async create(sheetId: string, category: string) {
    return apiRequest<{ data: string }>(`/categories`, {
      method: 'POST',
      body: JSON.stringify({ sheetId, category }),
    })
  },
  async update(sheetId: string, oldName: string, newName: string) {
    return apiRequest<{ data: string }>(`/categories`, {
      method: 'PUT',
      body: JSON.stringify({ sheetId, oldName, newName }),
    })
  },
  async delete(sheetId: string, category: string) {
    return apiRequest<{ success: boolean }>(`/categories`, {
      method: 'DELETE',
      body: JSON.stringify({ sheetId, category }),
    })
  },
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
    
    return apiRequest<{ data: ColumnDescription[] }>(endpoint)
  },
  
  async saveDescription(expenseId: string, description: string, columnName: string = 'notes') {
    return apiRequest<{ data: ColumnDescription }>('/descriptions', {
      method: 'POST',
      body: JSON.stringify({ expense_id: expenseId, description, column_name: columnName }),
    })
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
  const res = await fetch(`/api/expenses/${id}`, {
    method: "DELETE",
  })
  if (!res.ok) {
    throw new Error("Failed to delete expense")
  }
  return true
}

// Update an expense by ID via API
export async function updateExpenseApi(expense: {
  id: string
  amount: number
  category: string
  description?: string
  date: string
}) {
  const res = await fetch(`/api/expenses/${expense.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(expense),
  })
  if (!res.ok) {
    throw new Error("Failed to update expense")
  }
  return await res.json()
}

// Fetch unique categories from the API
export async function getCategoriesApi() {
  const res = await fetch("/api/categories")
  if (!res.ok) {
    throw new Error("Failed to fetch categories")
  }
  return await res.json()
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
