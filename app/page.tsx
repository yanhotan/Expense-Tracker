// Mark this page as dynamically rendered to avoid build-time errors
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { ExpenseSpreadsheet } from "@/components/expense-spreadsheet"
import { ExpenseCharts } from "@/components/expense-charts"

export default function Home() {
  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold mb-6">Monthly Expense Tracker</h1>

      <div className="mb-8">
        <ExpenseSpreadsheet />
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Expense Analysis</h2>
        <ExpenseCharts />
      </div>
    </div>
  )
}
