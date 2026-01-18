import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["container"]

  connect() {
    // Prevent body scroll when modal is open
    document.body.classList.add('overflow-hidden')
  }

  disconnect() {
    document.body.classList.remove('overflow-hidden')
  }

  close() {
    // Navigate back or to root
    const frame = this.element.closest('turbo-frame')
    if (frame) {
      frame.src = ''
      frame.innerHTML = ''
    }
    document.body.classList.remove('overflow-hidden')
  }

  closeBackground(event) {
    if (event.target === this.element) {
      this.close()
    }
  }

  stopPropagation(event) {
    event.stopPropagation()
  }
}
