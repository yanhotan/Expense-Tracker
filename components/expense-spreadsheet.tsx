"use client"

import { useEffect, useState } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns"
import { Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { getExpenses, saveExpenses, type Expense } from "@/lib/data"

export function ExpenseSpreadsheet() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [isLoading, setIsLoading] = useState(true)

  // Generate dates for the current month
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })

  // Initialize or load data
  useEffect(() => {
    const storedExpenses = getExpenses()
    setExpenses(storedExpenses)
    setIsLoading(false)
  }, [])

  // Handle expense input change
  const handleExpenseChange = (date: Date, category: string, value: string) => {
    const amount = value === "" ? 0 : Number.parseFloat(value)

    if (isNaN(amount)) return

    setExpenses((prev) => {
      // Find if there's an existing expense for this date and category
      const existingIndex = prev.findIndex((exp) => isSameDay(new Date(exp.date), date) && exp.category === category)

      const newExpenses = [...prev]

      if (existingIndex >= 0) {
        // Update existing expense
        if (amount === 0) {
          // Remove if amount is 0
          newExpenses.splice(existingIndex, 1)
        } else {
          // Update amount
          newExpenses[existingIndex] = {
            ...newExpenses[existingIndex],
            amount,
          }
        }
      } else if (amount > 0) {
        // Add new expense if amount > 0
        newExpenses.push({
          id: Date.now().toString(),
          date: date.toISOString(),
          amount,
          category,
          description: `Expense on ${format(date, "MMM dd")}`,
        })
      }

      return newExpenses
    })
  }

  // Save expenses to localStorage
  const handleSave = () => {
    saveExpenses(expenses)
    toast({
      title: "Expenses saved",
      description: "Your expense data has been saved successfully.",
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

  // Categories
  const categories = ["food", "accessories", "transport", "investment", "others"]

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

        <Button onClick={handleSave} className="ml-auto">
          <Save className="mr-2 h-4 w-4" />
          Save
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
