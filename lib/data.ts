"use client"

export interface Expense {
  id: string
  date: string
  amount: number
  category: string
  description?: string
}

// Local storage key
const EXPENSES_KEY = "expense-tracker-expenses"

// Get all expenses from localStorage
export function getExpenses(): Expense[] {
  if (typeof window === "undefined") return []

  const storedExpenses = localStorage.getItem(EXPENSES_KEY)
  if (!storedExpenses) return []

  try {
    return JSON.parse(storedExpenses)
  } catch (error) {
    console.error("Failed to parse expenses from localStorage", error)
    return []
  }
}

// Save all expenses to localStorage
export function saveExpenses(expenses: Expense[]): void {
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses))
}

// Add a new expense
export function addExpense(expense: Expense): void {
  const expenses = getExpenses()
  expenses.push(expense)
  saveExpenses(expenses)
}

// Delete an expense
export function deleteExpense(id: string): void {
  const expenses = getExpenses()
  const updatedExpenses = expenses.filter((expense) => expense.id !== id)
  saveExpenses(updatedExpenses)
}

// Update an expense
export function updateExpense(updatedExpense: Expense): void {
  const expenses = getExpenses()
  const updatedExpenses = expenses.map((expense) => (expense.id === updatedExpense.id ? updatedExpense : expense))
  saveExpenses(updatedExpenses)
}

// Get totals by category
export function getCategoryTotals(expenses: Expense[] = getExpenses()): Record<string, number> {
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
export function getMonthlyTotal(expenses: Expense[] = getExpenses()): Record<string, number> {
  const monthlyTotals: Record<string, number> = {}

  expenses.forEach((expense) => {
    const date = new Date(expense.date)
    const monthYear = `${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`

    monthlyTotals[monthYear] = (monthlyTotals[monthYear] || 0) + expense.amount
  })

  return monthlyTotals
}

// Get total for the current month
export function getCurrentMonthTotal(expenses: Expense[] = getExpenses()): number {
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
export function getPreviousMonthTotal(expenses: Expense[] = getExpenses()): number {
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
