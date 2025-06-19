"use client"

import React, { useState, useMemo } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns"
import { PlusCircle, Edit2, Trash2, MessageCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

import { 
  useExpenses, 
  useCreateExpense, 
  useUpdateExpense, 
  useDeleteExpense,
  useCategories
} from "@/lib/hooks"
import { categoriesApi } from "@/lib/api"
import type { Expense } from "@/lib/types"

interface ExpenseSpreadsheetProps {
  sheetId: string
  currentMonth?: Date
  onMonthChange?: (date: Date) => void
}

interface ExpenseCellData {
  date: Date
  category: string
  amount: number
  expense?: Expense
}

export default function ExpenseSpreadsheet({ 
  sheetId, 
  currentMonth: externalCurrentMonth,
  onMonthChange 
}: ExpenseSpreadsheetProps) {
  // Local state
  const [currentMonth, setCurrentMonth] = useState<Date>(externalCurrentMonth || new Date())
  const [pendingInputs, setPendingInputs] = useState<Record<string, string>>({})
  const [savingCells, setSavingCells] = useState<Record<string, boolean>>({})
  
  // Category management state
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false)
  const [categoryToEdit, setCategoryToEdit] = useState({ oldName: "", newName: "" })
  const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState("")

  // Description state
  const [isDescriptionDialogOpen, setIsDescriptionDialogOpen] = useState(false)
  const [currentDescription, setCurrentDescription] = useState({
    expenseId: "",
    description: "",
    date: new Date(),
    category: ""
  })

  // React Query hooks
  const { data: expensesData, isLoading: expensesLoading } = useExpenses({ 
    sheetId,
    month: `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`
  })
  
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories(sheetId)
  
  const createExpenseMutation = useCreateExpense()
  const updateExpenseMutation = useUpdateExpense()
  const deleteExpenseMutation = useDeleteExpense()

  // Transform API data
  const expenses: Expense[] = (expensesData && (expensesData as any).data ? (expensesData as any).data : expensesData) || []
  const categories: string[] = (categoriesData && (categoriesData as any).data ? (categoriesData as any).data : categoriesData) || []

  // Generate dates for current month
  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    })
  }, [currentMonth])

  // Helper functions
  const getCellKey = (date: Date, category: string) => 
    `${date.toISOString().split('T')[0]}-${category}`

  const findExpenseForCell = (date: Date, category: string): Expense | undefined => {
    return expenses.find((exp: Expense) => 
      isSameDay(new Date(exp.date), date) && exp.category === category
    )
  }

  const getExpenseAmount = (date: Date, category: string): string => {
    const cellKey = getCellKey(date, category)
    
    // Check for pending input first
    if (pendingInputs[cellKey] !== undefined) {
      return pendingInputs[cellKey]
    }
    
    // Find existing expense
    const expense = findExpenseForCell(date, category)
    return expense ? expense.amount.toString() : ""
  }

  const getDailyTotal = (date: Date): number => {
    return categories.reduce((total: number, category: string) => {
      const expense = findExpenseForCell(date, category)
      return total + (expense?.amount || 0)
    }, 0)
  }

  const getCategoryTotal = (category: string): number => {
    return expenses
      .filter((exp: Expense) => exp.category === category)
      .reduce((total: number, exp: Expense) => total + exp.amount, 0)
  }

  const getGrandTotal = (): number => {
    return expenses.reduce((total: number, exp: Expense) => total + exp.amount, 0)
  }

  const formatCurrency = (amount: number): React.ReactNode => {
    const formatted = new Intl.NumberFormat("en-US", { 
      style: "currency", 
      currency: "USD" 
    }).format(amount)
    
    return amount < 0 
      ? <span className="text-green-600">{formatted}</span> 
      : <span>{formatted}</span>
  }

  // Event handlers
  const handleMonthChange = (newMonth: Date) => {
    setCurrentMonth(newMonth)
    onMonthChange?.(newMonth)
  }

  const handleExpenseInputChange = (date: Date, category: string, value: string) => {
    const cellKey = getCellKey(date, category)
    setPendingInputs(prev => ({
      ...prev,
      [cellKey]: value
    }))
  }

  const handleExpenseSave = async (date: Date, category: string) => {
    const cellKey = getCellKey(date, category)
    const value = pendingInputs[cellKey]
    
    if (value === undefined) return

    setSavingCells(prev => ({ ...prev, [cellKey]: true }))

    try {
      const amount = value === "" ? 0 : parseFloat(value)
      if (isNaN(amount)) return

      const existingExpense = findExpenseForCell(date, category)

      if (existingExpense) {
        if (amount === 0) {
          // Delete expense if amount is 0
          await deleteExpenseMutation.mutateAsync(existingExpense.id)
        } else {
          // Update existing expense
          await updateExpenseMutation.mutateAsync({
            id: existingExpense.id,
            amount
          })
        }
      } else if (amount !== 0) {
        // Create new expense
        await createExpenseMutation.mutateAsync({
          date: date.toISOString(),
          amount,
          category,
          description: `${category} expense on ${format(date, "MMM dd")}`,
          sheet_id: sheetId
        })
      }
      
      // Clear pending input
      setPendingInputs(prev => {
        const updated = { ...prev }
        delete updated[cellKey]
        return updated
      })

    } catch (error) {
      console.error('Error saving expense:', error)
      toast({
        title: "Error",
        description: "Failed to save expense. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSavingCells(prev => ({ ...prev, [cellKey]: false }))
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Invalid category name",
        description: "Please enter a valid category name.",
        variant: "destructive",
      })
      return
    }

    const normalizedName = newCategoryName.trim().toLowerCase()

    if (categories.includes(normalizedName)) {
      toast({
        title: "Category already exists",
        description: "This category already exists. Please use a different name.",
        variant: "destructive",
      })
      return
    }

    try {
      await categoriesApi.create(sheetId, normalizedName)
      setNewCategoryName("")
      setIsAddCategoryDialogOpen(false)
      toast({
        title: "Category added",
        description: `The category \"${newCategoryName}\" has been added successfully.`,
      })
    } catch (error) {
      console.error('Error adding category:', error)
      toast({
        title: "Error",
        description: "Failed to add category. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleEditCategory = async () => {
    if (!categoryToEdit.newName.trim()) {
      toast({
        title: "Invalid category name",
        description: "Please enter a valid category name.",
        variant: "destructive",
      })
      return
    }

    const normalizedName = categoryToEdit.newName.trim().toLowerCase()

    if (categories.includes(normalizedName) && normalizedName !== categoryToEdit.oldName) {
      toast({
        title: "Category already exists",
        description: "This category already exists. Please use a different name.",
        variant: "destructive",
      })
      return
    }

    try {
      await categoriesApi.update(sheetId, categoryToEdit.oldName, normalizedName)
      setIsEditCategoryDialogOpen(false)
      toast({
        title: "Category updated",
        description: `The category has been renamed to \"${categoryToEdit.newName}\".`,
      })
    } catch (error) {
      console.error('Error updating category:', error)
      toast({
        title: "Error",
        description: "Failed to update category. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCategory = async () => {
    try {
      await categoriesApi.delete(sheetId, categoryToDelete)
      setIsDeleteCategoryDialogOpen(false)
      toast({
        title: "Category deleted",
        description: `The category \"${categoryToDelete}\" has been deleted.`,
      })
    } catch (error) {
      console.error('Error deleting category:', error)
      toast({
        title: "Error",
        description: "Failed to delete category. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Loading state
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
    <Card className="overflow-auto">
      {/* Header with month/year selectors and add category button */}
      <div className="p-4 flex justify-between items-center border-b">
        <div className="flex items-center gap-2">
          <Select
            value={currentMonth.getMonth().toString()}
            onValueChange={(value) => {
              const newDate = new Date(currentMonth)
              newDate.setMonth(parseInt(value))
              handleMonthChange(newDate)
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select month" />
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
            onValueChange={(value) => {
              const newDate = new Date(currentMonth)
              newDate.setFullYear(parseInt(value))
              handleMonthChange(newDate)
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Select year" />
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

      {/* Expense table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px] sticky left-0 bg-background z-10">Date</TableHead>
              {categories.map((category) => (
                <TableHead key={category} className="min-w-[120px] capitalize">
                  <div className="flex items-center justify-between">
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
                          <Edit2 className="mr-2 h-4 w-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setCategoryToDelete(category)
                            setIsDeleteCategoryDialogOpen(true)
                          }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
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
                <TableCell className="font-medium sticky left-0 bg-background z-10">
                  {format(date, "EEE, MMM dd")}
                </TableCell>

                {categories.map((category) => {
                  const cellKey = getCellKey(date, category)
                  const isSaving = savingCells[cellKey]
                  const amount = getExpenseAmount(date, category)
                  
                  return (
                    <TableCell key={cellKey}>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className={cn(
                            "pl-7",
                            parseFloat(amount) < 0 ? "bg-[#7BE7FF] dark:bg-[#7BE7FF]/20" : ""
                          )}
                          value={amount}
                          onChange={(e) => handleExpenseInputChange(date, category, e.target.value)}
                          onBlur={() => handleExpenseSave(date, category)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleExpenseSave(date, category)
                              // Focus next input
                              const element = e.target as HTMLElement
                              const nextInput = element.closest('tr')?.nextElementSibling?.querySelector('input')
                              if (nextInput) {
                                (nextInput as HTMLInputElement).focus()
                              }
                            }
                          }}
                          disabled={isSaving}
                          autoComplete="off"
                        />
                        {isSaving && (
                          <div className="absolute right-2 top-2 h-4 w-4">
                            <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  )
                })}

                <TableCell className="text-right font-medium">
                  {getDailyTotal(date) !== 0
                    ? formatCurrency(getDailyTotal(date))
                    : "-"}
                </TableCell>
              </TableRow>
            ))}

            {/* Totals row */}
            <TableRow className="bg-muted/50">
              <TableCell className="font-bold sticky left-0 bg-muted/50 z-10">Monthly Total</TableCell>

              {categories.map((category) => (
                <TableCell key={`total-${category}`} className="font-medium">
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

      {/* Add Category Dialog */}
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
                onKeyDown={(e) => {
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

      {/* Edit Category Dialog */}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
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

      {/* Delete Category Dialog */}
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
            <Button variant="destructive" onClick={handleDeleteCategory}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
