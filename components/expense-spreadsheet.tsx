"use client"

import { useEffect, useState } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns"
import { Save } from "lucide-react"
import { v4 as uuidv4 } from 'uuid'

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { getExpenses, addExpense, deleteExpense, updateExpense, type Expense } from "@/lib/data"

export function ExpenseSpreadsheet() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [unsavedChanges, setUnsavedChanges] = useState<{
    [key: string]: { date: Date; category: string; value: string; originalExpense?: Expense }
  }>({})

  // Generate dates for the current month
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })

  // Initialize or load data
  useEffect(() => {
    async function loadExpenses() {
      setIsLoading(true)
      try {
        const storedExpenses = await getExpenses()
        setExpenses(storedExpenses)
      } catch (error) {
        console.error('Error loading expenses:', error)
        toast({
          title: "Error",
          description: "Failed to load expenses. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadExpenses()
  }, [])

  // Handle expense input change
  const handleExpenseChange = (date: Date, category: string, value: string) => {
    const amount = value === "" ? 0 : Number.parseFloat(value)
    if (isNaN(amount)) return

    // Create a unique key for this date-category combination
    const key = `${date.toISOString()}-${category}`
    
    // Find if there's an existing expense for this date and category
    const existingExpense = expenses.find((exp) => isSameDay(new Date(exp.date), date) && exp.category === category)

    // Update unsaved changes
    setUnsavedChanges(prev => ({
      ...prev,
      [key]: {
        date,
        category,
        value: value === "" ? "0" : value,
        originalExpense: existingExpense
      }
    }))

    // Update local state for immediate UI feedback
    setExpenses((prev) => {
      const existingIndex = prev.findIndex((exp) => isSameDay(new Date(exp.date), date) && exp.category === category)
      const newExpenses = [...prev]

      if (existingIndex >= 0) {
        if (amount === 0) {
          // Remove locally if amount is 0
          newExpenses.splice(existingIndex, 1)
        } else {
          // Update amount locally
          newExpenses[existingIndex] = {
            ...newExpenses[existingIndex],
            amount,
          }
        }
      } else if (amount > 0) {
        // Add new expense locally if amount > 0
        newExpenses.push({
          id: `temp-${Date.now()}`, // Temporary ID until saved to Supabase
          date: date.toISOString(),
          amount,
          category,
          description: `Expense on ${format(date, "MMM dd")}`,
        })
      }

      return newExpenses
    })
  }

  // Save expenses to Supabase
  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Process all unsaved changes
      const changeKeys = Object.keys(unsavedChanges)
      
      for (const key of changeKeys) {
        const change = unsavedChanges[key]
        const amount = Number.parseFloat(change.value)
        
        if (change.originalExpense) {
          // Existing expense
          if (amount === 0) {
            // Delete the expense
            await deleteExpense(change.originalExpense.id)
          } else {
            // Update the expense
            await updateExpense({
              ...change.originalExpense,
              amount
            })
          }
        } else if (amount > 0) {
          // New expense
          await addExpense({
            id: uuidv4(),
            date: change.date.toISOString(),
            amount,
            category: change.category,
            description: `Expense on ${format(change.date, "MMM dd")}`,
          })
        }
      }
      
      // Fetch the updated expenses
      const updatedExpenses = await getExpenses()
      setExpenses(updatedExpenses)
      
      // Clear unsaved changes
      setUnsavedChanges({})

      toast({
        title: "Expenses saved",
        description: "Your expense data has been saved successfully to Supabase.",
      })
    } catch (error) {
      console.error('Error saving expenses:', error)
      toast({
        title: "Error",
        description: "Failed to save expenses. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Get expense amount for a specific date and category
  const getExpenseAmount = (date: Date, category: string): string => {
    // Check for unsaved changes first
    const key = `${date.toISOString()}-${category}`
    if (unsavedChanges[key]) {
      return unsavedChanges[key].value === "0" ? "" : unsavedChanges[key].value
    }

    // Otherwise use the expense from state
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

  // Categories
  const categories = ["food", "accessories", "transport", "investment", "others"]

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

        <Button onClick={handleSave} disabled={isSaving || Object.keys(unsavedChanges).length === 0} className="ml-auto">
          {isSaving ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save {Object.keys(unsavedChanges).length > 0 ? `(${Object.keys(unsavedChanges).length})` : ''}
            </>
          )}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px] sticky left-0 bg-background z-10">Date</TableHead>
              {categories.map((category) => (
                <TableHead key={category} className="min-w-[120px] capitalize">
                  {category}
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
    </Card>
  )
}
