"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { ExpensesByCategory } from "./charts/expenses-by-category"
import { MonthlyExpenses } from "./charts/monthly-expenses"
import { analyticsApi, expenseApi } from "../lib/api"

interface ExpenseChartsProps {
  sheetId: string
  selectedMonth?: Date
}

export function ExpenseCharts({ sheetId, selectedMonth }: ExpenseChartsProps) {
  const [categoryTotals, setCategoryTotals] = useState<Record<string, number>>({})
  const [monthlyTotals, setMonthlyTotals] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load data asynchronously
    async function loadData() {
      if (!sheetId) {
        console.warn('No sheet ID provided, cannot load chart data')
        return
      }

      try {
        setIsLoading(true)
        
        // For category totals: use month filter to show selected month's categories
        const monthParam = selectedMonth 
          ? format(selectedMonth, 'yyyy-MM')
          : undefined
        
        // Fetch category totals with month filter
        const categoryResponse = await analyticsApi.getAll({ 
          sheetId,
          month: monthParam
        })
        
        // For monthly totals: fetch ALL expenses to calculate monthly totals for all months
        // The backend analytics API defaults to current month when no filter is provided,
        // so we fetch expenses directly and calculate monthly totals ourselves
        const allExpensesResponse = await expenseApi.getAll({ sheetId })
        const allExpenses = Array.isArray(allExpensesResponse.data) 
          ? allExpensesResponse.data 
          : allExpensesResponse.data?.data || []
        
        // Calculate monthly totals from all expenses
        const monthlyTotalsMap: Record<string, number> = {}
        allExpenses.forEach((expense: any) => {
          if (expense.date) {
            // Extract year-month from date (format: YYYY-MM-DD or ISO string)
            const dateStr = expense.date.split('T')[0] // Handle ISO format
            const yearMonth = dateStr.substring(0, 7) // Get YYYY-MM
            monthlyTotalsMap[yearMonth] = (monthlyTotalsMap[yearMonth] || 0) + (expense.amount || 0)
          }
        })

        setCategoryTotals(categoryResponse.categoryTotals)
        setMonthlyTotals(monthlyTotalsMap)
      } catch (error) {
        console.error('Error loading chart data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [sheetId, selectedMonth ? format(selectedMonth, 'yyyy-MM') : null]) // Re-run when sheet or month changes (use string for reliable comparison)

  return (
    <Tabs defaultValue="categories">
      <TabsList className="mb-4">
        <TabsTrigger value="categories">By Category</TabsTrigger>
        <TabsTrigger value="monthly">Monthly Trend</TabsTrigger>
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
                  {selectedMonth 
                    ? `Breakdown of your spending for ${format(selectedMonth, 'MMMM yyyy')}`
                    : 'Breakdown of your spending across different categories'}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ExpensesByCategory data={categoryTotals} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Expenses</CardTitle>
                <CardDescription>
                  Your spending trend across all available months
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <MonthlyExpenses 
                  data={monthlyTotals} 
                  selectedYear={selectedMonth?.getFullYear()}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </>
      )}
    </Tabs>
  )
}
