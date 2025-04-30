"use client"

import { supabase, getCurrentUserId } from './supabase'
import { v4 as uuidv4 } from 'uuid'

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

// Helper function to determine if we're in a build/SSR context
const isServerRendering = () => {
  return typeof window === 'undefined' && process.env.NODE_ENV === 'production';
}

// Fallback to localStorage during build process or when Supabase fails
const getLocalExpenses = (): Expense[] => {
  if (typeof window === "undefined") return [];
  
  try {
    const stored = localStorage.getItem("expense-tracker-expenses");
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.warn("Failed to get expenses from localStorage:", e);
    return [];
  }
}

const saveLocalExpenses = (expenses: Expense[]): void => {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem("expense-tracker-expenses", JSON.stringify(expenses));
  } catch (e) {
    console.warn("Failed to save expenses to localStorage:", e);
  }
}

// Get all expenses from Supabase
export async function getExpenses(sheetId?: string): Promise<Expense[]> {
  // Get the current authenticated user ID
  const user_id = await getCurrentUserId();

  // During build or SSG processes, use dummy data
  if (isServerRendering()) {
    return [];
  }

  try {
    let query = supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user_id);
      
    // Filter by sheet_id if provided
    if (sheetId) {
      query = query.eq('sheet_id', sheetId);
    }
    
    const { data, error } = await query.order('date', { ascending: false });

    if (error) {
      console.warn('Supabase error, falling back to localStorage:', error);
      const allExpenses = getLocalExpenses();
      return sheetId 
        ? allExpenses.filter(exp => exp.sheet_id === sheetId)
        : allExpenses;
    }

    return data || [];
  } catch (error) {
    console.warn('Failed to fetch expenses from Supabase:', error);
    const allExpenses = getLocalExpenses();
    return sheetId 
      ? allExpenses.filter(exp => exp.sheet_id === sheetId)
      : allExpenses;
  }
}

// Add a new expense
export async function addExpense(expense: Expense, sheetId: string): Promise<void> {
  // Get the current authenticated user ID
  const user_id = await getCurrentUserId();
  
  const newExpense = {
    ...expense,
    id: expense.id || uuidv4(),
    user_id,
    sheet_id: sheetId, // Add sheet_id to the expense
    created_at: new Date().toISOString()
  }

  // During SSR or build, don't try to save
  if (isServerRendering()) {
    return;
  }

  try {
    const { error } = await supabase
      .from('expenses')
      .insert(newExpense)

    if (error) {
      console.warn('Supabase error, falling back to localStorage:', error);
      // Fall back to localStorage
      const expenses = getLocalExpenses();
      saveLocalExpenses([...expenses, newExpense]);
      return;
    }
  } catch (error) {
    console.warn('Failed to add expense to Supabase, using localStorage fallback:', error);
    // Fall back to localStorage
    const expenses = getLocalExpenses();
    saveLocalExpenses([...expenses, newExpense]);
  }
}

// Delete an expense
export async function deleteExpense(id: string): Promise<void> {
  // During SSR or build, don't try to delete
  if (isServerRendering()) {
    return;
  }

  try {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)

    if (error) {
      console.warn('Supabase delete error, falling back to localStorage:', error);
      // Fall back to localStorage
      const expenses = getLocalExpenses();
      const updatedExpenses = expenses.filter(expense => expense.id !== id);
      saveLocalExpenses(updatedExpenses);
      return;
    }
  } catch (error) {
    console.warn('Failed to delete expense from Supabase, using localStorage fallback:', error);
    // Fall back to localStorage
    const expenses = getLocalExpenses();
    const updatedExpenses = expenses.filter(expense => expense.id !== id);
    saveLocalExpenses(updatedExpenses);
  }
}

// Update an expense
export async function updateExpense(updatedExpense: Expense): Promise<void> {
  // During SSR or build, don't try to update
  if (isServerRendering()) {
    return;
  }

  try {
    const { error } = await supabase
      .from('expenses')
      .update(updatedExpense)
      .eq('id', updatedExpense.id)

    if (error) {
      console.warn('Supabase update error, falling back to localStorage:', error);
      // Fall back to localStorage
      const expenses = getLocalExpenses();
      const updatedExpenses = expenses.map(expense => 
        expense.id === updatedExpense.id ? updatedExpense : expense
      );
      saveLocalExpenses(updatedExpenses);
      return;
    }
  } catch (error) {
    console.warn('Failed to update expense in Supabase, using localStorage fallback:', error);
    // Fall back to localStorage
    const expenses = getLocalExpenses();
    const updatedExpenses = expenses.map(expense => 
      expense.id === updatedExpense.id ? updatedExpense : expense
    );
    saveLocalExpenses(updatedExpenses);
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

// Category management functions
export function getCategories(): string[] {
  if (typeof window === "undefined") return ["food", "accessories", "transport", "investment", "others"];

  try {
    const stored = localStorage.getItem("expense-tracker-categories");
    return stored ? JSON.parse(stored) : ["food", "accessories", "transport", "investment", "others"];
  } catch (e) {
    console.warn("Failed to get categories from localStorage:", e);
    return ["food", "accessories", "transport", "investment", "others"];
  }
}

export function saveCategories(categories: string[]): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem("expense-tracker-categories", JSON.stringify(categories));
  } catch (e) {
    console.warn("Failed to save categories to localStorage:", e);
  }
}

