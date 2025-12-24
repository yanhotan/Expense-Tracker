"use client"

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

// Get all expenses from backend API
export async function getExpenses(sheetId?: string): Promise<Expense[]> {
  // During build or SSG processes, use dummy data
  if (isServerRendering()) {
    return [];
  }

  // Get local expenses first as a fallback if database call fails
  const localExpenses = getLocalExpenses();
  const filteredLocalExpenses = sheetId
    ? localExpenses.filter(exp => exp.sheet_id === sheetId)
    : localExpenses;

  let databaseError = false;
  let databaseData: Expense[] = [];

  try {
    let query = `http://localhost:4000/api/expenses?user_id=eq.00000000-0000-0000-0000-000000000000`;

    // Filter by sheet_id if provided
    if (sheetId) {
      query += `&sheet_id=eq.${sheetId}`;
    }

    // Sort by created_at (when the expense was added) instead of date
    // This preserves the order in which expenses were entered
    query += `&order=created_at.desc`;

    const response = await fetch(query);
    const data = await response.json();

    if (!response.ok) {
      console.warn('Supabase error when fetching expenses:', data);
      databaseError = true;
    } else {
      databaseData = data.data || [];
      console.log('Successfully fetched expenses from database:', databaseData.length);

      // Check for and clean up any duplicate expenses
      if (databaseData.length > 0) {
        const dedupedData = deduplicateExpenses(databaseData);
        if (dedupedData.length < databaseData.length) {
          console.log(`Removed ${databaseData.length - dedupedData.length} duplicate expenses`);
          databaseData = dedupedData;
        }
      }

      // If we have database data and local data, try to merge any missing items
      if (databaseData.length > 0 && localExpenses.length > 0) {
        // Find any expenses in localStorage that are not in the database
        const missingExpenses = localExpenses.filter(localExp =>
          !databaseData.some(dbExp => dbExp.id === localExp.id)
        );

        // If we have expenses that didn't make it to the database, try to save them now
        if (missingExpenses.length > 0) {
          console.log('Found missing expenses in localStorage that need to be synced:', missingExpenses.length);

          // Try to save each missing expense to the database
          for (const missingExpense of missingExpenses) {
            if (sheetId && missingExpense.sheet_id !== sheetId) continue;

            try {
              const response = await fetch('http://localhost:4000/api/expenses', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(missingExpense),
              });

              const data = await response.json();

              if (!response.ok) {
                console.warn('Failed to sync missing expense:', data);
              } else {
                console.log('Successfully synced missing expense:', missingExpense.id);
                databaseData.push(missingExpense);
              }
            } catch (syncError) {
              console.warn('Failed to sync missing expense:', syncError);
            }
          }
        }
      }

      // Return database data as the source of truth if available
      return databaseData;
    }
  } catch (error) {
    console.warn('Exception while fetching expenses from Supabase:', error);
    databaseError = true;
  }

  if (databaseError) {
    console.log('Using localStorage fallback for expenses due to database error');
    return filteredLocalExpenses;
  }

  return databaseData;
}

