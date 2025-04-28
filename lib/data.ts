"use client"

import { supabase } from './supabase'
import { v4 as uuidv4 } from 'uuid'

export interface Expense {
  id: string
  date: string
  amount: number
  category: string
  description?: string
  user_id?: string
  created_at?: string
}

// Get all expenses from Supabase
export async function getExpenses(): Promise<Expense[]> {
  // When using Supabase, we need to filter by user_id to get only the current user's expenses
  // For now, we'll use a placeholder user_id - this should be replaced with actual auth
  const user_id = "current-user" // In a real app, this would come from authentication

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', user_id)
    .order('date', { ascending: false })

  if (error) {
    console.error('Error fetching expenses:', error)
    return []
  }

  return data || []
}

// Add a new expense
export async function addExpense(expense: Expense): Promise<void> {
  const user_id = "current-user" // In a real app, this would come from authentication
  
  const newExpense = {
    ...expense,
    id: expense.id || uuidv4(),
    user_id,
    created_at: new Date().toISOString()
  }

  const { error } = await supabase
    .from('expenses')
    .insert(newExpense)

  if (error) {
    console.error('Error adding expense:', error)
    throw error
  }
}

// Delete an expense
export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting expense:', error)
    throw error
  }
}

// Update an expense
export async function updateExpense(updatedExpense: Expense): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .update(updatedExpense)
    .eq('id', updatedExpense.id)

  if (error) {
    console.error('Error updating expense:', error)
    throw error
  }
}

// Get totals by category
export async function getCategoryTotals(): Promise<Record<string, number>> {
  const expenses = await getExpenses()
  
  return expenses.reduce(
    (acc, expense) => {
      const category = expense.category
      acc[category] = (acc[category] || 0) + expense.amount
      return acc
    },
    {} as Record<string, number>,
  )
}

// Get monthly totals
export async function getMonthlyTotal(): Promise<Record<string, number>> {
  const expenses = await getExpenses()
  const monthlyTotals: Record<string, number> = {}

  expenses.forEach((expense) => {
    const date = new Date(expense.date)
    const monthYear = `${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`

    monthlyTotals[monthYear] = (monthlyTotals[monthYear] || 0) + expense.amount
  })

  return monthlyTotals
}

// Get total for the current month
export async function getCurrentMonthTotal(): Promise<number> {
  const expenses = await getExpenses()
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  return expenses.reduce((total, expense) => {
    const expenseDate = new Date(expense.date)
    const expenseMonth = expenseDate.getMonth()
    const expenseYear = expenseDate.getFullYear()

    if (expenseMonth === currentMonth && expenseYear === currentYear) {
      total += expense.amount
    }

    return total
  }, 0)
}

// Get total for the previous month
export async function getPreviousMonthTotal(): Promise<number> {
  const expenses = await getExpenses()
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  let previousMonth = currentMonth - 1
  let previousYear = currentYear

  if (previousMonth < 0) {
    previousMonth = 11
    previousYear -= 1
  }

  return expenses.reduce((total, expense) => {
    const expenseDate = new Date(expense.date)
    const expenseMonth = expenseDate.getMonth()
    const expenseYear = expenseDate.getFullYear()

    if (expenseMonth === previousMonth && expenseYear === previousYear) {
      total += expense.amount
    }

    return total
  }, 0)
}
