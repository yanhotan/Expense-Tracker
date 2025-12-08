"use client"

import { useEffect, useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { ExpensesByCategory } from "./charts/expenses-by-category"
import { MonthlyExpenses } from "./charts/monthly-expenses"
import { analyticsApi } from "../lib/api"

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
        // Get analytics data from API - much simpler!
        const response = await analyticsApi.getAll({ sheetId })

        setCategoryTotals(response.categoryTotals)
        setMonthlyTotals(response.monthlyTotals)
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
