"use client"

import { useEffect, useState } from "react"
import { ArrowDownIcon, ArrowUpIcon, DollarSign } from "lucide-react"
import { format } from "date-fns"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getExpenses } from "@/lib/data"
import type { Expense } from "@/lib/data"

export function ExpenseSummary({ sheetId }: { sheetId?: string }) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [currentMonthTotal, setCurrentMonthTotal] = useState<number>(0)
  const [previousMonthTotal, setPreviousMonthTotal] = useState<number>(0) 
  const [categoryTotals, setCategoryTotals] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [availableMonths, setAvailableMonths] = useState<string[]>([])

  // Fetch all expenses data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        // Reset all state data to prevent any data leakage
        setCurrentMonthTotal(0)
        setPreviousMonthTotal(0)
        setCategoryTotals({})
        setFilteredExpenses([])
        
        // Fetch expenses for this specific sheet only
        const fetchedExpenses = await getExpenses(sheetId)
        
        // Double check we're only working with expenses from this sheet
        const filteredBySheet = sheetId 
          ? fetchedExpenses.filter(expense => expense.sheet_id === sheetId)
          : fetchedExpenses
          
        setExpenses(filteredBySheet)
        
        // Get unique months from expenses
        const months = new Set<string>()
        filteredBySheet.forEach((expense) => {
          const date = new Date(expense.date)
          const monthYear = format(date, "MMMM yyyy")
          months.add(monthYear)
        })
        
        const monthsList = Array.from(months).sort((a, b) => {
          // Sort months in chronological order (most recent first)
          const dateA = new Date(a)
          const dateB = new Date(b)
          return dateB.getTime() - dateA.getTime()
        })
        
        setAvailableMonths(monthsList)
        
        // Default to the most recent month if available
        if (monthsList.length > 0) {
          setSelectedMonth(monthsList[0])
        }
      } catch (error) {
        console.error('Error loading expense summary data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [sheetId])

  // Filter and process data when selected month changes
  useEffect(() => {
    if (!selectedMonth || expenses.length === 0) return
    
    // Reset all data to prevent leakage between months
    setCurrentMonthTotal(0)
    setPreviousMonthTotal(0)
    setCategoryTotals({})
    setFilteredExpenses([])
    
    // Extract month and year from the selected month string for precise filtering
    const [monthName, yearStr] = selectedMonth.split(' ')
    const selectedMonthNum = new Date(`${monthName} 1, ${yearStr}`).getMonth()
    const selectedYear = parseInt(yearStr)
    
    // Filter expenses for the current selected month using strict date matching
    const currentMonthExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date)
      return expenseDate.getMonth() === selectedMonthNum && 
             expenseDate.getFullYear() === selectedYear
    })
    
    console.log(`Found ${currentMonthExpenses.length} expenses for ${selectedMonth}`)
    setFilteredExpenses(currentMonthExpenses)
    
    // Calculate total for the current month
    const currentTotal = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    setCurrentMonthTotal(currentTotal)
    
    // Find the previous month in the available months list
    const currentMonthIndex = availableMonths.indexOf(selectedMonth)
    const previousMonthName = currentMonthIndex < availableMonths.length - 1 
      ? availableMonths[currentMonthIndex + 1] 
      : null
    
    // Calculate total for the previous month if available
    if (previousMonthName) {
      // Extract month and year for previous month
      const [prevMonthName, prevYearStr] = previousMonthName.split(' ')
      const prevMonthNum = new Date(`${prevMonthName} 1, ${prevYearStr}`).getMonth()
      const prevYear = parseInt(prevYearStr)
      
      // Filter expenses for the previous month using strict date matching
      const previousMonthExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date)
        return expenseDate.getMonth() === prevMonthNum && 
               expenseDate.getFullYear() === prevYear
      })
      
      const prevTotal = previousMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0)
      setPreviousMonthTotal(prevTotal)
      console.log(`Previous month (${previousMonthName}): $${prevTotal}`)
    } else {
      setPreviousMonthTotal(0)
    }
    
    // Calculate category totals for the current month
    const catTotals = currentMonthExpenses.reduce(
      (acc, expense) => {
        const category = expense.category
        acc[category] = (acc[category] || 0) + expense.amount
        return acc
      },
      {} as Record<string, number>,
    )
    
    setCategoryTotals(catTotals)
  }, [selectedMonth, expenses, availableMonths])

  const handleMonthChange = (month: string) => {
    // Reset all data when changing months
    setCurrentMonthTotal(0)
    setPreviousMonthTotal(0)
    setCategoryTotals({})
    setFilteredExpenses([])
    setSelectedMonth(month)
  }

  // Find the category with the highest spending
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0] || ["None", 0]

  // Calculate month-over-month change
  const percentChange = previousMonthTotal ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100 : 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Loading state UI
  if (isLoading) {
    return (
      <>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-5 w-32 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-4 w-4 bg-gray-200 animate-pulse rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-7 w-24 bg-gray-200 animate-pulse rounded mb-2"></div>
              <div className="h-4 w-36 bg-gray-200 animate-pulse rounded"></div>
            </CardContent>
          </Card>
        ))}
      </>
    )
  }

  return (
    <>
      {availableMonths.length > 0 && (
        <div className="flex justify-end mb-4">
          <Select value={selectedMonth} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses ({selectedMonth})</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(currentMonthTotal)}</div>
          {previousMonthTotal > 0 && (
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              {percentChange > 0 ? (
                <>
                  <ArrowUpIcon className="mr-1 h-4 w-4 text-red-500" />
                  <span className="text-red-500 font-medium">{Math.abs(percentChange).toFixed(1)}% </span>
                </>
              ) : (
                <>
                  <ArrowDownIcon className="mr-1 h-4 w-4 text-green-500" />
                  <span className="text-green-500 font-medium">{Math.abs(percentChange).toFixed(1)}% </span>
                </>
              )}
              from {availableMonths[availableMonths.indexOf(selectedMonth) + 1] || "previous month"}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Spending Category</CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-muted-foreground"
          >
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold capitalize">{topCategory[0]}</div>
          <p className="text-xs text-muted-foreground mt-1">{formatCurrency(topCategory[1])} total spent</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Expenses Recorded</CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-muted-foreground"
          >
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <path d="M2 10h20" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{filteredExpenses.length}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Across {Object.keys(categoryTotals).length} categories in {selectedMonth}
          </p>
        </CardContent>
      </Card>
    </>
  )
}
