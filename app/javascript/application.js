// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo-rails"
import "controllers"

// Initialize dark mode from localStorage or system preference
const initializeTheme = () => {
  const savedTheme = localStorage.getItem('theme')
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  
  if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

// Run on initial load and after Turbo navigations
document.addEventListener('turbo:load', initializeTheme)
document.addEventListener('DOMContentLoaded', initializeTheme)
