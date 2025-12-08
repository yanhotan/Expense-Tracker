"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { getChartCategoryColor } from "@/lib/data"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ExpensesByCategoryProps {
  data: Record<string, number>
}

export function ExpensesByCategory({ data }: ExpensesByCategoryProps) {
  // Transform data for the chart
  const chartData = Object.entries(data)
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }))
    .sort((a, b) => b.value - a.value) // Sort by value descending

  const totalAmount = Object.values(data).reduce((acc, curr) => acc + curr, 0)

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  if (chartData.length === 0) {
      return (
          <div className="flex h-full items-center justify-center text-muted-foreground p-4">
              No expenses found
          </div>
      )
  }

  return (
    <div className="flex flex-col sm:flex-row h-full w-full gap-4 p-2">
      {/* Chart Section */}
      <div className="flex-1 min-h-[250px] relative">
        <ChartContainer config={chartConfig} className="h-full w-full absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getChartCategoryColor(entry.name.toLowerCase())}
                    strokeWidth={0}
                  />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Legend Section */}
      <div className="flex-1 flex flex-col justify-start pt-4 min-w-[200px]">
        <div className="text-sm font-medium text-muted-foreground mb-4 px-2">
            Total: <span className="text-foreground font-bold">{formatCurrency(totalAmount)}</span>
        </div>
        <ScrollArea className="h-[250px] pr-4">
            <div className="space-y-3 px-2">
                {chartData.map((item) => (
                    <div key={item.name} className="flex items-center text-sm group hover:bg-muted/50 p-1 rounded transition-colors">
                        <div className="flex items-center gap-2 w-[140px]">
                            <div
                                className="h-3 w-3 rounded-full shadow-sm shrink-0"
                                style={{ backgroundColor: getChartCategoryColor(item.name.toLowerCase()) }}
                            />
                            <span className="font-medium truncate" title={item.name}>{item.name}</span>
                        </div>
                        <div className="flex items-center gap-6">
                             <span className="text-muted-foreground text-xs tabular-nums min-w-[40px] text-right">
                                {totalAmount > 0 ? ((item.value / totalAmount) * 100).toFixed(1) : 0}%
                            </span>
                            <span className="font-mono font-medium tabular-nums text-right flex-1">{formatCurrency(item.value)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
      </div>
    </div>
  )
}
