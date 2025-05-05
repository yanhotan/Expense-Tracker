"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExpensesByCategory } from "@/components/charts/expenses-by-category"
import { MonthlyExpenses } from "@/components/charts/monthly-expenses"
import { getExpenses } from "@/lib/data"
import { Expense } from "@/lib/data"

export function ExpenseCharts({ 
  sheetId,
  selectedMonth 
}: { 
  sheetId: string;
  selectedMonth: Date;
}) {
  const [categoryTotals, setCategoryTotals] = useState<Record<string, number>>({})
  const [dailyTotals, setDailyTotals] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const monthYearString = format(selectedMonth, "MMMM yyyy")

  // Fetch expenses when sheetId changes
  useEffect(() => {
    async function loadExpenses() {
      if (!sheetId) {
        console.warn('No sheet ID provided, cannot load chart data')
        return
      }
      
      try {
        setIsLoading(true)
        // Reset data states when loading new data
        setCategoryTotals({})
        setDailyTotals({})
        
        // Get expenses for this specific sheet only
        const allExpenses = await getExpenses(sheetId)
        
        // Strictly filter for this sheet only
        const sheetExpenses = allExpenses.filter(expense => expense.sheet_id === sheetId)
        setExpenses(sheetExpenses)
      } catch (error) {
        console.error('Error loading expenses:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadExpenses()
  }, [sheetId])

  // Calculate data when selected month changes
  useEffect(() => {
    function calculateChartData() {
      // Reset data states first to ensure no data leakage
      setCategoryTotals({})
      setDailyTotals({})
      
      if (!selectedMonth || expenses.length === 0) return
      
      // Filter expenses for the selected month only using strict date matching
      const filteredExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date)
        return expenseDate.getMonth() === selectedMonth.getMonth() && 
               expenseDate.getFullYear() === selectedMonth.getFullYear()
      })
      
      console.log(`Filtered ${filteredExpenses.length} expenses for ${format(selectedMonth, "MMMM yyyy")}`)
      
      // Calculate category totals for the selected month only
      const categoryData: Record<string, number> = {}
      filteredExpenses.forEach(expense => {
        const category = expense.category
        categoryData[category] = (categoryData[category] || 0) + expense.amount
      })
      
      // Calculate daily totals for the selected month only
      const dailyData: Record<string, number> = {}
      filteredExpenses.forEach(expense => {
        const date = new Date(expense.date)
        const day = format(date, "d MMM") // Day and abbreviated month
        dailyData[day] = (dailyData[day] || 0) + expense.amount
      })
      
      setCategoryTotals(categoryData)
      setDailyTotals(dailyData)
    }
    
    calculateChartData()
  }, [selectedMonth, expenses])

  return (
    <div className="space-y-4">
      {/* Month indicator instead of selector */}
      <div className="flex justify-end">
        <div className="text-muted-foreground text-sm font-medium">
          Showing analysis for: {monthYearString}
        </div>
      </div>

      <Tabs defaultValue="categories">
        <TabsList className="mb-4">
          <TabsTrigger value="categories">By Category</TabsTrigger>
          <TabsTrigger value="monthly">Daily Trend</TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-center">
              <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p>Loading chart data...</p>
            </div>
          </div>
        ) : (
          <>
            <TabsContent value="categories">
              <Card>
                <CardHeader>
                  <CardTitle>Expenses by Category</CardTitle>
                  <CardDescription>
                    Breakdown of your spending across different categories for {monthYearString}
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  {Object.keys(categoryTotals).length > 0 ? (
                    <ExpensesByCategory data={categoryTotals} />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-muted-foreground">No expense data for {monthYearString}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="monthly">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Expenses</CardTitle>
                  <CardDescription>Your spending trend for {monthYearString}</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  {Object.keys(dailyTotals).length > 0 ? (
                    <MonthlyExpenses data={dailyTotals} />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-muted-foreground">No expense data for {monthYearString}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}
