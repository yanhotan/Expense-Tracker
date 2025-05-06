"use client"

import Link from "next/link"
import { PlusCircle } from "lucide-react"
import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import { ExpenseTable } from "@/components/expense-table"
import { getExpenses, Expense } from "@/lib/data"
import { getLastAccessedSheet } from "@/lib/sheets"

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sheetId, setSheetId] = useState<string | null>(null)

  useEffect(() => {
    async function loadExpenses() {
      setIsLoading(true)
      try {
        const lastSheet = getLastAccessedSheet()
        setSheetId(lastSheet)
        
        if (lastSheet) {
          const data = await getExpenses(lastSheet)
          setExpenses(data)
        } else {
          setExpenses([])
        }
      } catch (error) {
        console.error('Error loading expenses:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadExpenses()
  }, [])

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">
          {isLoading ? 'Loading expenses...' : 'All Expenses'}
          {!isLoading && !sheetId && ' (No sheet selected)'}
        </h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <Link href="/" className="flex-1 sm:flex-none">
            <Button variant="outline" className="w-full sm:w-auto">Dashboard</Button>
          </Link>
          <Link href={sheetId ? `/expenses/add?sheetId=${sheetId}` : "/"} className="flex-1 sm:flex-none">
            <Button className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p>Loading expense data...</p>
          </div>
        </div>
      ) : !sheetId ? (
        <div className="text-center py-8 bg-muted rounded-lg">
          <p className="mb-4">Please select a sheet to view expenses</p>
          <Link href="/">
            <Button>
              Select Sheet
            </Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-full">
            <ExpenseTable expenses={expenses} />
          </div>
        </div>
      )}
    </div>
  )
}
