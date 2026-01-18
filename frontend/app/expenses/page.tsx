"use client"

import Link from "next/link"
import { PlusCircle } from "lucide-react"
import { useState, useEffect } from "react"
 
import { Button } from "@/components/ui/button"
import { ExpenseTable } from "@/components/expense-table"
import { Expense } from "@/lib/data"
import { expenseApi } from "@/lib/api"
import { getLastAccessedSheet } from "@/lib/sheets"

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]) // Properly type the expenses state
  const [isLoading, setIsLoading] = useState(true)
  const [sheetId, setSheetId] = useState<string | null>(null)

  useEffect(() => {
    async function loadExpenses() {
      setIsLoading(true)
      const startTime = Date.now()
      
      try {
        // Get the last accessed sheet
        const lastSheet = getLastAccessedSheet()
        console.log('📋 Loading expenses for sheet:', lastSheet)
        setSheetId(lastSheet)
        
        if (lastSheet) {
          console.log('📡 Calling expenseApi.getAll...')
          const response = await expenseApi.getAll({ sheetId: lastSheet })
          const elapsed = Date.now() - startTime
          
          console.log(`✅ API response received (${elapsed}ms):`, response)
          console.log('📊 Response structure:', {
            hasData: !!response.data,
            dataIsArray: Array.isArray(response.data),
            dataLength: response.data?.length,
            fullResponse: response
          })
          
          // Handle different response formats
          if (response && response.data && Array.isArray(response.data)) {
            console.log(`✅ Setting ${response.data.length} expenses`)
            setExpenses(response.data)
          } else if (Array.isArray(response)) {
            console.log(`✅ Setting ${response.length} expenses (direct array)`)
            setExpenses(response)
          } else {
            console.warn('⚠️ Unexpected response format:', response)
            setExpenses([])
          }
        } else {
          console.log('⚠️ No sheet selected')
          setExpenses([])
        }
      } catch (error: any) {
        const elapsed = Date.now() - startTime
        console.error(`❌ Error loading expenses (${elapsed}ms):`, error)
        console.error('Error details:', {
          message: error?.message,
          stack: error?.stack,
          name: error?.name
        })
        setExpenses([])
      } finally {
        setIsLoading(false)
        console.log('🏁 Loading complete, isLoading set to false')
      }
    }
    
    loadExpenses()
  }, [])

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">
          {isLoading ? 'Loading expenses...' : 'All Expenses'}
          {!isLoading && !sheetId && ' (No sheet selected)'}
        </h1>
        <div className="flex gap-4">
          <Link href="/">
            <Button variant="outline">Dashboard</Button>
          </Link>
          <Link href={sheetId ? `/expenses/add?sheetId=${sheetId}` : "/"}>
            <Button>
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
        <ExpenseTable expenses={expenses} />
      )}
    </div>
  )
}
