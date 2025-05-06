"use client"

import Link from "next/link"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { ExpenseForm } from "@/components/expense-form"

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

export default function AddExpensePage() {
  return (
    <div className="container mx-auto py-6 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Add New Expense</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <Link href="/expenses" className="flex-1 sm:flex-none">
            <Button variant="outline" className="w-full sm:w-auto">View All Expenses</Button>
          </Link>
          <Link href="/" className="flex-1 sm:flex-none">
            <Button variant="outline" className="w-full sm:w-auto">Dashboard</Button>
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <Suspense fallback={
          <div className="flex justify-center py-10">
            <div className="text-center">
              <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p>Loading expense form...</p>
            </div>
          </div>
        }>
          <ExpenseForm />
        </Suspense>
      </div>
    </div>
  )
}