// Add a new expense with improved reliability
export async function addExpense(expense: Expense, sheetId: string): Promise<boolean> {
  // Use the exact date from the expense for strict date ordering
  const newExpense = {
    ...expense,
    id: expense.id || uuidv4(),
    sheet_id: sheetId,
    // Store the exact date string for proper date matching
    date: expense.date,
    created_at: new Date().toISOString()
  }

  // During SSR or build, don't try to save
  if (isServerRendering()) {
    return false;
  }

  // Always save to localStorage first as backup
  const expenses = getLocalExpenses();
  saveLocalExpenses([...expenses, newExpense]);
  console.log('Expense saved to localStorage as backup', newExpense.id);

  // Then try to save to Supabase with retry logic
  let retryCount = 0;
  const maxRetries = 3;
  let savedSuccessfully = false;

  while (retryCount < maxRetries && !savedSuccessfully) {
    try {
      console.log(`Attempt ${retryCount + 1} to insert expense into Supabase`, newExpense.id);
      const response = await fetch('http://localhost:4000/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newExpense),
      });

      const data = await response.json();

      if (!response.ok) {
        console.warn(`Supabase error on attempt ${retryCount + 1}:`, data);
        retryCount++;
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

      console.log('Expense saved successfully to Supabase:', data);
      savedSuccessfully = true;
    } catch (error) {
      console.error(`Exception on attempt ${retryCount + 1}:`, error);
      retryCount++;
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  if (!savedSuccessfully) {
    console.warn('Failed to save expense to Supabase after all retries');
  }

  return savedSuccessfully;
}

// Delete an expense
export async function deleteExpense(id: string): Promise<void> {
  // During SSR or build, don't try to delete
  if (isServerRendering()) {
    return;
  }

  try {
    const response = await fetch(`http://localhost:4000/api/expenses/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = await response.json();
      console.warn('Supabase delete error, falling back to localStorage:', data);
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
    const response = await fetch(`http://localhost:4000/api/expenses/${updatedExpense.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedExpense),
    });

    if (!response.ok) {
      const data = await response.json();
      console.warn('Supabase update error, falling back to localStorage:', data);
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
export function getCategories(sheetId?: string): string[] {
  if (typeof window === "undefined") return ["food", "accessories", "transport", "investment", "others"];

  try {
    // If sheetId is provided, try to get sheet-specific categories first
    if (sheetId) {
      const sheetCategories = localStorage.getItem(`expense-tracker-categories-${sheetId}`);
      if (sheetCategories) {
        return JSON.parse(sheetCategories);
      }
    }

    // Fall back to global categories if no sheet-specific ones exist
    const stored = localStorage.getItem("expense-tracker-categories");
    return stored ? JSON.parse(stored) : ["food", "accessories", "transport", "investment", "others"];
  } catch (e) {
    console.warn("Failed to get categories from localStorage:", e);
    return ["food", "accessories", "transport", "investment", "others"];
  }
}

export function saveCategories(categories: string[], sheetId?: string): void {
  if (typeof window === "undefined") return;

  try {
    // If sheetId is provided, save sheet-specific categories
    if (sheetId) {
      localStorage.setItem(`expense-tracker-categories-${sheetId}`, JSON.stringify(categories));
    } else {
      // Also update global categories as a fallback
      localStorage.setItem("expense-tracker-categories", JSON.stringify(categories));
    }
  } catch (e) {
    console.warn("Failed to save categories to localStorage:", e);
  }
}

export function addCategory(category: string, sheetId?: string): void {
  const categories = getCategories(sheetId);
  if (!categories.includes(category.toLowerCase())) {
    categories.push(category.toLowerCase());
    saveCategories(categories, sheetId);
  }
}

export function removeCategory(categoryToRemove: string, sheetId?: string): void {
  const categories = getCategories(sheetId);
  const newCategories = categories.filter(cat => cat !== categoryToRemove);
  saveCategories(newCategories, sheetId);

  // Update any existing expenses with this category to "uncategorized"
  try {
    const expenses = getLocalExpenses();
    const updatedExpenses = expenses.map(expense => {
      if (expense.category === categoryToRemove && (!sheetId || expense.sheet_id === sheetId)) {
        return { ...expense, category: "uncategorized" };
      }
      return expense;
    });
    saveLocalExpenses(updatedExpenses);
  } catch (e) {
    console.warn("Failed to update expenses when removing category:", e);
  }
}

export function updateCategoryName(oldName: string, newName: string, sheetId?: string): void {
  const categories = getCategories(sheetId);
  const newCategories = categories.map(cat => cat === oldName ? newName.toLowerCase() : cat);
  saveCategories(newCategories, sheetId);

  // Update any existing expenses with this category
  try {
    const expenses = getLocalExpenses();
    const updatedExpenses = expenses.map(expense => {
      if (expense.category === oldName && (!sheetId || expense.sheet_id === sheetId)) {
        return { ...expense, category: newName.toLowerCase() };
      }
      return expense;
    });
    saveLocalExpenses(updatedExpenses);
  } catch (e) {
    console.warn("Failed to update expenses when renaming category:", e);
  }
}

// Get categories from both database and localStorage
// Updated to use Spring Boot API
export async function getSheetCategories(sheetId: string): Promise<string[]> {
  if (!sheetId || isServerRendering()) {
    return ["food", "accessories", "transport", "investment", "others"];
  }

  try {
    // Use Spring Boot API via categoriesApi
    const { categoriesApi } = await import('./api');
    const response = await categoriesApi.getAll(sheetId);
    const categories = response.data || [];
    
    if (categories.length > 0) {
      console.log('✅ Categories fetched from Spring Boot:', categories);
      return categories;
    }
  } catch (error) {
    console.warn('❌ Error fetching categories from Spring Boot:', error);
  }

  // Default categories if nothing was found
  return ["food", "accessories", "transport", "investment", "others"];
}

// Save categories to both database and localStorage
export async function saveSheetCategories(categories: string[], sheetId: string): Promise<void> {
  if (!sheetId || isServerRendering()) return;

  try {
    // Save to localStorage first as backup
    localStorage.setItem(`expense-tracker-categories-${sheetId}`, JSON.stringify(categories));

    // Then try to save to database
    try {
      // First, delete existing categories for this sheet
      await fetch(`http://localhost:4000/api/sheet_categories`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sheet_id: sheetId }),
      });

      // Then insert new ones
      const categoriesToSave = categories.map((category, index) => ({
        sheet_id: sheetId,
        category,
        display_order: index + 1
      }));

      const response = await fetch('http://localhost:4000/api/sheet_categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoriesToSave),
      });

      const data = await response.json();

      if (!response.ok) {
        console.warn('Error saving categories to database:', data);
      } else {
        console.log('Categories saved to database successfully');
      }
    } catch (dbError) {
      console.warn('Exception saving categories to database:', dbError);
    }
  } catch (e) {
    console.warn("Failed to save categories to localStorage:", e);
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

// Helper function to check if two dates represent the same day (ignoring time)
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// Deduplicate expenses for the same date and category
export function deduplicateExpenses(expenses: Expense[]): Expense[] {
  // Group expenses by date + category
  const groupedExpenses = new Map<string, Expense[]>();

  // Group expenses by date and category
  expenses.forEach(expense => {
    const date = new Date(expense.date);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${expense.category}`;
    if (!groupedExpenses.has(key)) {
      groupedExpenses.set(key, []);
    }
    groupedExpenses.get(key)!.push(expense);
  });

  // For each group, keep only the most recent expense (by created_at)
  const deduplicated: Expense[] = [];
  groupedExpenses.forEach(group => {
    // Sort by created_at in descending order (newest first)
    const sorted = group.sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return dateB.getTime() - dateA.getTime();
    });

    // Keep only the most recent one
    if (sorted.length > 1) {
      console.log(`Found ${sorted.length} duplicate expenses for ${sorted[0].category} on ${new Date(sorted[0].date).toLocaleDateString()}. Keeping most recent.`);
    }
    deduplicated.push(sorted[0]);

    // Delete the duplicates from the database (async, but we don't wait)
    if (sorted.length > 1) {
      sorted.slice(1).forEach(dupe => {
        console.log(`Deleting duplicate expense: ${dupe.id}`);
        deleteExpense(dupe.id).catch(err => console.error('Error deleting duplicate:', err));
      });
    }
  });

  return deduplicated;
}
