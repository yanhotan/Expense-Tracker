"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { getChartCategoryColor } from "@/lib/data"

interface ExpensesByCategoryProps {
  data: Record<string, number>
}

export function ExpensesByCategory({ data }: ExpensesByCategoryProps) {
  // Transform data for the chart
  const chartData = Object.entries(data).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }))

  // Create a dynamic config object
  const chartConfig = chartData.reduce(
    (config, item) => {
      const categoryKey = item.name.toLowerCase()
      config[categoryKey] = {
        label: item.name,
        color: getChartCategoryColor(categoryKey),
      }
      return config
    },
    {} as Record<string, { label: string; color: string }>
  )

  return (
    <ChartContainer config={chartConfig} className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getChartCategoryColor(entry.name.toLowerCase())}
              />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltipContent />} />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
