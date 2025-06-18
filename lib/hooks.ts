// React Query hooks for data fetching
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expenseApi, analyticsApi, sheetsApi, categoriesApi, cacheKeys } from './api'
import { Expense, ExpenseFilters, AnalyticsData } from './types'
import { toast } from '@/components/ui/use-toast'

// Expense hooks
export function useExpenses(filters: ExpenseFilters = {}) {
  return useQuery({
    queryKey: cacheKeys.expenses(filters),
    queryFn: () => expenseApi.getAll(filters),
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: expenseApi.create,
    onMutate: async (newExpense) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['expenses'] })
      
      // Snapshot previous value
      const previousExpenses = queryClient.getQueriesData({ queryKey: ['expenses'] })
      
      // Optimistically update the cache
      queryClient.setQueriesData({ queryKey: ['expenses'] }, (old: any) => {
        if (!old) return old
        
        const optimisticExpense = {
          ...newExpense,
          id: `temp-${Date.now()}`,
          created_at: new Date().toISOString()
        }
        
        return {
          ...old,
          data: [optimisticExpense, ...old.data],
          count: old.count + 1
        }
      })
      
      return { previousExpenses }
    },
    onError: (err, newExpense, context) => {
      // Rollback on error
      if (context?.previousExpenses) {
        context.previousExpenses.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      
      toast({
        title: "Error",
        description: "Failed to create expense. Please try again.",
        variant: "destructive",
      })
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      
      toast({
        title: "Success",
        description: "Expense created successfully.",
      })
    },
  })
}

export function useUpdateExpense() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Expense>) => 
      expenseApi.update(id, data),
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ['expenses'] })
      
      const previousExpenses = queryClient.getQueriesData({ queryKey: ['expenses'] })
      
      // Optimistically update
      queryClient.setQueriesData({ queryKey: ['expenses'] }, (old: any) => {
        if (!old) return old
        
        return {
          ...old,
          data: old.data.map((expense: Expense) => 
            expense.id === id ? { ...expense, ...updates } : expense
          )
        }
      })
      
      return { previousExpenses }
    },
    onError: (err, variables, context) => {
      if (context?.previousExpenses) {
        context.previousExpenses.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      
      toast({
        title: "Error",
        description: "Failed to update expense. Please try again.",
        variant: "destructive",
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      
      toast({
        title: "Success",
        description: "Expense updated successfully.",
      })
    },
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: expenseApi.delete,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['expenses'] })
      
      const previousExpenses = queryClient.getQueriesData({ queryKey: ['expenses'] })
      
      // Optimistically remove
      queryClient.setQueriesData({ queryKey: ['expenses'] }, (old: any) => {
        if (!old) return old
        
        return {
          ...old,
          data: old.data.filter((expense: Expense) => expense.id !== id),
          count: old.count - 1
        }
      })
      
      return { previousExpenses }
    },
    onError: (err, id, context) => {
      if (context?.previousExpenses) {
        context.previousExpenses.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      
      toast({
        title: "Error",
        description: "Failed to delete expense. Please try again.",
        variant: "destructive",
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      
      toast({
        title: "Success",
        description: "Expense deleted successfully.",
      })
    },
  })
}

// Analytics hooks
export function useAnalytics(filters: { sheetId?: string; month?: string; year?: string } = {}) {
  return useQuery({
    queryKey: cacheKeys.analytics(filters),
    queryFn: () => analyticsApi.getAll(filters),
    staleTime: 60 * 1000, // 1 minute
  })
}

// Sheets hooks
export function useSheets() {
  return useQuery({
    queryKey: cacheKeys.sheets(),
    queryFn: sheetsApi.getAll,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })
}

export function useCreateSheet() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: sheetsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheets'] })
      
      toast({
        title: "Success",
        description: "Sheet created successfully.",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create sheet. Please try again.",
        variant: "destructive",
      })
    },
  })
}

// Categories hooks
export function useCategories(sheetId: string) {
  return useQuery({
    queryKey: cacheKeys.categories(sheetId),
    queryFn: () => categoriesApi.getAll(sheetId),
    enabled: !!sheetId,
    staleTime: 2 * 60 * 1000 // 2 minutes
  })
}

// Utility hooks for common patterns
export function useExpensesByMonth(sheetId?: string, month?: Date) {
  const monthStr = month ? 
    `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}` : 
    undefined

  return useExpenses({
    sheetId,
    month: monthStr,
  })
}

export function useCurrentMonthAnalytics(sheetId?: string) {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  
  return useAnalytics({
    sheetId,
    month: currentMonth,
  })
}
