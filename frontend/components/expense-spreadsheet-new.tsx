"use client"

import { useEffect, useState } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns"
import { PlusCircle, Edit2, Trash2, MessageCircle, ChevronLeft, ChevronRight, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { toast } from "./ui/use-toast"
import { Textarea } from "./ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { cn } from "../lib/utils"
// --- API-based imports ---
import { expenseApi, descriptionsApi, getCategoriesApi } from "../lib/api"
import type { Expense, ColumnDescription } from "../lib/types"

interface ExpenseSpreadsheetProps {
  sheetId: string
  currentMonth?: Date
  onMonthChange?: (date: Date) => void
}

export default function ExpenseSpreadsheet({
  sheetId,
  currentMonth: externalCurrentMonth,
  onMonthChange
}: ExpenseSpreadsheetProps) {
  // --- Theme ---
  const { theme, setTheme } = useTheme()

  // --- State ---
  const [currentMonth, setCurrentMonth] = useState<Date>(externalCurrentMonth || new Date())
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [savingCells, setSavingCells] = useState<Record<string, boolean>>({})
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false)
  const [categoryToEdit, setCategoryToEdit] = useState({ oldName: "", newName: "" })
  const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState("")
  const [descDialog, setDescDialog] = useState<{ open: boolean, expenseId: string, date: Date, category: string, value: string }>({ open: false, expenseId: "", date: new Date(), category: "", value: "" })
  const [columnDescriptions, setColumnDescriptions] = useState<Record<string, string>>({})
  // --- Data fetching (API-based, not React Query) ---
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false)
  const [fetchingExpenses, setFetchingExpenses] = useState(false) // Prevent concurrent requests

  const fetchExpenses = async () => {
    if (!sheetId) return
    if (fetchingExpenses) {
      console.log("⏸️ Already fetching expenses, skipping duplicate request")
      return
    }

    setFetchingExpenses(true)
    setIsLoadingExpenses(true)
    const startTime = Date.now()

    try {
      console.log(`📡 Fetching expenses for sheet ${sheetId}, month: ${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`)

      const data = await expenseApi.getAll({
        sheetId,
        month: `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`
      })

      const elapsed = Date.now() - startTime
      console.log(`✅ Expenses fetched in ${elapsed}ms:`, data)

      // Defensive: handle if API returns { data: ... } or throws error
      if (data && Array.isArray(data.data)) {
        console.log(`📊 Loaded ${data.data.length} expenses`)
        setExpenses(data.data)
      } else if (Array.isArray(data)) {
        console.log(`📊 Loaded ${data.length} expenses (direct array)`)
        setExpenses(data)
      } else {
        console.warn("⚠️ Unexpected data format:", data)
        setExpenses([])
      }
    } catch (error: any) {
      const elapsed = Date.now() - startTime
      console.error(`❌ Error fetching expenses (${elapsed}ms):`, error)
      setExpenses([])
      toast({
        title: "Error",
        description: error?.message || "Failed to fetch expenses. Please check your connection.",
        variant: "destructive"
      })
    } finally {
      setIsLoadingExpenses(false)
      setFetchingExpenses(false)
    }
  }

  // Use API-based categories fetcher
  const fetchCategories = async () => {
    if (!sheetId) {
      console.warn("⚠️ No sheetId provided, cannot fetch categories")
      return
    }

    try {
      console.log(`📡 Fetching categories for sheet: ${sheetId}`)
      // Use the categories API helper which goes through Next.js proxy
      const url = `/api/categories${sheetId ? `?sheetId=${sheetId}` : ''}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`)
      const data = await res.json()
      const categoriesList = data.data || data || []
      console.log(`✅ Loaded ${categoriesList.length} categories:`, categoriesList)
      setCategories(categoriesList)
    } catch (error) {
      console.error("❌ Error fetching categories:", error)
      setCategories([])
    }
  }  // Fetch descriptions from column_descriptions table
  const fetchDescriptions = async () => {
    try {
      // Get descriptions from the column_descriptions table
      console.log("Fetching descriptions for sheet:", sheetId);
      const response = await descriptionsApi.getAll({
        sheetId,
        columnName: 'notes' // Default column name for cell descriptions
      });

      if (response && Array.isArray(response.data)) {
        const descriptions: Record<string, string> = {};

        // Map descriptions to expense IDs
        response.data.forEach(item => {
          if (item.expense_id && item.description) {
            descriptions[item.expense_id] = item.description;
          }
        });

        console.log("Fetched descriptions:", descriptions);
        setColumnDescriptions(descriptions);
      }
    } catch (error) {
      console.error("Error fetching descriptions:", error);
    }
  }
  useEffect(() => {
    if (sheetId) {
      console.log(`🔄 useEffect triggered: sheetId=${sheetId}, month=${currentMonth.toISOString()}`)
      fetchExpenses()
      fetchCategories()
      // Don't call fetchDescriptions here, we'll call it after expenses are loaded
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetId, currentMonth.getFullYear(), currentMonth.getMonth()])

  // Separate useEffect to fetch descriptions whenever expenses change
  useEffect(() => {
    if (expenses.length > 0) {
      fetchDescriptions()
    }
  }, [expenses])

  // --- Date helpers ---
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })
  // --- Calculation helpers ---
  // Format date to YYYY-MM-DD in local timezone (not UTC)
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const findExpenseForCell = (date: Date, category: string) => {
    if (!expenses) return undefined

    // Format the date to YYYY-MM-DD in local timezone (not UTC to avoid timezone shifts)
    const formattedDate = formatDateLocal(date)

    // Find expense by date and category - ensuring exact date match
    return expenses.find((exp: Expense) => {
      // Compare using the formatted date string for exact matching
      const expFormattedDate = exp.date.split('T')[0]
      return expFormattedDate === formattedDate && exp.category === category
    })
  }
  const getCellKey = (date: Date, category: string) => `${formatDateLocal(date)}-${category}`
  const getDescriptionForCell = (date: Date, category: string): string | undefined => {
    const expense = findExpenseForCell(date, category)
    if (!expense) return undefined
    return columnDescriptions[expense.id] || undefined
  }
  const getExpenseAmount = (date: Date, category: string): string => {
    const cellKey = getCellKey(date, category)
    if (inputValues[cellKey] !== undefined) {
      return inputValues[cellKey] || ""
    }
    const expense = findExpenseForCell(date, category)
    return expense ? expense.amount.toString() : ""
  }
  const getDailyTotal = (date: Date): number => {
    if (!expenses) return 0
    return categories.reduce((total: number, category: string) => {
      const expense = findExpenseForCell(date, category)
      return total + (expense?.amount || 0)
    }, 0)
  }
  const getCategoryTotal = (category: string): number => {
    if (!expenses) return 0
    return expenses.filter((exp: Expense) => {
      const expDate = new Date(exp.date)
      return exp.category === category &&
        expDate.getFullYear() === currentMonth.getFullYear() &&
        expDate.getMonth() === currentMonth.getMonth()
    }).reduce((total: number, exp: Expense) => total + exp.amount, 0)
  }
  const getGrandTotal = (): number => {
    if (!expenses) return 0
    return expenses.filter((exp: Expense) => {
      const expDate = new Date(exp.date)
      return expDate.getFullYear() === currentMonth.getFullYear() &&
        expDate.getMonth() === currentMonth.getMonth()
    }).reduce((total: number, exp: Expense) => total + exp.amount, 0)
  }
  // Format currency as string for table cells
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
  }

  // --- Event handlers ---
  const handleExpenseInputChange = (date: Date, category: string, value: string) => {
    const cellKey = getCellKey(date, category)
    setInputValues(prev => ({ ...prev, [cellKey]: value }))
  }

  const saveExpenseValue = async (date: Date, category: string) => {
    const cellKey = getCellKey(date, category)
    const value = inputValues[cellKey]
    if (value === undefined) return

    const amount = value === "" ? 0 : parseFloat(value)
    if (isNaN(amount) && value !== "") return

    // Store original state for rollback on error
    const originalExpenses = [...expenses]
    const originalDescriptions = { ...columnDescriptions }

    const existingExpense = findExpenseForCell(date, category)
    const formattedDate = formatDateLocal(date)

    try {
      // OPTIMISTIC UPDATE: Update UI immediately for instant feedback
      if (existingExpense) {
        if (amount === 0) {
          // Optimistically remove expense from UI
          setExpenses(prev => prev.filter(exp => exp.id !== existingExpense.id))
          setColumnDescriptions(prev => {
            const updated = { ...prev }
            delete updated[existingExpense.id]
            return updated
          })
        } else {
          // Optimistically update expense in UI
          setExpenses(prev => prev.map(exp =>
            exp.id === existingExpense.id
              ? { ...exp, amount, date: formattedDate }
              : exp
          ))
        }
      } else if (amount !== 0) {
        // Optimistically add new expense to UI (temporary ID until server responds)
        const tempId = `temp-${Date.now()}-${Math.random()}`
        const newExpense: Expense = {
          id: tempId,
          date: formattedDate,
          amount,
          category,
          description: undefined,
          user_id: '00000000-0000-0000-0000-000000000000',
          sheet_id: sheetId,
          created_at: new Date().toISOString()
        }
        setExpenses(prev => [...prev, newExpense])
      }

      // Clear input value immediately
      setInputValues(prev => { const updated = { ...prev }; delete updated[cellKey]; return updated })

      // API CALL: Make actual API request in background
      if (existingExpense) {
        if (amount === 0) {
          // Delete expense
          console.log("🗑️ Deleting expense:", existingExpense.id)
          await expenseApi.delete(existingExpense.id)

          // Delete description in background (don't block on this)
          descriptionsApi.deleteByExpenseId(existingExpense.id).catch(err =>
            console.warn("Failed to delete description:", err)
          )
        } else {
          // Update expense
          console.log("✏️ Updating expense:", existingExpense.id, "to amount:", amount)
          const response = await expenseApi.update(existingExpense.id, {
            ...existingExpense,
            amount,
            date: formattedDate,
            user_id: existingExpense.user_id || '00000000-0000-0000-0000-000000000000',
            sheet_id: existingExpense.sheet_id || sheetId
          })

          // Replace with server response if available
          if (response?.data) {
            setExpenses(prev => prev.map(exp =>
              exp.id === existingExpense.id ? response.data : exp
            ))
          }
        }
      } else if (amount !== 0) {
        // Create new expense
        console.log("➕ Creating new expense:", { date: formattedDate, category, amount })
        const response = await expenseApi.create({
          date: formattedDate,
          category,
          amount,
          sheet_id: sheetId,
          user_id: '00000000-0000-0000-0000-000000000000'
        })

        // Replace temporary expense with server response
        if (response?.data) {
          setExpenses(prev => prev.map(exp =>
            exp.id.startsWith('temp-') && exp.date === formattedDate && exp.category === category
              ? response.data
              : exp
          ))
        }
      }

      console.log("✅ Save successful (optimistic update)")

    } catch (error: any) {
      // ROLLBACK: Revert optimistic update on error
      setExpenses(originalExpenses)
      setColumnDescriptions(originalDescriptions)

      // Restore input value
      setInputValues(prev => ({ ...prev, [cellKey]: value }))

      console.error("Error saving expense:", error)

      // Check if it's a duplicate expense error (409 Conflict)
      if (error.message && error.message.includes("409")) {
        toast({
          title: "Duplicate Expense",
          description: "An expense already exists for this date and category. Try editing the existing expense instead.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Error saving expense",
          description: error.message || "Failed to save expense. Please try again.",
          variant: "destructive"
        })
      }
    }
  }
  const openDescriptionDialog = (date: Date, category: string) => {
    const expense = findExpenseForCell(date, category)
    if (!expense) {
      toast({ title: "No expense found", description: "You need to add an expense value first before adding a description." })
      return
    }
    setDescDialog({ open: true, expenseId: expense.id, date, category, value: columnDescriptions[expense.id] || "" })
  }
  // Add Category
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({ title: "Invalid category name", description: "Please enter a valid category name.", variant: "destructive" })
      return
    }
    const normalizedName = newCategoryName.trim().toLowerCase()
    if (categories.includes(normalizedName)) {
      toast({ title: "Category already exists", description: "This category already exists. Please use a different name.", variant: "destructive" })
      return
    }
    try {
      // Add a zero-amount expense to create the category in the backend
      await expenseApi.create({
        date: new Date().toISOString(),
        amount: 0,
        category: normalizedName,
        sheet_id: sheetId,
      })
      await fetchCategories()
      setNewCategoryName("")
      setIsAddCategoryDialogOpen(false)
      toast({ title: "Category added", description: `The category \"${newCategoryName}\" has been added successfully.` })
    } catch (error) {
      toast({ title: "Error", description: "Failed to add category.", variant: "destructive" })
    }
  }
  // Edit Category
  const handleEditCategory = async () => {
    if (!categoryToEdit.newName.trim()) return
    const normalizedName = categoryToEdit.newName.trim().toLowerCase()
    if (categories.includes(normalizedName) && normalizedName !== categoryToEdit.oldName) return
    try {
      // Update all expenses with oldName to newName via backend
      const toUpdate = expenses.filter(exp => exp.category === categoryToEdit.oldName)
      await Promise.all(toUpdate.map(exp => expenseApi.update(exp.id, { ...exp, category: normalizedName })))
      await fetchExpenses()
      await fetchCategories()
      setIsEditCategoryDialogOpen(false)
      toast({ title: "Category updated", description: `The category has been renamed to \"${categoryToEdit.newName}\".` })
    } catch (error) {
      toast({ title: "Error", description: "Failed to update category.", variant: "destructive" })
    }
  }
  // Delete Category
  const handleDeleteCategory = async () => {
    try {
      // Update all expenses with this category to 'uncategorized' via backend
      const toUpdate = expenses.filter(exp => exp.category === categoryToDelete)
      await Promise.all(toUpdate.map(exp => expenseApi.update(exp.id, { ...exp, category: 'uncategorized' })))
      await fetchExpenses()
      await fetchCategories()
      setIsDeleteCategoryDialogOpen(false)
      toast({ title: "Category deleted", description: `The category \"${categoryToDelete}\" has been deleted.` })
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete category.", variant: "destructive" })
    }
  }

  // --- UI ---
  // Only show loading if we're actually loading, not if data is empty
  if (isLoadingExpenses || (sheetId && expenses.length === 0 && categories.length === 0 && fetchingExpenses)) {
    return (
      <Card className="p-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p>Loading expense data...</p>
          </div>
        </div>
      </Card>
    )
  }

  // Show empty state if no categories (but not loading)
  if (!categories.length && !isLoadingExpenses) {
    return (
      <Card className="p-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground">No categories found. Please add a category first.</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    // Main spreadsheet card
    <Card className="overflow-x-auto p-0 relative">
      {/* Header: Month/Year selectors and Add Category button, styled as in reference */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          {/* Previous Month Button */}
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => {
              const newDate = new Date(currentMonth)
              newDate.setMonth(newDate.getMonth() - 1)
              setCurrentMonth(newDate)
              onMonthChange?.(newDate)
            }}
            title="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Select
            value={currentMonth.getMonth().toString()}
            onValueChange={(value: string) => {
              const newDate = new Date(currentMonth)
              newDate.setMonth(Number.parseInt(value))
              setCurrentMonth(newDate)
              onMonthChange?.(newDate)
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i} value={i.toString()}>
                  {format(new Date(currentMonth.getFullYear(), i), "MMMM")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={currentMonth.getFullYear().toString()}
            onValueChange={(value: string) => {
              const newDate = new Date(currentMonth)
              newDate.setFullYear(Number.parseInt(value))
              setCurrentMonth(newDate)
              onMonthChange?.(newDate)
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i
                return (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          {/* Next Month Button */}
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => {
              const newDate = new Date(currentMonth)
              newDate.setMonth(newDate.getMonth() + 1)
              setCurrentMonth(newDate)
              onMonthChange?.(newDate)
            }}
            title="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle Button */}
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          <Button variant="outline" onClick={() => setIsAddCategoryDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Loading indicator */}
      {isLoadingExpenses && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading expenses...</p>
          </div>
        </div>
      )}

      {/* Spreadsheet Table - match reference layout exactly */}
      <div className="overflow-x-auto relative">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-muted/50 w-[120px]">Date</TableHead>
              {categories.map((category) => (
                <TableHead key={category} className="min-w-[120px] capitalize text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span>{category}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setCategoryToEdit({ oldName: category, newName: category })
                            setIsEditCategoryDialogOpen(true)
                          }}
                        >
                          <Edit2 className="mr-2 h-4 w-4" />Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setCategoryToDelete(category)
                            setIsDeleteCategoryDialogOpen(true)
                          }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableHead>
              ))}
              <TableHead className="min-w-[120px] text-right">Daily Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {daysInMonth.map((date) => (
              <TableRow key={formatDateLocal(date)}>
                <TableCell className="sticky left-0 z-10 bg-background font-medium w-[120px]">
                  {format(date, "EEE, MMM dd")}
                </TableCell>
                {categories.map((category) => (
                  <TableCell key={`${formatDateLocal(date)}-${category}`} className="px-2 py-1 align-middle">
                    <div className="relative flex items-center group h-12">
                      <input
                        type="text"
                        inputMode="decimal"
                        pattern="^-?\\d*(\\.\\d{0,2})?$"
                        placeholder="0.00" className={cn(
                          "pl-2 pr-8 w-full h-10 rounded border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transition-colors appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                          getDescriptionForCell(date, category) ? "bg-[#D5FF74] dark:bg-[#A5D041]/20" : "",
                          parseFloat(getExpenseAmount(date, category)) < 0 ? "bg-[#7BE7FF] dark:bg-[#7BE7FF]/20" : ""
                        )}
                        value={getExpenseAmount(date, category)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const val = e.target.value
                          if (/^-?\d*(\.\d{0,2})?$/.test(val) || val === "") {
                            handleExpenseInputChange(date, category, val)
                          }
                        }}
                        onBlur={() => {
                          const cellKey = getCellKey(date, category)
                          const value = inputValues[cellKey]
                          if (value !== undefined) {
                            saveExpenseValue(date, category)
                          }
                        }}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === 'Enter') {
                            saveExpenseValue(date, category)
                            const element = e.target as HTMLElement
                            const nextInput = element.closest('tr')?.nextElementSibling?.querySelector('input')
                            if (nextInput) {
                              (nextInput as HTMLInputElement).focus()
                            }
                          }
                        }}
                        autoComplete="off"
                        style={{ MozAppearance: 'textfield' }}
                      />                      <button
                        type="button"
                        className={`absolute right-1 h-6 w-6 flex items-center justify-center opacity-100 transition-opacity z-10 ${getDescriptionForCell(date, category) ? 'text-blue-500' : 'text-gray-400'}`}
                        onClick={(e) => {
                          e.preventDefault();
                          openDescriptionDialog(date, category);
                        }}
                        tabIndex={-1}
                        title={getDescriptionForCell(date, category) ? 'Edit description' : 'Add description'}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                ))}
                <TableCell className="text-right font-medium w-[120px]">
                  {getDailyTotal(date) !== 0 ? formatCurrency(getDailyTotal(date)) : "-"}
                </TableCell>
              </TableRow>
            ))}
            {/* Totals row */}
            <TableRow className="bg-muted/50">
              <TableCell className="font-bold sticky left-0 bg-muted/50 z-10">Monthly Total</TableCell>
              {categories.map((category) => (
                <TableCell key={`total-${category}`} className="font-medium text-center">
                  {formatCurrency(getCategoryTotal(category))}
                </TableCell>
              ))}
              <TableCell className="text-right font-bold">
                {formatCurrency(getGrandTotal())}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Dialogs for adding, editing, deleting categories, and editing expense descriptions */}
      <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>Enter a name for your new expense category.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="category-name">Category Name</label>
              <Input
                id="category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Entertainment, Insurance"
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    handleAddCategory()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCategory}>Add Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isEditCategoryDialogOpen} onOpenChange={setIsEditCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Category</DialogTitle>
            <DialogDescription>Enter a new name for the category.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="edit-category-name">Category Name</label>
              <Input
                id="edit-category-name"
                value={categoryToEdit.newName}
                onChange={(e) => setCategoryToEdit({ ...categoryToEdit, newName: e.target.value })}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    if (!categoryToEdit.newName.trim()) return
                    const normalizedName = categoryToEdit.newName.trim().toLowerCase()
                    if (categories.includes(normalizedName) && normalizedName !== categoryToEdit.oldName) return
                    handleEditCategory()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditCategory}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isDeleteCategoryDialogOpen} onOpenChange={setIsDeleteCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this category? All expenses in this category will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCategory}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>      <Dialog open={descDialog.open} onOpenChange={(open: boolean) => setDescDialog(d => ({ ...d, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Description</DialogTitle>
            <DialogDescription>
              Add or edit a description for this expense.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={descDialog.value}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescDialog(d => ({ ...d, value: e.target.value }))}
            placeholder="Enter description..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDescDialog(d => ({ ...d, open: false }))}>Cancel</Button>            <Button
              onClick={async () => {
                try {
                  console.log("Saving description for expense ID:", descDialog.expenseId);

                  // Double-check that the expense exists
                  const expenseExists = expenses.some(exp => exp.id === descDialog.expenseId);
                  if (!expenseExists) {
                    throw new Error("Expense not found. Please refresh the page and try again.");
                  }

                  if (descDialog.value.trim() === '') {
                    // If description is empty, delete it
                    await descriptionsApi.deleteByExpenseId(descDialog.expenseId);

                    // Update local state
                    setColumnDescriptions(prev => {
                      const updated = { ...prev };
                      delete updated[descDialog.expenseId];
                      return updated;
                    });

                    toast({ title: "Description removed" });
                  } else {
                    // Save description via API to column_descriptions table with column_name='notes'
                    const response = await descriptionsApi.saveDescription(
                      descDialog.expenseId,
                      descDialog.value,
                      'notes' // Specify the column name
                    );

                    // Update local state with the new description
                    setColumnDescriptions(prev => ({
                      ...prev,
                      [descDialog.expenseId]: descDialog.value
                    }));

                    toast({ title: "Description saved" });
                  }

                  setDescDialog(d => ({ ...d, open: false }));

                  // Refresh descriptions to ensure everything is in sync
                  await fetchDescriptions();
                } catch (error: any) {
                  console.error("Error saving description:", error);
                  toast({
                    title: "Error",
                    description: error.message || "Failed to save description. Please try again.",
                    variant: "destructive"
                  });
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export { ExpenseSpreadsheet }
