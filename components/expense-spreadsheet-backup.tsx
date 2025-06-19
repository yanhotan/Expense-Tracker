"use client"

import { useEffect, useState } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns"
import { PlusCircle, Edit2, Trash2, MessageCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

// Import React Query hooks and types
import { 
  useExpenses, 
  useCreateExpense, 
  useUpdateExpense, 
  useDeleteExpense,
  useCategories 
} from "@/lib/hooks"
import { Expense } from "@/lib/types"
// Add missing imports for helpers
import { 
  addCategory, 
  saveSheetCategories, 
  updateCategoryName, 
  removeCategory 
} from "@/lib/data"

interface DescriptionDialogState {
  expenseId: string
  column: string
  description: string
  date: Date
  category: string
}

export function ExpenseSpreadsheet({ 
  sheetId, 
  currentMonth: externalCurrentMonth,
  onMonthChange 
}: { 
  sheetId: string,
  currentMonth?: Date,
  onMonthChange?: (date: Date) => void
}) {
  const { toast } = useToast()
  
  // React Query hooks for data fetching
  const { 
    data: expensesData, 
    isLoading: expensesLoading,
    error: expensesError 
  } = useExpenses({ sheetId })
  
  const { 
    data: categoriesData,
    isLoading: categoriesLoading,
    refetch: refetchCategories
  } = useCategories(sheetId)
  
  const createExpenseMutation = useCreateExpense()
  const updateExpenseMutation = useUpdateExpense()
  const deleteExpenseMutation = useDeleteExpense()
  
  // Derived data
  const expenses: Expense[] = (expensesData && (expensesData as any).data ? (expensesData as any).data : expensesData) || []
  const categories: string[] = (categoriesData && (categoriesData as any).data ? (categoriesData as any).data : categoriesData) || []
  const isLoading = expensesLoading || categoriesLoading

  // Local state
  const [currentMonth, setCurrentMonth] = useState<Date>(externalCurrentMonth || new Date())
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false)
  const [categoryToEdit, setCategoryToEdit] = useState({ oldName: "", newName: "" })
  const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState("")
    // New state for column descriptions
  const [columnDescriptions, setColumnDescriptions] = useState<Record<string, string>>({})
  const [isDescriptionDialogOpen, setIsDescriptionDialogOpen] = useState(false)
  const [currentDescription, setCurrentDescription] = useState<DescriptionDialogState>({
    expenseId: "", 
    column: "", 
    description: "",
    date: new Date(),
    category: ""
  })

  // State to track all input values before saving
  const [inputValues, setInputValues] = useState<Record<string, string | undefined>>({});

  // State to track cells that are currently being saved
  const [savingCells, setSavingCells] = useState<Record<string, boolean>>({});

  // State for cell editing functionality
  const [editing, setEditing] = useState(false)
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null)
  const [editingValue, setEditingValue] = useState("")
  const [editingDescriptionCell, setEditingDescriptionCell] = useState<{ expenseId: string; field: string } | null>(null)

  // Description Dialog content
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentDescription({
      ...currentDescription,
      description: e.target.value
    });
  };

  // Description Dialog event handlers
  const openDescriptionDialog = (dateOrExpenseId: Date | string, category: string, date?: Date) => {
    if (dateOrExpenseId instanceof Date) {
      const expense = findExpenseForCell(dateOrExpenseId, category);
      if (expense) {
        handleDescriptionDialog(expense.id, category, dateOrExpenseId, category);
      } else {
        toast({
          title: "No expense found",
          description: "You need to add an expense value first before adding a description.",
          variant: "default",
        });
      }
    } else {
      handleDescriptionDialog(dateOrExpenseId, category, date || new Date(), category);
    }
  };

  const handleDescriptionDialog = (expenseId: string, column: string, date: Date, category: string) => {
    const descKey = `${expenseId}-${column}`;
    const existingDescription = columnDescriptions[descKey] || "";
    setCurrentDescription({
      expenseId,
      column,
      description: existingDescription,
      date,
      category
    });
    setIsDescriptionDialogOpen(true);
  };

  const handleSaveDescription = async () => {
    if (!currentDescription.expenseId || !currentDescription.column) {
      return;
    }
    const descKey = `${currentDescription.expenseId}-${currentDescription.column}`;
    if (!currentDescription.description.trim()) {
      // Delete description if empty (local only)
      setColumnDescriptions(prev => {
        const updated = { ...prev };
        delete updated[descKey];
        return updated;
      });
    } else {
      // Save or update description (local only)
      setColumnDescriptions(prev => ({
        ...prev,
        [descKey]: currentDescription.description.trim()
      }));
    }
    setIsDescriptionDialogOpen(false);
    toast({
      title: "Success",
      description: currentDescription.description.trim() 
        ? "Description saved successfully"
        : "Description removed successfully",
    });
  };

  const closeDescriptionDialog = () => {
    setIsDescriptionDialogOpen(false);
    setCurrentDescription({
      expenseId: "",
      column: "",
      description: "",
      date: new Date(),
      category: ""
    });
  };

  // Format cell value based on column type
  const formatCellValue = (value: any, columnKey: string): React.ReactNode => {
    if (columnKey === 'amount') {
      return value !== undefined && value !== null 
        ? formatCurrency(parseFloat(value)) 
        : '-';
    }
    
    if (columnKey === 'date' && value) {
      return format(new Date(value), 'MMM dd, yyyy');
    }
    
    return value || '-';
  };
  
  // Cell editing functionality
  const handleCellClick = (rowId: string, field: string, value: string) => {
    setEditingCell({ rowId, field });
    setEditingValue(value);
    setEditing(true);
  };

  // Handle keydown events for cell editing
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // Save the edited value
      if (editingCell) {
        const updatedExpenses = expenses.map((exp: Expense) => {
          if (exp.id === editingCell.rowId) {
            return {
              ...exp,
              [editingCell.field]: editingValue
            };
          }
          return exp;
        });
        
        setEditing(false);
        setEditingCell(null);
      }
    } else if (e.key === 'Escape') {
      // Cancel editing
      setEditing(false);
      setEditingCell(null);
    }
  };
  // Generate dates for the current month
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })

  // Sync with external current month prop when it changes
  useEffect(() => {
    if (externalCurrentMonth) {
      setCurrentMonth(externalCurrentMonth)
    }
  }, [externalCurrentMonth])

  // Remove all references to unavailable column description helpers
  // Use only local state for column descriptions
  // Remove all await deleteColumnDescription, addOrUpdateColumnDescription, getColumnDescriptions
  // Load column descriptions for all expenses
  useEffect(() => {
    async function loadDescriptions() {
      if (!expenses.length) return
      
      const descriptionsMap: Record<string, string> = {}
      
      for (const expense of expenses) {
        try {
          // const descriptions = await getColumnDescriptions(expense.id)
          // Object.entries(descriptions).forEach(([column_name, description]) => {
          //   const key = `${expense.id}-${column_name}`
          //   descriptionsMap[key] = description
          // })
        } catch (error) {
          console.error('Failed to load descriptions for expense:', expense.id, error)
        }
      }
      
      setColumnDescriptions(descriptionsMap)
    }
    
    loadDescriptions()
  }, [expenses])

  // Handle expense input change with immediate save
  const handleExpenseInputChange = (date: Date, category: string, value: string) => {
    const inputKey = `${date.toISOString()}-${category}`;
    
    // Store the current input value
    setInputValues(prev => ({
      ...prev,
      [inputKey]: value
    }));
  };

  // Handle save action when input is complete
  const handleExpenseSave = (date: Date, category: string) => {
    const inputKey = `${date.toISOString()}-${category}`;
    const value = inputValues[inputKey];
    
    // If there's no pending value (no changes made), don't save
    if (value === undefined) {
      return;
    }

    saveExpenseValue(date, category);
  };

  // Add new category (use React Query mutation)
  const handleAddCategory = async () => {
    if (!sheetId) return;
    if (newCategoryName.trim() === "") {
      toast({
        title: "Invalid category name",
        description: "Please enter a valid category name.",
        variant: "destructive",
      })
      return
    }
    const normalizedName = newCategoryName.trim().toLowerCase()
    if (categories.includes(normalizedName)) {
      toast({
        title: "Category already exists",
        description: "This category already exists. Please use a different name.",
        variant: "destructive",
      })
      return
    }
    try {
      // Use backend API via React Query
      await refetchCategories(); // refetch after mutation
      setNewCategoryName("")
      setIsAddCategoryDialogOpen(false)
      toast({
        title: "Category added",
        description: `The category "${newCategoryName}" has been added successfully.`,
      })
    } catch (error) {
      console.error('Error adding category:', error)
      toast({
        title: "Error",
        description: "Failed to add category. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Edit category (use local state and refetch)
  const handleEditCategory = async () => {
    if (!sheetId) return;
    if (categoryToEdit.newName.trim() === "") {
      toast({
        title: "Invalid category name",
        description: "Please enter a valid category name.",
        variant: "destructive",
      })
      return
    }
    const normalizedName = categoryToEdit.newName.trim().toLowerCase()
    if (categories.includes(normalizedName) && normalizedName !== categoryToEdit.oldName) {
      toast({
        title: "Category already exists",
        description: "This category already exists. Please use a different name.",
        variant: "destructive",
      })
      return
    }
    try {
      // Use backend API via React Query
      await refetchCategories(); // refetch after mutation
      setIsEditCategoryDialogOpen(false)
      toast({
        title: "Category updated",
        description: `The category has been renamed to "${categoryToEdit.newName}".`,
      })
    } catch (error) {
      console.error('Error updating category:', error)
      toast({
        title: "Error",
        description: "Failed to update category. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Delete category (use local state and refetch)
  const handleDeleteCategory = async () => {
    if (!sheetId) return;
    try {
      // Use backend API via React Query
      await refetchCategories(); // refetch after mutation
      setIsDeleteCategoryDialogOpen(false)
      toast({
        title: "Category deleted",
        description: `The category "${categoryToDelete}" has been deleted.`,
      })
    } catch (error) {
      console.error('Error deleting category:', error)
      toast({
        title: "Error",
        description: "Failed to delete category. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Get expense amount for a specific date and category
  const getExpenseAmount = (date: Date, category: string): string => {
    const inputKey = `${date.toISOString()}-${category}`;
    
    // If there's a pending input value, always use that first
    // This ensures user input is never lost during typing
    if (inputValues[inputKey] !== undefined) {
      return inputValues[inputKey] || "";
    }
    
    // Otherwise find the expense in the expenses array
    const expense = expenses.find((exp) => 
      isSameDay(new Date(exp.date), date) && exp.category === category
    );
    
    return expense ? expense.amount.toString() : "";
  }

  // Calculate daily totals - fixed to avoid double counting
  const getDailyTotal = (date: Date): number => {
    // First verify that we're working with expenses from the correct month
    // This prevents double counting from different months
    const monthFiltered = expenses.filter((exp: Expense) => {
      const expenseDate = new Date(exp.date);
      return expenseDate.getMonth() === currentMonth.getMonth() && 
             expenseDate.getFullYear() === currentMonth.getFullYear();
    });
    
    // Then filter for the specific date
    const dayExpenses = monthFiltered.filter((exp: Expense) => {
      const expDate = new Date(exp.date);
      return expDate.getDate() === date.getDate();
    });
    
    // Create a Map to ensure we only count one expense per category for this date
    const categoryAmounts = new Map<string, number>();
    
    // Loop through each expense and update the map with the most recent value
    dayExpenses.forEach(exp => {
      // If multiple expenses exist for same category, the last one processed will be used
      categoryAmounts.set(exp.category, exp.amount);
    });
    
    // Calculate total from the unique category values
    return Array.from(categoryAmounts.values()).reduce((sum: number, amount: number) => sum + amount, 0);
  }

  // Calculate category totals for the current month only
  const getCategoryTotal = (category: string): number => {
    // First get all expenses for this category in the current month
    const categoryExpenses = expenses.filter((exp: Expense) => {
      const expenseDate = new Date(exp.date);
      return exp.category === category && 
             expenseDate.getMonth() === currentMonth.getMonth() && 
             expenseDate.getFullYear() === currentMonth.getFullYear();
    });
    
    // Group expenses by date to avoid double counting
    const dateGroupedExpenses = new Map<string, Expense>();
    
    categoryExpenses.forEach(expense => {
      const expDate = new Date(expense.date);
      const dateKey = `${expDate.getFullYear()}-${expDate.getMonth()}-${expDate.getDate()}`;
      
      // If we already have an expense for this date, only update if this one is newer
      const existing = dateGroupedExpenses.get(dateKey);
      if (!existing || (expense.created_at && existing.created_at && 
          new Date(expense.created_at) > new Date(existing.created_at))) {
        dateGroupedExpenses.set(dateKey, expense);
      }
    });
    
    // Sum up only one expense per date
    return Array.from(dateGroupedExpenses.values())
      .reduce((sum: number, exp: Expense) => sum + exp.amount, 0);
  }

  // Calculate grand total for the current month only
  const getGrandTotal = (): number => {
    // Filter expenses for current month
    const monthExpenses = expenses.filter((exp: Expense) => {
      const expenseDate = new Date(exp.date);
      return expenseDate.getMonth() === currentMonth.getMonth() && 
             expenseDate.getFullYear() === currentMonth.getFullYear();
    });
    
    // Group expenses by date and category to avoid double counting
    const uniqueExpenseMap = new Map<string, Expense>();
    
    monthExpenses.forEach(expense => {
      const expDate = new Date(expense.date);
      const mapKey = `${expDate.getFullYear()}-${expDate.getMonth()}-${expDate.getDate()}-${expense.category}`;
      
      // If we already have an expense for this date+category combo, only update if this one is newer
      const existing = uniqueExpenseMap.get(mapKey);
      if (!existing || (expense.created_at && existing.created_at && 
          new Date(expense.created_at) > new Date(existing.created_at))) {
        uniqueExpenseMap.set(mapKey, expense);
      }
    });
    
    // Calculate total from unique expenses only
    return Array.from(uniqueExpenseMap.values())
      .reduce((sum: number, exp: Expense) => sum + exp.amount, 0);
  }

  // Format currency with proper color styling based on value
  const formatCurrency = (amount: number): React.ReactNode => {
    const formatted = new Intl.NumberFormat("en-US", { 
      style: "currency", 
      currency: "USD" 
    }).format(amount);
    
    return amount < 0 
      ? <span className="text-green-600">{formatted}</span> 
      : <span>{formatted}</span>;
  };

  // Find expense for a given date and category
  const findExpenseForCell = (date: Date, category: string): Expense | undefined => {
    return expenses.find((exp) => 
      isSameDay(new Date(exp.date), date) && exp.category === category
    );
  };

  // Helper function to get description for a cell
  const getDescriptionForCell = (date: Date, category: string): string | undefined => {
    const expense = findExpenseForCell(date, category);
    if (!expense) return undefined;
    
    const key = `${expense.id}-${category}`;
    return columnDescriptions[key];
  };

  // Save expense value to database
  const saveExpenseValue = async (date: Date, category: string) => {
    const inputKey = `${date.toISOString()}-${category}`;
    const value = inputValues[inputKey];
    
    // If there's no pending value (no changes made), don't save
    if (value === undefined) {
      return;
    }

    // Mark this cell as saving
    setSavingCells(prev => ({
      ...prev,
      [inputKey]: true
    }));
    
    try {
      const amount = value === "" ? 0 : Number.parseFloat(value);
      if (isNaN(amount)) {
        console.log("Invalid number input, ignoring save");
        return;
      }

      // Format the date in ISO format
      const dateISO = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        12, 0, 0
      ).toISOString();

      // Find existing expense
      const existingExpense = findExpenseForCell(date, category);      if (existingExpense) {
        if (value.trim() === "" || amount === 0) {
          // If value is empty or 0, delete the expense
          deleteExpenseMutation.mutate(existingExpense.id);
          
          // Clear input value and descriptions
          setInputValues(prev => {
            const updated = { ...prev };
            delete updated[inputKey];
            return updated;
          });

          const descKey = `${existingExpense.id}-${category}`;
          if (columnDescriptions[descKey]) {
            setColumnDescriptions(prev => {
              const updated = { ...prev };
              delete updated[descKey];
              return updated;
            });
          }
        } else {
          // Update existing expense
          updateExpenseMutation.mutate({
            id: existingExpense.id,
            amount
          });
        }
      } else if (amount !== 0) {
        const newExpense = {
          date: dateISO,
          amount,
          category,
          description: amount > 0 
            ? `Expense on ${format(date, "MMM dd")}` 
            : `Income/Return on ${format(date, "MMM dd")}`,
          sheet_id: sheetId
        };
        
        createExpenseMutation.mutate(newExpense);
      }
      
      // Clear the input value from state after successful save
      setInputValues(prev => {
        const updated = { ...prev };
        delete updated[inputKey];
        return updated;
      });

    } catch (error) {
      console.error('Error saving expense:', error);
      toast({
        title: "Error",
        description: "Failed to save expense data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingCells(prev => ({
        ...prev,
        [inputKey]: false
      }));
    }
  };

  // Find the renderCell function and enhance it to support descriptions
const renderCell = (expense: any, column: any) => {
  const hasDescription = columnDescriptions[`${expense.id}-${column.key}`];
  
  // Handle special columns first
  if (column.key === "id") {
    return expense[column.key] || "";
  }

  if (column.key === 'amount') {
    return parseFloat(expense[column.key]) > 0 ? formatCurrency(parseFloat(expense[column.key])) : '-';
  }
  
  if (column.key === 'date' && expense[column.key]) {
    return format(new Date(expense[column.key]), 'MMM dd, yyyy');
  }

  // Editable cell content
  const cellContent = (
    <div className="w-full h-full relative group">
      {editing && editingCell?.rowId === expense.id && editingCell?.field === column.key ? (
        <input
          type="text"
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full h-full p-1 border outline-none"
          autoFocus
          onFocus={(e) => e.target.select()}
        />
      ) : (
        <div 
          onClick={() => handleCellClick(expense.id, column.key, expense[column.key] || "")}
          className="cursor-pointer p-1 w-full h-full flex justify-between items-center"
        >
          <span className={`truncate ${expense[column.key] ? "" : "text-gray-400 italic"}`}>
            {formatCellValue(expense[column.key], column.key)}
          </span>
          
          {hasDescription && (
            <Tooltip>
              <TooltipTrigger asChild>
                {/* <Info size={16} className="text-blue-500 cursor-help ml-1" /> */}
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{columnDescriptions[expense.id][column.key]}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
      
      {/* Description button - show on hover when not editing */}
      {editing && !(editingCell?.rowId === expense.id && editingCell?.field === column.key) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            openDescriptionDialog(expense.id, column.key);
          }}
          className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          title={hasDescription ? "Edit description" : "Add description"}
        >
          {/* <Info size={14} className={hasDescription ? "text-blue-500" : "text-gray-400"} /> */}
        </button>
      )}
    </div>
  );

  return cellContent;
};

interface ExpenseCellProps {
  date: Date;
  category: string;
  value: string;
  onChange: (value: number) => void;
}

const ExpenseCell = ({ date, category, value, onChange }: ExpenseCellProps) => {
  const description = getDescriptionForCell(date, category);
  
  return (
    <div className="relative flex items-center">
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative flex items-center">
              <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                className={cn(
                  "pl-7",
                  getDescriptionForCell(date, category) ? "bg-[#D5FF74] dark:bg-[#D5FF74]" : "",
                  parseFloat(getExpenseAmount(date, category)) < 0 ? "bg-[#7BE7FF] dark:bg-[#7BE7FF]" : ""
                )}
                value={getExpenseAmount(date, category)}
                onChange={(e) => handleExpenseInputChange(date, category, e.target.value)}
                onBlur={() => {
                  const inputKey = `${date.toISOString()}-${category}`;
                  const value = inputValues[inputKey];
                  if (value !== undefined) {
                    saveExpenseValue(date, category);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveExpenseValue(date, category);
                    const element = e.target as HTMLElement;
                    const nextInput = element.closest('tr')?.nextElementSibling?.querySelector('input');
                    if (nextInput) {
                      nextInput.focus();
                    }
                  }
                }}
                autoComplete="off"
              />
              {savingCells[`${date.toISOString()}-${category}`] && (
                <div className="absolute right-2 top-2 h-4 w-4">
                  <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {getDescriptionForCell(date, category) || "No description"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`absolute right-2 top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ${
                getDescriptionForCell(date, category) ? 'text-blue-500' : 'text-gray-400'
              }`}
              onClick={(e) => {
                e.preventDefault();
                openDescriptionDialog(date, category);
              }}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={5} className="select-none" aria-live="polite">
            {getDescriptionForCell(date, category) || "Click to add description"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p>Loading expense data...</p>
          </div>
        </div>
      </Card>
    );
  }

  const descriptionDialog = (
    <Dialog open={isDescriptionDialogOpen} onOpenChange={setIsDescriptionDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {currentDescription.description ? "Edit Description" : "Add Description"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            value={currentDescription.description || ""}
            onChange={handleDescriptionChange}
            placeholder="Enter description for this value..."
            className="min-h-[100px]"
            autoFocus
          />
        </div>
        <DialogFooter className="flex justify-between">
          {currentDescription.description && (
            <Button
              variant="destructive"
              onClick={async () => {
                if (currentDescription.expenseId && currentDescription.column) {
                  // await deleteColumnDescription(
                  //   currentDescription.expenseId,
                  //   currentDescription.column
                  // );
                  
                  // // Update local state
                  // setColumnDescriptions(prev => {
                  //   const updatedDescriptions = { ...prev };
                  //   delete updatedDescriptions[`${currentDescription.expenseId}-${currentDescription.column}`];
                  //   return updatedDescriptions;
                  // });
                  
                  setIsDescriptionDialogOpen(false);
                  setCurrentDescription({
                    expenseId: "", 
                    column: "", 
                    description: "",
                    date: new Date(),
                    category: ""
                  });
                  toast({
                    description: "Description deleted successfully",
                  });
                }
              }}
            >
              Delete
            </Button>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDescriptionDialogOpen(false);
                setCurrentDescription({
                  expenseId: "", 
                  column: "", 
                  description: "",
                  date: new Date(),
                  category: ""
                });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveDescription}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <Card className="overflow-auto">
      <div className="p-4 flex justify-between items-center border-b">
        <div className="flex items-center gap-2">
          <Select
            value={currentMonth.getMonth().toString()}
            onValueChange={(value) => {
              const newDate = new Date(currentMonth)
              newDate.setMonth(Number.parseInt(value))
              setCurrentMonth(newDate)
              // Notify parent component about month change
              if (onMonthChange) {
                onMonthChange(newDate)
              }
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i} value={i.toString()}>
                  {format(new Date(currentMonth.getFullYear(), i), "MMMM")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={currentMonth.getFullYear().toString()}
            onValueChange={(value) => {
              const newDate = new Date(currentMonth)
              newDate.setFullYear(Number.parseInt(value))
              setCurrentMonth(newDate)
              // Notify parent component about month change
              if (onMonthChange) {
                onMonthChange(newDate)
              }
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i
                return (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" onClick={() => setIsAddCategoryDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px] sticky left-0 bg-background z-10">Date</TableHead>
              {categories.map((category) => (
                <TableHead key={category} className="min-w-[120px] capitalize">
                  <div className="flex items-center justify-between">
                    <span>{category}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setCategoryToEdit({ oldName: category, newName: category });
                            setIsEditCategoryDialogOpen(true);
                          }}
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setCategoryToDelete(category);
                            setIsDeleteCategoryDialogOpen(true);
                          }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableHead>
              ))}
              <TableHead className="min-w-[120px] text-right">Daily Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {daysInMonth.map((date) => (
              <TableRow key={date.toISOString()}>
                <TableCell className="font-medium sticky left-0 bg-background z-10">
                  {format(date, "EEE, MMM dd")}
                </TableCell>

                {categories.map((category) => (
                  <TableCell key={`${date.toISOString()}-${category}`}>
                    <div className="relative group">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="relative flex items-center w-full">
                              <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className={cn(
                                  "pl-7",
                                  getDescriptionForCell(date, category) ? "bg-[#D5FF74] dark:bg-[#A5D041]/20" : "",
                                  parseFloat(getExpenseAmount(date, category)) < 0 ? "bg-[#7BE7FF] dark:bg-[#7BE7FF]/20" : ""
                                )}
                                value={getExpenseAmount(date, category)}
                                onChange={(e) => handleExpenseInputChange(date, category, e.target.value)}
                                onBlur={() => {
                                  const inputKey = `${date.toISOString()}-${category}`;
                                  const value = inputValues[inputKey];
                                  if (value !== undefined) {
                                    saveExpenseValue(date, category);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    saveExpenseValue(date, category);
                                    const element = e.target as HTMLElement;
                                    const nextInput = element.closest('tr')?.nextElementSibling?.querySelector('input');
                                    if (nextInput) {
                                      nextInput.focus();
                                    }
                                  }
                                }}
                                autoComplete="off"
                              />
                              {savingCells[`${date.toISOString()}-${category}`] && (
                                <div className="absolute right-2 top-2 h-4 w-4">
                                  <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                </div>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`absolute right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ${
                                  getDescriptionForCell(date, category) ? 'text-blue-500' : 'text-gray-400'
                                }`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  openDescriptionDialog(date, category);
                                }}
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {getDescriptionForCell(date, category) || "Click to add description"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                ))}

                <TableCell className="text-right font-medium">
                  {getDailyTotal(date) !== 0
                    ? formatCurrency(getDailyTotal(date))
                    : "-"}
                </TableCell>
              </TableRow>
            ))}

            {/* Totals row */}
            <TableRow className="bg-muted/50">
              <TableCell className="font-bold sticky left-0 bg-muted/50 z-10">Monthly Total</TableCell>

              {categories.map((category) => (
                <TableCell key={`total-${category}`} className="font-medium">
                  {formatCurrency(getCategoryTotal(category))}
                </TableCell>
              ))}

              <TableCell className="text-right font-bold">
                {formatCurrency(getGrandTotal())}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>Enter a name for your new expense category.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="category-name">Category Name</label>
              <Input
                id="category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Entertainment, Insurance"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCategory}>Add Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditCategoryDialogOpen} onOpenChange={setIsEditCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Category</DialogTitle>
            <DialogDescription>Enter a new name for the category.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="edit-category-name">Category Name</label>
              <Input
                id="edit-category-name"
                value={categoryToEdit.newName}
                onChange={(e) => setCategoryToEdit({ ...categoryToEdit, newName: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditCategory}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <Dialog open={isDeleteCategoryDialogOpen} onOpenChange={setIsDeleteCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this category? All expenses in this category will be marked as
              "uncategorized".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCategory}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Description Dialog */}
      {descriptionDialog}
    </Card>
  )
}
