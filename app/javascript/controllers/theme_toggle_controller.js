import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["sunIcon", "moonIcon"]

  connect() {
    // Initialize theme from localStorage or system preference
    this.initializeTheme()
    this.updateIcons()
  }

  initializeTheme() {
    const savedTheme = localStorage.getItem('theme')
    
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      // Use system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark')
      }
    }
  }

  toggle() {
    const isDark = document.documentElement.classList.toggle('dark')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
    this.updateIcons()
  }

  updateIcons() {
    const isDark = document.documentElement.classList.contains('dark')
    
    if (this.hasSunIconTarget && this.hasMoonIconTarget) {
      if (isDark) {
        this.sunIconTarget.classList.remove('hidden')
        this.moonIconTarget.classList.add('hidden')
      } else {
        this.sunIconTarget.classList.add('hidden')
        this.moonIconTarget.classList.remove('hidden')
      }
    }
  }
}
