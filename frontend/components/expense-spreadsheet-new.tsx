"use client"

import { useEffect, useState } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns"
import { PlusCircle, Edit2, Trash2, MessageCircle } from "lucide-react"
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
import {
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useCategories
} from "../lib/hooks"
import { categoriesApi } from "../lib/api"
import type { Expense } from "../lib/types"

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

  // --- Data fetching (React Query hooks) ---
  const { data: expensesData, isLoading: expensesLoading } = useExpenses({
    sheetId,
    month: `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`
  })
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories(sheetId)
  const createExpenseMutation = useCreateExpense()
  const updateExpenseMutation = useUpdateExpense()
  const deleteExpenseMutation = useDeleteExpense()

  const expenses: Expense[] = (expensesData && (expensesData as any).data ? (expensesData as any).data : expensesData) || []
  const categories: string[] = (categoriesData && (categoriesData as any).data ? (categoriesData as any).data : categoriesData) || []

  // --- Date helpers ---
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })

  // --- Calculation helpers ---
  const findExpenseForCell = (date: Date, category: string) => {
    if (!expenses) return undefined
    return expenses.find((exp: Expense) => {
      const expDate = new Date(exp.date)
      return expDate.getFullYear() === currentMonth.getFullYear() &&
        expDate.getMonth() === currentMonth.getMonth() &&
        isSameDay(expDate, date) && exp.category === category
    })
  }
  const getCellKey = (date: Date, category: string) => `${date.toISOString()}-${category}`
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
    setSavingCells(prev => ({ ...prev, [cellKey]: true }))
    try {
      const amount = value === "" ? 0 : parseFloat(value)
      if (isNaN(amount)) return
      const existingExpense = findExpenseForCell(date, category)
      if (existingExpense) {
        if (amount === 0) {
          await deleteExpenseMutation.mutateAsync(existingExpense.id)
        } else {
          await updateExpenseMutation.mutateAsync({ ...existingExpense, amount })
        }
      } else if (amount !== 0) {
        await createExpenseMutation.mutateAsync({ date: date.toISOString(), category, amount, sheet_id: sheetId })
      }
      setInputValues(prev => { const updated = { ...prev }; delete updated[cellKey]; return updated })
    } catch (error) {
      toast({ title: "Error", description: "Failed to save expense. Please try again.", variant: "destructive" })
    } finally {
      setSavingCells(prev => ({ ...prev, [cellKey]: false }))
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
      await categoriesApi.create(sheetId, normalizedName)
      setNewCategoryName("")
      setIsAddCategoryDialogOpen(false)
      toast({ title: "Category added", description: `The category "${newCategoryName}" has been added successfully.` })
    } catch (error) {
      toast({ title: "Error", description: "Failed to add category.", variant: "destructive" })
    }
  }

  // --- UI ---
  if (expensesLoading || categoriesLoading) {
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

  return (
    <Card className="overflow-x-auto p-0">
      {/* Header: Month/Year selectors and Add Category button, styled as in reference */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/50">
        <div className="flex items-center gap-2">
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
        </div>
        <Button variant="outline" onClick={() => setIsAddCategoryDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Spreadsheet Table - match reference layout exactly */}
      <div className="overflow-x-auto">
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
              <TableRow key={date.toISOString()}>
                <TableCell className="sticky left-0 z-10 bg-background font-medium w-[120px]">
                  {format(date, "EEE, MMM dd")}
                </TableCell>
                {categories.map((category) => (
                  <TableCell key={`${date.toISOString()}-${category}`} className="p-0 align-middle">
                    <div className="relative flex items-center group h-12">
                      <input
                        type="text"
                        inputMode="decimal"
                        pattern="^-?\\d*(\\.\\d{0,2})?$"
                        placeholder="0.00"
                        className={cn(
                          "pl-8 pr-8 w-full h-10 rounded border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transition-colors appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
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
                        disabled={savingCells[`${date.toISOString()}-${category}`]}
                        style={{ MozAppearance: 'textfield' }}
                      />
                      <button
                        type="button"
                        className={`absolute left-1 h-6 w-6 flex items-center justify-center opacity-100 transition-opacity z-10 ${getDescriptionForCell(date, category) ? 'text-blue-500' : 'text-gray-400'}`}
                        onClick={(e) => {
                          e.preventDefault();
                          openDescriptionDialog(date, category);
                        }}
                        tabIndex={-1}
                        title={getDescriptionForCell(date, category) ? 'Edit description' : 'Add description'}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </button>
                      {savingCells[`${date.toISOString()}-${category}`] && (
                        <div className="absolute right-2 top-2 h-4 w-4">
                          <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      )}
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
            <Button onClick={async () => {
              if (!newCategoryName.trim()) return
              const normalizedName = newCategoryName.trim().toLowerCase()
              if (categories.includes(normalizedName)) return
              await categoriesApi.create(sheetId, normalizedName)
              setNewCategoryName("")
              setIsAddCategoryDialogOpen(false)
              toast({ title: "Category added", description: `The category \"${newCategoryName}\" has been added successfully.` })
            }}>Add Category</Button>
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
                    categoriesApi.update(sheetId, categoryToEdit.oldName, normalizedName)
                    setIsEditCategoryDialogOpen(false)
                    toast({ title: "Category updated", description: `The category has been renamed to \"${categoryToEdit.newName}\".` })
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              if (!categoryToEdit.newName.trim()) return
              const normalizedName = categoryToEdit.newName.trim().toLowerCase()
              if (categories.includes(normalizedName) && normalizedName !== categoryToEdit.oldName) return
              await categoriesApi.update(sheetId, categoryToEdit.oldName, normalizedName)
              setIsEditCategoryDialogOpen(false)
              toast({ title: "Category updated", description: `The category has been renamed to \"${categoryToEdit.newName}\".` })
            }}>Save Changes</Button>
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
            <Button variant="destructive" onClick={async () => {
              await categoriesApi.delete(sheetId, categoryToDelete)
              setIsDeleteCategoryDialogOpen(false)
              toast({ title: "Category deleted", description: `The category \"${categoryToDelete}\" has been deleted.` })
            }}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={descDialog.open} onOpenChange={(open: boolean) => setDescDialog(d => ({ ...d, open }))}>
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
            <Button variant="outline" onClick={() => setDescDialog(d => ({ ...d, open: false }))}>Cancel</Button>
            <Button
              onClick={async () => {
                // Save description logic here (API call)
                // You may want to update columnDescriptions state as well
                // Example:
                // await saveDescription(descDialog.expenseId, descDialog.value)
                setDescDialog(d => ({ ...d, open: false }))
                toast({ title: "Description saved" })
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
