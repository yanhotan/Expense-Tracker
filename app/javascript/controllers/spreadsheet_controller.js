import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["monthSelect", "yearSelect"]
  static values = { sheetId: String, month: String }

  changeMonth() {
    const month = this.monthSelectTarget.value.padStart(2, '0')
    const year = this.yearSelectTarget.value
    const newMonth = `${year}-${month}`
    
    // Navigate to the new month
    window.location.href = `/sheets/${this.sheetIdValue}?month=${newMonth}`
  }

  openCategoryModal() {
    const name = prompt('Enter new category name:')
    if (name && name.trim()) {
      this.createCategory(name.trim())
    }
  }

  async createCategory(name) {
    try {
      const response = await fetch(`/api/v1/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sheetId: this.sheetIdValue,
          category: name
        })
      })

      if (response.ok) {
        window.location.reload()
      } else {
        const data = await response.json()
        alert(data.message || 'Failed to create category')
      }
    } catch (error) {
      console.error('Error creating category:', error)
      alert('Failed to create category')
    }
  }

  editCategory(event) {
    const categoryId = event.currentTarget.dataset.categoryId
    const categoryName = event.currentTarget.dataset.categoryName
    
    const newName = prompt('Enter new category name:', categoryName)
    if (newName && newName.trim() && newName !== categoryName) {
      this.updateCategory(categoryId, categoryName, newName.trim())
    }
  }

  async updateCategory(categoryId, oldName, newName) {
    try {
      const response = await fetch(`/api/v1/categories`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sheetId: this.sheetIdValue,
          oldName: oldName,
          newName: newName
        })
      })

      if (response.ok) {
        window.location.reload()
      } else {
        const data = await response.json()
        alert(data.message || 'Failed to update category')
      }
    } catch (error) {
      console.error('Error updating category:', error)
      alert('Failed to update category')
    }
  }

  deleteCategory(event) {
    const categoryId = event.currentTarget.dataset.categoryId
    
    if (confirm('Are you sure you want to delete this category? Expenses will be moved to "uncategorized".')) {
      this.removeCategory(categoryId)
    }
  }

  async removeCategory(categoryId) {
    try {
      const response = await fetch(`/api/v1/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sheetId: this.sheetIdValue
        })
      })

      if (response.ok) {
        window.location.reload()
      } else {
        const data = await response.json()
        alert(data.message || 'Failed to delete category')
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Failed to delete category')
    }
  }
}
