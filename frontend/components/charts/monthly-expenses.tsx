"use client"

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { format } from "date-fns"

import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"

interface MonthlyExpensesProps {
  data: Record<string, number>
  selectedYear?: number
}

export function MonthlyExpenses({ data, selectedYear }: MonthlyExpensesProps) {
  // Transform data: show all available months from the API
  // The API returns data in "yyyy-MM" format (e.g., "2024-01", "2024-02")
  const chartData = Object.entries(data)
    .map(([key, total]) => {
      // Parse the key which should be in "yyyy-MM" format
      let monthLabel = key
      let sortKey = key // Keep original key for sorting
      
      // If key is in "yyyy-MM" format, extract and format it
      if (/^\d{4}-\d{2}$/.test(key)) {
        const [year, month] = key.split('-')
        const monthIndex = parseInt(month, 10) - 1 // 0-11
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        monthLabel = `${monthNames[monthIndex]} ${year}`
        sortKey = key // Keep "yyyy-MM" format for sorting
      } else {
        // If it's already formatted, use it as is
        monthLabel = key
      }
      
      return {
        month: monthLabel,
        total: total || 0,
        sortKey: sortKey, // For sorting
      }
    })
    .sort((a, b) => {
      // Sort by the original key (yyyy-MM format) for chronological order
      return a.sortKey.localeCompare(b.sortKey)
    })
    .map(({ sortKey, ...rest }) => rest) // Remove sortKey from final data

  return (
    <ChartContainer
      config={{
        total: {
          label: "Total Expenses",
          color: "hsl(var(--chart-1))",
        },
      }}
      className="h-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `$${value}`} />
          <Tooltip content={<ChartTooltipContent />} />
          <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
