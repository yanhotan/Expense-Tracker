"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { v4 as uuidv4 } from 'uuid'

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { addExpense, getCategories } from "@/lib/data"
import { getLastAccessedSheet } from "@/lib/sheets"

// Separate component that uses useSearchParams
function ExpenseFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [date, setDate] = useState<Date>(new Date())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const categories = getCategories()
  const [sheetId, setSheetId] = useState<string | null>(null)
  
  // Get sheetId from URL params or last accessed sheet
  useEffect(() => {
    const urlSheetId = searchParams.get('sheetId');
    
    if (urlSheetId) {
      setSheetId(urlSheetId);
    } else {
      // If no sheet ID in URL, try to get last accessed sheet
      const lastSheet = getLastAccessedSheet();
      setSheetId(lastSheet);
      
      // If no last sheet found, redirect to sheet selector
      if (!lastSheet) {
        toast({
          title: "No sheet selected",
          description: "Please select an expense sheet first.",
          variant: "destructive",
        });
        router.push("/"); // Redirect to home/sheet selector
      }
    }
  }, [searchParams, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)

    // Check if we have a valid sheet ID
    if (!sheetId) {
      toast({
        title: "No sheet selected",
        description: "Please select an expense sheet first.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      router.push("/"); // Redirect to home/sheet selector
      return;
    }

    const formData = new FormData(event.currentTarget)
    const amount = Number.parseFloat(formData.get("amount") as string)
    const category = formData.get("category") as string
    const description = formData.get("description") as string

    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than zero.",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    try {
      await addExpense({
        id: uuidv4(),
        date: date.toISOString(),
        amount,
        category,
        description,
        sheet_id: sheetId,
      }, sheetId);

      toast({
        title: "Expense added",
        description: "Your expense has been recorded successfully.",
      })

      router.push("/expenses")
      router.refresh()
    } catch (error) {
      console.error('Error adding expense:', error)
      toast({
        title: "Error",
        description: "Failed to add expense. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5">$</span>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className="pl-7"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select name="category" required defaultValue={categories[0]}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={date} onSelect={(date) => date && setDate(date)} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Enter expense details"
              className="min-h-[80px]"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Expense"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// Main component with Suspense boundary
export function ExpenseForm() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading expense form...</div>}>
      <ExpenseFormContent />
    </Suspense>
  )
}
