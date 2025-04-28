"use client"

import { ArrowDownIcon, ArrowUpIcon, DollarSign } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getExpenses, getCurrentMonthTotal, getPreviousMonthTotal, getCategoryTotals } from "@/lib/data"

export function ExpenseSummary() {
  const expenses = getExpenses()
  const currentMonthTotal = getCurrentMonthTotal()
  const previousMonthTotal = getPreviousMonthTotal()
  const categoryTotals = getCategoryTotals()

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

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses (This Month)</CardTitle>
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
              from last month
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
          <CardTitle className="text-sm font-medium">Total Expenses Recorded</CardTitle>
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
          <div className="text-2xl font-bold">{expenses.length}</div>
          <p className="text-xs text-muted-foreground mt-1">Across {Object.keys(categoryTotals).length} categories</p>
        </CardContent>
      </Card>
    </>
  )
}