export function addCategory(category: string): void {
  const categories = getCategories();
  if (!categories.includes(category.toLowerCase())) {
    categories.push(category.toLowerCase());
    saveCategories(categories);
  }
}

export function removeCategory(categoryToRemove: string): void {
  const categories = getCategories();
  const newCategories = categories.filter(cat => cat !== categoryToRemove);
  saveCategories(newCategories);
  
  // Update any existing expenses with this category to "uncategorized"
  try {
    const expenses = getLocalExpenses();
    const updatedExpenses = expenses.map(expense => {
      if (expense.category === categoryToRemove) {
        return { ...expense, category: "uncategorized" };
      }
      return expense;
    });
    saveLocalExpenses(updatedExpenses);
  } catch (e) {
    console.warn("Failed to update expenses when removing category:", e);
  }
}

export function updateCategoryName(oldName: string, newName: string): void {
  const categories = getCategories();
  const newCategories = categories.map(cat => cat === oldName ? newName.toLowerCase() : cat);
  saveCategories(newCategories);
  
  // Update any existing expenses with this category
  try {
    const expenses = getLocalExpenses();
    const updatedExpenses = expenses.map(expense => {
      if (expense.category === oldName) {
        return { ...expense, category: newName.toLowerCase() };
      }
      return expense;
    });
    saveLocalExpenses(updatedExpenses);
  } catch (e) {
    console.warn("Failed to update expenses when renaming category:", e);
  }
}

// Category color functions
export function getCategoryColor(category: string): string {
  // Define a set of colors that will be used for categories
  const colorSet = [
    "bg-green-100 text-green-800",
    "bg-purple-100 text-purple-800",
    "bg-blue-100 text-blue-800",
    "bg-amber-100 text-amber-800",
    "bg-red-100 text-red-800",
    "bg-pink-100 text-pink-800",
    "bg-indigo-100 text-indigo-800",
    "bg-cyan-100 text-cyan-800",
    "bg-emerald-100 text-emerald-800",
    "bg-orange-100 text-orange-800",
  ]

  // Map specific categories to specific colors for consistency
  const specificColors: Record<string, string> = {
    food: "bg-green-100 text-green-800",
    accessories: "bg-purple-100 text-purple-800",
    transport: "bg-blue-100 text-blue-800",
    investment: "bg-amber-100 text-amber-800",
    uncategorized: "bg-gray-100 text-gray-800",
    others: "bg-slate-100 text-slate-800",
  }

  // Return specific color if defined, otherwise use a color from the set based on string hash
  if (specificColors[category.toLowerCase()]) {
    return specificColors[category.toLowerCase()];
  }

  // Simple hash function to get a consistent color for a category
  const hash = category.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colorSet[hash % colorSet.length];
}

// Chart color function - for use with charts
export function getChartCategoryColor(category: string): string {
  // Define a set of colors for the chart
  const chartColors: Record<string, string> = {
    food: "hsl(var(--chart-1))",
    accessories: "hsl(var(--chart-2))",
    transport: "hsl(var(--chart-3))",
    investment: "hsl(var(--chart-4))",
    uncategorized: "hsl(var(--chart-5))",
    others: "hsl(var(--chart-6))",
  }

  // Additional colors for dynamic categories
  const extraColors = [
    "hsl(var(--chart-7, 340, 70%, 50%))",
    "hsl(var(--chart-8, 40, 70%, 50%))",
    "hsl(var(--chart-9, 190, 70%, 50%))",
    "hsl(var(--chart-10, 290, 70%, 50%))",
    "hsl(var(--chart-11, 120, 70%, 50%))",
    "hsl(var(--chart-12, 220, 70%, 50%))",
  ]

  // Return specific color if defined, otherwise use a color from the extra set
  if (chartColors[category.toLowerCase()]) {
    return chartColors[category.toLowerCase()];
  }

  // Simple hash function to get a consistent color
  const hash = category.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return extraColors[hash % extraColors.length];
}
