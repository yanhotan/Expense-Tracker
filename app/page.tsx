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
  
  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold mb-6">Monthly Expense Tracker</h1>
      
      {!selectedSheet ? (
        <div className="mb-8">
          <SheetSelector onSelectSheet={handleSheetSelect} key={`sheet-selector-${refreshTrigger}`} />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Expense Sheet: {sheetName}</h2>
            <Button 
              onClick={handleSwitchSheet}
              variant="outline"
              className="text-sm"
            >
              Switch Sheet
            </Button>
          </div>
          
          <div className="mb-8">
            <ExpenseSpreadsheet 
              sheetId={selectedSheet} 
              currentMonth={selectedMonth}
              onMonthChange={handleMonthChange}
            />
          </div>

          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-4">Expense Analysis</h2>
            <ExpenseCharts 
              sheetId={selectedSheet} 
              selectedMonth={selectedMonth}
            />
          </div>
        </>
      )}
    </div>
  )
}
