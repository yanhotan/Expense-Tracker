"use client"

import { useEffect, useState } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns"
import { PlusCircle, Save, Edit2, Trash2 } from "lucide-react"
import { v4 as uuidv4 } from 'uuid'

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { 
  getExpenses, 
  addExpense, 
  deleteExpense, 
  updateExpense, 
  type Expense, 
  getCategories,
  addCategory,
  removeCategory,
  updateCategoryName
} from "@/lib/data"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function ExpenseSpreadsheet({ sheetId }: { sheetId: string }) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false)
  const [categoryToEdit, setCategoryToEdit] = useState({ oldName: "", newName: "" })
  const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState("")

  // Generate dates for the current month
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })

  // Initialize or load data
  useEffect(() => {
    async function loadExpenses() {
      if (!sheetId) {
        console.warn('No sheet ID provided, cannot load expenses')
        return
      }
      
      setIsLoading(true)
      try {
        // Load expenses for this specific sheet
        const expenseData = await getExpenses(sheetId)
        setExpenses(expenseData)
        const storedCategories = getCategories()
        setCategories(storedCategories)
      } catch (error) {
        console.error('Failed to load expenses:', error)
        toast({
          title: 'Error',
          description: 'Failed to load expense data. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadExpenses()
  }, [sheetId]) // Re-run when sheet changes

  // Handle expense input change with auto-save
  const handleExpenseChange = async (date: Date, category: string, value: string) => {
    if (!sheetId) {
      console.warn('No sheet ID provided, cannot save expense')
      return
    }
    
    const amount = value === "" ? 0 : Number.parseFloat(value)
    if (isNaN(amount)) return

    setIsSaving(true)
    try {
      // Find if there's an existing expense for this date and category
      const existingExpense = expenses.find((exp) => isSameDay(new Date(exp.date), date) && exp.category === category)

      if (existingExpense) {
        if (amount === 0) {
          // Delete the expense if amount is 0
          await deleteExpense(existingExpense.id)
          
          // Update local state
          setExpenses(prev => prev.filter(exp => exp.id !== existingExpense.id))
        } else {
          // Update the expense
          const updatedExpense = {
            ...existingExpense,
            amount
          }
          await updateExpense(updatedExpense)
          
          // Update local state
          setExpenses(prev => prev.map(exp => 
            exp.id === existingExpense.id ? updatedExpense : exp
          ))
        }
      } else if (amount > 0) {
        // Add new expense with the sheet_id
        const newExpense = {
          id: uuidv4(),
          date: date.toISOString(),
          amount,
          category,
          description: `Expense on ${format(date, "MMM dd")}`,
          sheet_id: sheetId, // Associate with the current sheet
        }
        await addExpense(newExpense, sheetId)
        
        // Update local state
        setExpenses(prev => [...prev, newExpense])
      }
    } catch (error) {
      console.error('Error saving expense:', error)
      toast({
        title: "Error",
        description: "Failed to save expense data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Add new category
  const handleAddCategory = () => {
    if (newCategoryName.trim() === "") {
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

    addCategory(normalizedName)
    setCategories([...categories, normalizedName])
    setNewCategoryName("")
    setIsAddCategoryDialogOpen(false)

    toast({
      title: "Category added",
      description: `The category "${newCategoryName}" has been added successfully.`,
    })
  }

  // Edit category
  const handleEditCategory = () => {
    if (categoryToEdit.newName.trim() === "") {
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

    updateCategoryName(categoryToEdit.oldName, normalizedName)
    setCategories(categories.map((cat) => (cat === categoryToEdit.oldName ? normalizedName : cat)))
    setIsEditCategoryDialogOpen(false)

    toast({
      title: "Category updated",
      description: `The category has been renamed to "${categoryToEdit.newName}".`,
    })
  }

  // Delete category
  const handleDeleteCategory = () => {
    removeCategory(categoryToDelete)
    setCategories(categories.filter((cat) => cat !== categoryToDelete))
    setIsDeleteCategoryDialogOpen(false)

    toast({
      title: "Category deleted",
      description: `The category "${categoryToDelete}" has been deleted.`,
    })
  }

  // Get expense amount for a specific date and category
  const getExpenseAmount = (date: Date, category: string): string => {
    const expense = expenses.find((exp) => isSameDay(new Date(exp.date), date) && exp.category === category)
    return expense ? expense.amount.toString() : ""
  }

  // Calculate daily totals
  const getDailyTotal = (date: Date): number => {
    return expenses.filter((exp) => isSameDay(new Date(exp.date), date)).reduce((sum, exp) => sum + exp.amount, 0)
  }

  // Calculate category totals
  const getCategoryTotal = (category: string): number => {
    return expenses.filter((exp) => exp.category === category).reduce((sum, exp) => sum + exp.amount, 0)
  }

  // Calculate grand total
  const getGrandTotal = (): number => {
    return expenses.reduce((sum, exp) => sum + exp.amount, 0)
  }

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p>Loading expense data...</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-auto">
      <div className="p-4 flex justify-between items-center border-b">
        <div className="flex items-center gap-2">
          <Select
            value={currentMonth.getMonth().toString()}
            onValueChange={(value) => {
              const newDate = new Date(currentMonth)
              newDate.setMonth(Number.parseInt(value))
              setCurrentMonth(newDate)
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
              newDate.setFullYear(Number.parseInt(value))
              setCurrentMonth(newDate)
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

                {categories.map((category) => (
                  <TableCell key={`${date.toISOString()}-${category}`}>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-7"
                        value={getExpenseAmount(date, category)}
                        onChange={(e) => handleExpenseChange(date, category, e.target.value)}
                      />
                      {isSaving && <div className="absolute right-2 top-2 h-4 w-4">
                        <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>}
                    </div>
                  </TableCell>
                ))}

                <TableCell className="text-right font-medium">
                  {getDailyTotal(date) > 0
                    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(getDailyTotal(date))
                    : "-"}
                </TableCell>
              </TableRow>
            ))}

            {/* Totals row */}
            <TableRow className="bg-muted/50">
              <TableCell className="font-bold sticky left-0 bg-muted/50 z-10">Monthly Total</TableCell>

              {categories.map((category) => (
                <TableCell key={`total-${category}`} className="font-medium">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                    getCategoryTotal(category),
                  )}
                </TableCell>
              ))}

              <TableCell className="text-right font-bold">
                {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(getGrandTotal())}
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
              Are you sure you want to delete this category? All expenses in this category will be marked as
              "uncategorized".
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
