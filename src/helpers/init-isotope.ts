'use client'

export const initIsotope = () => {
  if (typeof window === 'undefined') return

  // Simple filter implementation
  const filters = document.querySelectorAll('.portfolioFilte a')
  const items = document.querySelectorAll('.portfolioContainer .picture-item')

  filters.forEach((filter) => {
    filter.addEventListener('click', function (e) {
      e.preventDefault()

      // Remove active class from all filters
      filters.forEach((f) => f.classList.remove('active'))
      // Add active class to clicked filter
      ;(e.target as HTMLElement).classList.add('active')

      // Get filter value
      const filterValue = (e.target as HTMLElement).getAttribute('data-filter')

      // Show/hide items
      items.forEach((item) => {
        if (filterValue === '*') {
          ;(item as HTMLElement).style.display = 'block'
        } else {
          const className = filterValue?.replace('.', '')
          if (item.classList.contains(className || '')) {
            ;(item as HTMLElement).style.display = 'block'
          } else {
            ;(item as HTMLElement).style.display = 'none'
          }
        }
      })
    })
  })
}
