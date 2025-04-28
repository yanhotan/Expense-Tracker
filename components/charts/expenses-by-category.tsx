"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"

interface ExpensesByCategoryProps {
  data: Record<string, number>
}

export function ExpensesByCategory({ data }: ExpensesByCategoryProps) {
  // Transform data for the chart
  const chartData = Object.entries(data).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }))

  // Define colors for each category
  const COLORS = {
    food: "hsl(var(--chart-1))",
    accessories: "hsl(var(--chart-2))",
    transport: "hsl(var(--chart-3))",
    investment: "hsl(var(--chart-4))",
    others: "hsl(var(--chart-5))",
  }

  return (
    <ChartContainer
      config={{
        food: {
          label: "Food",
          color: COLORS.food,
        },
        accessories: {
          label: "Accessories",
          color: COLORS.accessories,
        },
        transport: {
          label: "Transport",
          color: COLORS.transport,
        },
        investment: {
          label: "Investment",
          color: COLORS.investment,
        },
        others: {
          label: "Others",
          color: COLORS.others,
        },
      }}
      className="h-full"
    >
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
                fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS] || COLORS.others}
              />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltipContent />} />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
