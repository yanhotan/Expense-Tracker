"use client"

import Link from "next/link"
import { PlusCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ExpenseTable } from "@/components/expense-table"
import { getExpenses } from "@/lib/data"

export default function ExpensesPage() {
  const expenses = getExpenses()

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">All Expenses</h1>
        <div className="flex gap-4">
          <Link href="/">
            <Button variant="outline">Dashboard</Button>
          </Link>
          <Link href="/expenses/add">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </Link>
        </div>
      </div>

      <ExpenseTable expenses={expenses} />
    </div>
  )
}
