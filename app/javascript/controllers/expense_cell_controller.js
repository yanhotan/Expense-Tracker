import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["input"]
  static values = { 
    expenseId: String, 
    date: String, 
    category: String, 
    sheetId: String 
  }

  connect() {
    this.originalValue = this.inputTarget.value
    this.saving = false
  }

  async save(event) {
    // Prevent multiple concurrent saves
    if (this.saving) return
    
    // For keydown events, only save on Enter key
    if (event.type === 'keydown' && event.key !== 'Enter') return
    if (event.type === 'keydown') event.preventDefault()
    
    const newValue = this.inputTarget.value.trim()
    
    // Don't save if value hasn't changed
    if (newValue === this.originalValue) {
      return
    }

    const amount = newValue === '' ? 0 : parseFloat(newValue)
    
    // Validate the amount
    if (isNaN(amount)) {
      this.inputTarget.value = this.originalValue
      return
    }

    // If amount is 0 and we have an existing expense, delete it
    if (amount === 0 && this.hasExpenseIdValue && this.expenseIdValue) {
      await this.deleteExpense()
      return
    }

    // If amount is 0 and no existing expense, just clear the input
    if (amount === 0) {
      this.inputTarget.value = ''
      this.originalValue = ''
      return
    }

    // Save the expense
    await this.saveExpense(amount)
  }

  async saveExpense(amount) {
    this.saving = true
    const form = this.element
    
    try {
      // Show loading state
      this.inputTarget.classList.add('opacity-50', 'bg-yellow-100', 'dark:bg-yellow-900/20')
      
      const formData = new FormData(form)
      formData.set('expense[amount]', amount)
      
      const response = await fetch(form.action, {
        method: form.method,
        body: formData,
        headers: {
          'Accept': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content
        }
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update the original value
        this.originalValue = amount.toString()
        this.inputTarget.value = amount.toString()
        
        // Update the expense ID for future updates
        if (data.data?.id) {
          this.expenseIdValue = data.data.id
          // Update the form action for future edits
          form.action = `/expenses/${data.data.id}`
          form.method = 'patch'
        }
        
        // Show success state briefly
        this.inputTarget.classList.remove('opacity-50', 'bg-yellow-100', 'dark:bg-yellow-900/20')
        this.inputTarget.classList.add('bg-emerald-100', 'dark:bg-emerald-900/20')
        
        setTimeout(() => {
          this.inputTarget.classList.remove('bg-emerald-100', 'dark:bg-emerald-900/20')
        }, 500)
        
        // Update totals on the page
        this.updateTotals()
        
      } else {
        const errorData = await response.json()
        console.error('Save failed:', errorData)
        // Revert to original value
        this.inputTarget.value = this.originalValue
        this.showError()
      }
    } catch (error) {
      console.error('Error saving expense:', error)
      this.inputTarget.value = this.originalValue
      this.showError()
    } finally {
      this.inputTarget.classList.remove('opacity-50', 'bg-yellow-100', 'dark:bg-yellow-900/20')
      this.saving = false
    }
  }

  async deleteExpense() {
    if (!this.expenseIdValue) return
    
    this.saving = true

    try {
      this.inputTarget.classList.add('opacity-50')
      
      const response = await fetch(`/expenses/${this.expenseIdValue}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content
        }
      })

      if (response.ok) {
        this.originalValue = ''
        this.inputTarget.value = ''
        this.expenseIdValue = ''
        
        // Reset form action for creating new expense
        const sheetId = this.sheetIdValue || this.element.closest('[data-spreadsheet-sheet-id-value]')?.dataset?.spreadsheetSheetIdValue
        if (sheetId) {
          this.element.action = `/sheets/${sheetId}/expenses`
          this.element.method = 'post'
        }
        
        // Update totals
        this.updateTotals()
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
    } finally {
      this.inputTarget.classList.remove('opacity-50')
      this.saving = false
    }
  }

  showError() {
    this.inputTarget.classList.add('bg-red-100', 'dark:bg-red-900/20', 'border-red-500')
    setTimeout(() => {
      this.inputTarget.classList.remove('bg-red-100', 'dark:bg-red-900/20', 'border-red-500')
    }, 2000)
  }

  updateTotals() {
    // Find all expense inputs in the same row for daily total
    const row = this.inputTarget.closest('tr')
    if (row) {
      const inputs = row.querySelectorAll('[data-expense-cell-target="input"]')
      let dailyTotal = 0
      
      inputs.forEach(input => {
        const value = parseFloat(input.value) || 0
        dailyTotal += value
      })
      
      // Update daily total cell
      const dailyTotalCell = row.querySelector('td:last-child')
      if (dailyTotalCell) {
        dailyTotalCell.textContent = dailyTotal > 0 ? this.formatCurrency(dailyTotal) : '-'
      }
    }
    
    // Update category totals in the footer row
    this.updateCategoryTotals()
    
    // Update grand total
    this.updateGrandTotal()
  }

  updateCategoryTotals() {
    const table = this.inputTarget.closest('table')
    if (!table) return
    
    const footerRow = table.querySelector('tbody tr:last-child')
    if (!footerRow) return
    
    // Get column index for this input
    const cell = this.inputTarget.closest('td')
    const cellIndex = Array.from(cell.parentElement.children).indexOf(cell)
    
    // Sum all values in this column
    let categoryTotal = 0
    const rows = table.querySelectorAll('tbody tr:not(:last-child)')
    
    rows.forEach(row => {
      const columnCell = row.children[cellIndex]
      if (columnCell) {
        const input = columnCell.querySelector('[data-expense-cell-target="input"]')
        if (input) {
          categoryTotal += parseFloat(input.value) || 0
        }
      }
    })
    
    // Update the footer cell for this category
    const footerCell = footerRow.children[cellIndex]
    if (footerCell) {
      footerCell.textContent = this.formatCurrency(categoryTotal)
    }
  }

  updateGrandTotal() {
    const table = this.inputTarget.closest('table')
    if (!table) return
    
    let grandTotal = 0
    const inputs = table.querySelectorAll('[data-expense-cell-target="input"]')
    
    inputs.forEach(input => {
      grandTotal += parseFloat(input.value) || 0
    })
    
    // Update grand total cell (last cell in footer row)
    const footerRow = table.querySelector('tbody tr:last-child')
    if (footerRow) {
      const lastCell = footerRow.querySelector('td:last-child')
      if (lastCell) {
        lastCell.textContent = this.formatCurrency(grandTotal)
      }
    }
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }
}
