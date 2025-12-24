"use client"

// Mark this page as dynamically rendered to avoid build-time errors
export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { ExpenseSpreadsheet } from "@/components/expense-spreadsheet"
import { ExpenseCharts } from "@/components/expense-charts"
import { SheetSelector } from "@/components/sheet-selector"
import { getLocalSheetById } from "@/lib/sheets"
import { Button } from "@/components/ui/button"

export default function Home() {
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null)
  const [sheetName, setSheetName] = useState<string>("")
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  
  useEffect(() => {
    // Check for a previously selected sheet on load
    const lastSheet = localStorage.getItem("expense-tracker-last-sheet")
    if (lastSheet) {
      setSelectedSheet(lastSheet)
      
      // Get the sheet name for display
      const sheetDetails = getLocalSheetById(lastSheet)
      if (sheetDetails) {
        setSheetName(sheetDetails.name)
      }
    }
  }, [])
  
  const handleSheetSelect = (sheetId: string) => {
    setSelectedSheet(sheetId)
    
    // Get the sheet name for display
    const sheetDetails = getLocalSheetById(sheetId)
    if (sheetDetails) {
      setSheetName(sheetDetails.name)
    }
    
    // Save the selected sheet to localStorage for future visits
    localStorage.setItem("expense-tracker-last-sheet", sheetId)
  }
  
  const handleSwitchSheet = () => {
    // Clear selected sheet from state
    setSelectedSheet(null)
    // Also clear from localStorage to ensure consistent behavior
    localStorage.removeItem("expense-tracker-last-sheet")
    // Reset sheet name
    setSheetName("")
    // Increment refresh trigger to ensure sheet selector reloads data
    setRefreshTrigger(prev => prev + 1)
  }

  // Handle month change from the spreadsheet component
  const handleMonthChange = (date: Date) => {
    setSelectedMonth(date)
  }

  const handleRefresh = () => {
    // Increment refresh trigger to force reload
    setRefreshTrigger(prev => prev + 1)
  }
  
  return (
    <div className="container mx-auto py-6 px-4 sm:px-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 flex items-center justify-between">
        <span>Monthly Expense Tracker</span>
      </h1>
      
      {!selectedSheet ? (
        <div className="mb-8">
          <SheetSelector onSelectSheet={handleSheetSelect} key={`sheet-selector-${refreshTrigger}`} />
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
            <h2 className="text-lg sm:text-xl font-semibold">Expense Sheet: {sheetName}</h2>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                onClick={handleRefresh}
                variant="outline"
                className="text-sm flex-1 sm:flex-none"
              >
                <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"/>
                </svg>
                Refresh
              </Button>
              <Button 
                onClick={handleSwitchSheet}
                variant="outline"
                className="text-sm flex-1 sm:flex-none"
              >
                Switch Sheet
              </Button>
            </div>
          </div>
          
          <div className="mb-8 overflow-x-auto">
            <div className="min-w-full">
              <ExpenseSpreadsheet 
                sheetId={selectedSheet} 
                currentMonth={selectedMonth}
                onMonthChange={handleMonthChange}
                key={`spreadsheet-${refreshTrigger}`}
              />
            </div>
          </div>

          <div className="mt-8 sm:mt-12">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">Expense Analysis</h2>
            <div className="overflow-x-auto">
              <div className="min-w-full">
                <ExpenseCharts 
                  sheetId={selectedSheet} 
                  selectedMonth={selectedMonth}
                  key={`charts-${refreshTrigger}`}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
