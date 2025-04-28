"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ExpenseForm } from "@/components/expense-form"

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

export default function AddExpensePage() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Add New Expense</h1>
        <div className="flex gap-4">
          <Link href="/expenses">
            <Button variant="outline">View All Expenses</Button>
          </Link>
          <Link href="/">
            <Button variant="outline">Dashboard</Button>
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <ExpenseForm />
      </div>
    </div>
  )
}
