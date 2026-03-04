import type { Theme } from '../shared/types'

export function applyThemeClass(theme: Theme) {
  removeThemeClasses()
  if (theme === 'dark') document.body.classList.add('digikabu-dark')
  if (theme === 'dark-blue') document.body.classList.add('digikabu-dark-blue')
}

export function removeThemeClasses() {
  document.body.classList.remove('digikabu-dark', 'digikabu-dark-blue')
}

export function createAmbientParticles() {
  if (document.getElementById('__digikabu-ambient')) return

  const container = document.createElement('div')
  container.id = '__digikabu-ambient'
  container.className = 'digikabu-ambient-container'

  for (let i = 1; i <= 6; i++) {
    const p = document.createElement('div')
    p.className = `digikabu-particle digikabu-particle-${i}`
    container.appendChild(p)
  }

  document.body.appendChild(container)
}

export function enhanceTermineTable() {
  const tables = document.querySelectorAll<HTMLTableElement>(
    'table.table-striped, .table.table-striped'
  )
  if (!tables.length) return

  const today = new Date()
  const dd = String(today.getDate()).padStart(2, '0')
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const todayStr = dd + '.' + mm + '.' + today.getFullYear()

  tables.forEach((table) => {
    table.style.position = 'relative'

    const rows = table.querySelectorAll<HTMLTableRowElement>('tbody tr')
    rows.forEach((row) => {
      const cells = row.querySelectorAll('td')
      if (cells.length < 2) return

      const dayCell = cells[0]
      const dateCell = cells[1]
      const descCell = cells[2] || null

      // Strip inline color → replace with data attribute for CSS targeting
      if (dayCell.style.color) {
        dayCell.dataset.dkColor = dayCell.style.color === 'red' ? 'red' : 'blue'
        dayCell.style.removeProperty('color')
      }

      if (dateCell.style.color) {
        dateCell.dataset.dkColor = dateCell.style.color === 'red' ? 'red' : 'blue'
        dateCell.style.removeProperty('color')
      }

      // Remove stale inline styles from description column
      if (descCell) {
        descCell.style.removeProperty('color')
        descCell.style.removeProperty('background')
        descCell.style.removeProperty('background-color')
      }

      // Mark today's rows
      const dateTxt = (dateCell.textContent || '').trim()
      if (dateTxt.startsWith(todayStr)) {
        row.classList.add('dk-today')
      }
    })
  })
  console.log('[Digikabu] Termine table enhanced')
}

export function enhanceSVGTimetable() {
  const svgs = document.querySelectorAll<SVGSVGElement>('svg[style*="background-color"]')
  svgs.forEach((svg) => {
    svg.style.removeProperty('background-color')
    svg.style.background = 'transparent'
  })

  // Fix the time-label SVG: it has height=630 but first content starts at y=30.
  // Setting viewBox="0 30 40 600" crops the empty 30px and maps the remaining
  // 600px of content to the display area. CSS sets height:600px to match.
  const timeLabelSvgs = document.querySelectorAll<SVGSVGElement>('svg[width="40"]')
  timeLabelSvgs.forEach((svg) => {
    svg.setAttribute('viewBox', '0 30 40 600')
    svg.setAttribute('height', '600')
  })

  const tables = document.querySelectorAll<HTMLTableElement>('table[style*="font-family"]')
  tables.forEach((table) => {
    table.style.removeProperty('font-family')
  })

  if (svgs.length > 0 || timeLabelSvgs.length > 0) {
    console.log('[Digikabu] SVG timetable enhanced')
  }
}

/**
 * Watches for dynamically loaded content and enhances it.
 * Call once from init/applySettings.
 */
export function observeAndEnhance() {
  // Run immediately
  enhanceTermineTable()
  enhanceSVGTimetable()

  // Retry after a short delay — the Stundenplan SVG loads dynamically
  // and may not be present on the first run
  setTimeout(() => enhanceSVGTimetable(), 500)
  setTimeout(() => enhanceSVGTimetable(), 1500)

  // Watch for dynamic content
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of Array.from(m.addedNodes)) {
        if (node instanceof HTMLElement) {
          if (node.querySelector?.('table.table-striped')) {
            enhanceTermineTable()
          }
          if (
            node.querySelector?.('svg[style*="background-color"]') ||
            node.querySelector?.('svg[width="40"]') ||
            (node as any).tagName === 'svg'
          ) {
            enhanceSVGTimetable()
          }
        }
      }
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })
  return observer
}