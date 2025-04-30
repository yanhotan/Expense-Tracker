"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { LockIcon, UnlockIcon, UserIcon, PlusCircle } from "lucide-react"
import { getExpenseSheets, verifySheetPin, setLastAccessedSheet, getLastAccessedSheet, createExpenseSheet, type ExpenseSheet } from "@/lib/sheets"
import { supabase } from "@/lib/supabase" // Import the supabase client

export function SheetSelector({ onSelectSheet }: { onSelectSheet: (userId: string) => void }) {
  const [availableSheets, setAvailableSheets] = useState<ExpenseSheet[]>([])
  const [selectedSheet, setSelectedSheet] = useState<ExpenseSheet | null>(null)
  const [pinInput, setPinInput] = useState("")
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [newSheetDialogOpen, setNewSheetDialogOpen] = useState(false)
  const [newSheetName, setNewSheetName] = useState("")
  const [newSheetPin, setNewSheetPin] = useState("")
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  // Load available sheets from Supabase
  useEffect(() => {
    async function loadSheets() {
      setIsLoading(true)
      try {
        // Add debugging to check user authentication
        const { data: { user } } = await supabase.auth.getUser()
        console.log('Current user:', user ? `Authenticated as ${user.id}` : 'Not authenticated')
        
        const sheets = await getExpenseSheets()
        console.log('Fetched sheets:', sheets)
        setAvailableSheets(sheets)
        
        // Check if there's a last used sheet
        const lastSheetId = getLastAccessedSheet()
        console.log('Last accessed sheet ID:', lastSheetId)
        
        if (lastSheetId) {
          const lastSheet = sheets.find(s => s.id === lastSheetId)
          console.log('Last sheet found in sheets array:', lastSheet)
          
          if (lastSheet) {
            setSelectedSheet(lastSheet)
            // Auto-access if no PIN is required
            if (!lastSheet.has_pin) {
              accessSheet(lastSheet.id)
            }
          } else {
            console.warn('Last accessed sheet not found in available sheets')
            // If last sheet not found but we have sheets, select the first one
            if (sheets.length > 0) {
              console.log('Selecting first available sheet instead')
              setSelectedSheet(sheets[0])
            }
          }
        } else if (sheets.length > 0) {
          // If no last sheet but we have sheets, select the first one
          console.log('No last sheet found, selecting first sheet')
          setSelectedSheet(sheets[0])
        }
      } catch (error) {
        console.error("Failed to load sheets:", error)
        toast({
          title: "Error",
          description: "Failed to load expense sheets. Please try again.",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    loadSheets()
  }, [refreshTrigger, onSelectSheet]) // Include onSelectSheet in dependencies
  
  // Handle sheet selection and PIN verification if needed
  const handleSelectSheet = (sheet: ExpenseSheet) => {
    setSelectedSheet(sheet)
    setPinInput("")
    
    if (sheet.has_pin) {
      // If it has a PIN, show the dialog
      setPinDialogOpen(true)
    } else {
      // If no PIN is set, directly access the sheet
      accessSheet(sheet.id)
    }
  }
  
  // Grant access to sheet after successful authentication or for sheets without PIN
  const accessSheet = (sheetId: string) => {
    setLastAccessedSheet(sheetId)
    toast({
      title: "Sheet accessed",
      description: `You are now viewing the expense sheet.`,
    })
    onSelectSheet(sheetId)
  }
  
  // Verify PIN and access sheet
  const handlePinSubmit = async () => {
    if (!selectedSheet) return
    
    try {
      const isValid = await verifySheetPin(selectedSheet.id, pinInput)
      
      if (isValid) {
        // PIN is correct, grant access
        setPinDialogOpen(false)
        accessSheet(selectedSheet.id)
      } else {
        toast({
          title: "Access denied",
          description: "Incorrect PIN. Please try again.",
          variant: "destructive",
        })
      }
    } catch (e) {
      console.error("Error verifying PIN", e)
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    }
  }
  
  // Create new sheet function with debugging
  const handleCreateSheet = async () => {
    if (!newSheetName) {
      toast({
        title: "Invalid input",
        description: "Please provide a valid name for your sheet",
        variant: "destructive",
      })
      return
    }

    // PIN is optional, but if provided, must be at least 4 digits
    if (newSheetPin && newSheetPin.length < 4) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be at least 4 digits long",
        variant: "destructive",
      })
      return
    }

    try {
      console.log('Creating new sheet with name:', newSheetName, 'PIN:', newSheetPin ? 'Set' : 'None')
      
      // Create a new sheet with optional PIN protection in Supabase
      const newSheet = await createExpenseSheet({
        name: newSheetName,
        pin: newSheetPin || undefined
      })
      
      console.log('Sheet creation result:', newSheet)
      
      if (newSheet) {
        toast({
          title: "Sheet created",
          description: `New expense sheet "${newSheetName}" has been created. ${newSheetPin ? "You can access it with the PIN you set." : "No PIN protection was set."}`,
        })
        
        // Clear previous data
        setNewSheetName("")
        setNewSheetPin("")
        setNewSheetDialogOpen(false)
        
        // Add the new sheet to the list immediately
        setAvailableSheets(prev => [newSheet, ...prev])
        
        // Access the new sheet without PIN check
        if (!newSheet.has_pin) {
          accessSheet(newSheet.id)
        } else {
          // Select it but require PIN
          setSelectedSheet(newSheet)
          setPinDialogOpen(true)
        }
        
        // Also trigger refresh to ensure everything is in sync
        setTimeout(() => {
          setRefreshTrigger(prev => prev + 1)
        }, 500)
      } else {
        toast({
          title: "Error",
          description: "Failed to create new sheet. Please check the console for details.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error creating new sheet:', error)
      toast({
        title: "Error",
        description: "Failed to create new sheet. Please try again.",
        variant: "destructive",
      })
    }
  }
  
  // Format the date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString()
    } catch (e) {
      return "Unknown date"
    }
  }
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex justify-center items-center">
            <div className="text-center">
              <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p>Loading expense sheets...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Select Expense Sheet</CardTitle>
              <CardDescription>
                Choose a sheet to view or enter expenses
              </CardDescription>
            </div>
            <Button onClick={() => setNewSheetDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Sheet
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableSheets.map((sheet) => (
              <Card 
                key={sheet.id} 
                className={`cursor-pointer transition-colors hover:border-primary ${selectedSheet?.id === sheet.id ? 'border-primary' : ''}`}
                onClick={() => handleSelectSheet(sheet)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 mr-2" />
                      {sheet.name}
                    </div>
                    {sheet.has_pin ? (
                      <div title="PIN protected">
                        <LockIcon className="h-4 w-4 text-amber-500" />
                      </div>
                    ) : (
                      <div title="No PIN protection">
                        <UnlockIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardFooter className="pt-2 text-xs text-muted-foreground">
                  Created on {formatDate(sheet.created_at)}
                </CardFooter>
              </Card>
            ))}
          </div>
          
          {availableSheets.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No expense sheets found.</p>
              <p className="mt-2">Click "Create Sheet" to create your first sheet.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle>Enter PIN</DialogTitle>
            <DialogDescription>
              Enter the PIN for {selectedSheet?.name}'s expense sheet
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center space-x-2">
              <LockIcon className="h-4 w-4 text-muted-foreground" />
              <Input 
                type="password" 
                placeholder="Enter PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handlePinSubmit}>Access Sheet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={newSheetDialogOpen} onOpenChange={setNewSheetDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Expense Sheet</DialogTitle>
            <DialogDescription>
              Create a new expense sheet. PIN protection is optional.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="name" className="text-right">
                Name
              </label>
              <Input
                id="name"
                className="col-span-3"
                placeholder="E.g., TYH"
                value={newSheetName}
                onChange={(e) => setNewSheetName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="pin" className="text-right">
                PIN (Optional)
              </label>
              <Input
                id="pin"
                type="password"
                className="col-span-3"
                minLength={4}
                maxLength={8}
                placeholder="Set a numeric PIN (optional)"
                value={newSheetPin}
                onChange={(e) => setNewSheetPin(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleCreateSheet}>
              Create Sheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}