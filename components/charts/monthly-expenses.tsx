"use client"

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"

interface MonthlyExpensesProps {
  data: Record<string, number>
}

export function MonthlyExpenses({ data }: MonthlyExpensesProps) {
  // Transform data for the chart
  const chartData = Object.entries(data).map(([month, total]) => ({
    month,
    total,
  }))
  return (
    <ChartContainer
      config={{
        total: {
          label: "Total Expenses",
          color: "hsl(203, 51%, 29%)",
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
