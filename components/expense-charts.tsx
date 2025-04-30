"use client"

import { useEffect, useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExpensesByCategory } from "@/components/charts/expenses-by-category"
import { MonthlyExpenses } from "@/components/charts/monthly-expenses"
import { getExpenses } from "@/lib/data"

export function ExpenseCharts({ sheetId }: { sheetId: string }) {
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
        // We need to update the data methods to filter by sheetId
        const expenses = await getExpenses(sheetId)
        
        // Calculate category totals for this sheet
        const categoryData = expenses.reduce(
          (acc, expense) => {
            const category = expense.category
            acc[category] = (acc[category] || 0) + expense.amount
            return acc
          },
          {} as Record<string, number>
        )
        
        // Calculate monthly totals for this sheet
        const monthlyData: Record<string, number> = {}
        expenses.forEach((expense) => {
          const date = new Date(expense.date)
          const monthYear = `${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`
          monthlyData[monthYear] = (monthlyData[monthYear] || 0) + expense.amount
        })
        
        setCategoryTotals(categoryData)
        setMonthlyTotals(monthlyData)
      } catch (error) {
        console.error('Error loading chart data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [sheetId]) // Re-run when sheet changes

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
                <CardDescription>Breakdown of your spending across different categories</CardDescription>
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
                <CardDescription>Your spending trend over the past months</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <MonthlyExpenses data={monthlyTotals} />
              </CardContent>
            </Card>
          </TabsContent>
        </>
      )}
    </Tabs>
  )
}
