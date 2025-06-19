"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { LockIcon, UnlockIcon, UserIcon, PlusCircle, Edit, MoreVertical } from "lucide-react"
import { getExpenseSheets, verifySheetPin, setLastAccessedSheet, getLastAccessedSheet, createExpenseSheet, updateSheetName, type ExpenseSheet } from "@/lib/sheets"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"

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
  
  // State for sheet name editing
  const [editNameDialogOpen, setEditNameDialogOpen] = useState(false)
  const [sheetToEdit, setSheetToEdit] = useState<ExpenseSheet | null>(null)
  const [editedSheetName, setEditedSheetName] = useState("")
  
  // Load available sheets from Supabase
  useEffect(() => {
    async function loadSheets() {
      setIsLoading(true)
      try {
        // First try to get sheets directly from the database
        const sheets = await getExpenseSheets()
        console.log('Fetched sheets:', sheets)
        
        if (sheets && sheets.length > 0) {
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
              console.log('Selecting first available sheet instead')
              setSelectedSheet(sheets[0])
            }
          } else if (sheets.length > 0) {
            // If no last sheet but we have sheets, select the first one
            console.log('No last sheet found, selecting first sheet')
            setSelectedSheet(sheets[0])
          }
        } else {
          console.warn('No sheets found from initial load')
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
  }, [refreshTrigger]) // Only depend on refresh trigger
  
  // Handle refresh button click
  const handleRefreshSheets = async () => {
    // Show loading state
    setIsLoading(true);
    
    // Clear localStorage cache to force a reload from database
    if (typeof window !== 'undefined') {
      try {
        // Only remove expense tracker related items
        console.log('Clearing expense tracker data from localStorage to force database refresh');
        const keysToRemove: string[] = [];
        
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('expense-tracker-') && 
              !key.includes('user-') && 
              !key.includes('settings-') &&
              !key.includes('theme-')) {
            keysToRemove.push(key);
          }
        });
        
        // Remove all the cached items
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
          console.log(`Removed cached item: ${key}`);
        });
        
        console.log(`Cleared ${keysToRemove.length} cached items`);
      } catch (e) {
        console.error('Error clearing localStorage:', e);
      }
    }
    
    try {
      // Directly fetch sheets from backend API, bypassing any local cache
      const sheets = await getExpenseSheets();
      if (sheets && sheets.length > 0) {
        console.log(`Successfully refreshed ${sheets.length} sheets from backend API`);
        // Convert to ExpenseSheet format and update state directly
        const refreshedSheets: ExpenseSheet[] = sheets.map((sheet: any) => ({
          id: sheet.id,
          name: sheet.name,
          pin: sheet.pin,
          has_pin: sheet.has_pin,
          created_at: sheet.created_at,
          user_id: sheet.user_id
        }));
        setAvailableSheets(refreshedSheets);
        // Restore sheets to localStorage for offline access
        sheets.forEach((sheet: any) => {
          try {
            localStorage.setItem(`expense-tracker-sheet-${sheet.id}`, JSON.stringify({
              id: sheet.id,
              name: sheet.name,
              pin: sheet.pin || null,
              hasPin: sheet.has_pin,
              created: sheet.created_at,
              user_id: sheet.user_id
            }));
          } catch (e) {
            console.warn(`Failed to sync sheet ${sheet.id} to localStorage:`, e);
          }
        });
        toast({
          title: "Refresh successful",
          description: `Retrieved ${sheets.length} sheets from the backend API.`,
        });
        // Check if there's a last used sheet
        const lastSheetId = getLastAccessedSheet();
        if (lastSheetId) {
          const lastSheet = refreshedSheets.find(s => s.id === lastSheetId);
          if (lastSheet) {
            setSelectedSheet(lastSheet);
          } else if (refreshedSheets.length > 0) {
            setSelectedSheet(refreshedSheets[0]);
          }
        } else if (refreshedSheets.length > 0) {
          setSelectedSheet(refreshedSheets[0]);
        }
      } else {
        toast({
          title: "No sheets found",
          description: "No expense sheets were found in the backend API.",
        });
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {
      console.error('Exception during refresh:', error);
      toast({
        title: "Refresh error",
        description: "An unexpected error occurred during refresh.",
        variant: "destructive",
      });
      setRefreshTrigger(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  }
  
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
  
  // Handle showing the edit sheet name dialog
  const handleOpenEditSheet = (e: React.MouseEvent<HTMLDivElement>, sheet: ExpenseSheet) => {
    e.stopPropagation(); // Prevent sheet selection when clicking the edit button
    setSheetToEdit(sheet);
    setEditedSheetName(sheet.name);
    setEditNameDialogOpen(true);
  }
  
  // Handle saving the edited sheet name
  const handleSaveSheetName = async () => {
    if (!sheetToEdit) return;
    
    if (!editedSheetName.trim()) {
      toast({
        title: "Invalid name",
        description: "Please enter a valid name for your sheet",
        variant: "destructive",
      });
      return;
    }

    try {
      const success = await updateSheetName(sheetToEdit.id, editedSheetName.trim());
      
      if (success) {
        toast({
          title: "Sheet renamed",
          description: `Sheet name updated to "${editedSheetName}"`,
        });
        
        // Update the sheets list locally to reflect the name change
        setAvailableSheets(prev => 
          prev.map(s => s.id === sheetToEdit.id ? { ...s, name: editedSheetName } : s)
        );
        
        // If this is the selected sheet, update that too
        if (selectedSheet?.id === sheetToEdit.id) {
          setSelectedSheet({ ...selectedSheet, name: editedSheetName });
        }
        
        // Close the dialog
        setEditNameDialogOpen(false);
        setSheetToEdit(null);
      } else {
        toast({
          title: "Error",
          description: "Failed to rename sheet. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating sheet name:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while renaming the sheet.",
        variant: "destructive",
      });
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
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRefreshSheets}>
                <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"/>
                </svg>
                Refresh
              </Button>
              <Button onClick={() => setNewSheetDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Sheet
              </Button>
            </div>
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
                    <div className="flex items-center space-x-2">
                      {sheet.has_pin ? (
                        <div title="PIN protected">
                          <LockIcon className="h-4 w-4 text-amber-500" />
                        </div>
                      ) : (
                        <div title="No PIN protection">
                          <UnlockIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => handleOpenEditSheet(e, sheet)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Name
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
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
      
      {/* Dialog for editing sheet name */}
      <Dialog open={editNameDialogOpen} onOpenChange={setEditNameDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Sheet Name</DialogTitle>
            <DialogDescription>
              Update the name of your expense sheet.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="edit-name" className="text-right">
                Name
              </label>
              <Input
                id="edit-name"
                className="col-span-3"
                placeholder="Enter new sheet name"
                value={editedSheetName}
                onChange={(e) => setEditedSheetName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveSheetName()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditNameDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleSaveSheetName}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}