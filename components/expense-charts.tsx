"use client"

import { useEffect, useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExpensesByCategory } from "@/components/charts/expenses-by-category"
import { MonthlyExpenses } from "@/components/charts/monthly-expenses"
import { getExpenses, getCategoryTotals, getMonthlyTotal } from "@/lib/data"

export function ExpenseCharts() {
  const [categoryTotals, setCategoryTotals] = useState<Record<string, number>>({})
  const [monthlyTotals, setMonthlyTotals] = useState<Record<string, number>>({})

  useEffect(() => {
    // Load data
    const expenses = getExpenses()
    setCategoryTotals(getCategoryTotals(expenses))
    setMonthlyTotals(getMonthlyTotal(expenses))
  }, [])

  return (
    <Tabs defaultValue="categories">
      <TabsList className="mb-4">
        <TabsTrigger value="categories">By Category</TabsTrigger>
        <TabsTrigger value="monthly">Monthly Trend</TabsTrigger>
      </TabsList>

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
    </Tabs>
  )
}
