// ============================================================
// src/content/enhancer.ts
// DOM-Bereinigung für Digikibus inline styles.
//
// Das Problem: Digikabu setzt Farben direkt als inline style auf Elemente
// (z.B. <td style="color: blue">). Inline styles haben die höchste
// CSS-Spezifizität — normale Klassen-Selektoren können das nicht überschreiben.
//
// Lösung: inline styles per JS entfernen, Bedeutung als data-Attribut sichern,
// content.css übernimmt das styling via [data-dk-color="blue"] Selektoren.
// ============================================================

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

// Bereinigt die Termine-Tabelle auf /Main:
// - Entfernt inline color von <td>-Zellen, speichert Bedeutung als data-dk-color
// - Markiert heutige Zeilen mit .dk-today
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

      if (dayCell.style.color) {
        dayCell.dataset.dkColor = dayCell.style.color === 'red' ? 'red' : 'blue'
        dayCell.style.removeProperty('color')
      }
      if (dateCell.style.color) {
        dateCell.dataset.dkColor = dateCell.style.color === 'red' ? 'red' : 'blue'
        dateCell.style.removeProperty('color')
      }
      if (descCell) {
        descCell.style.removeProperty('color')
        descCell.style.removeProperty('background')
        descCell.style.removeProperty('background-color')
      }

      const dateTxt = (dateCell.textContent || '').trim()
      if (dateTxt.startsWith(todayStr)) {
        row.classList.add('dk-today')
      }
    })
  })
  console.log('[Digikabu] Termine table enhanced')
}

// Entfernt den inline background-color vom SVG-Stundenplan.
// Ohne das würde der weiße Hintergrund (#F9F9F9) das Dark-Theme überdecken.
export function enhanceSVGTimetable() {
  const svgs = document.querySelectorAll<SVGSVGElement>('svg[style*="background-color"]')
  svgs.forEach((svg) => {
    svg.style.removeProperty('background-color')
    svg.style.background = 'transparent'
  })
  const tables = document.querySelectorAll<HTMLTableElement>('table[style*="font-family"]')
  tables.forEach((table) => {
    table.style.removeProperty('font-family')
  })

  const timeSvgs = document.querySelectorAll<SVGSVGElement>('svg[width="40"]')
  timeSvgs.forEach((svg) => {
    const parent = svg.parentElement
    const isWeeklyView = !!svg.closest('#umgebung')
    const h = parseFloat(svg.getAttribute('height') || '630')
    if (!isWeeklyView && h > 600) {
      svg.setAttribute('viewBox', '0 30 40 600')
      svg.setAttribute('height', '600')
    }
  })

  if (svgs.length > 0 || timeSvgs.length > 0) console.log('[Digikabu] SVG timetable enhanced')
}

// Führt alle Enhancer sofort aus und beobachtet dann das DOM auf
// dynamisch nachgeladene Inhalte (Digikabu lädt Teile per AJAX nach).
export function observeAndEnhance() {
  enhanceTermineTable()
  enhanceSVGTimetable()

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of Array.from(m.addedNodes)) {
        if (node instanceof HTMLElement) {
          if (node.querySelector?.('table.table-striped')) enhanceTermineTable()
          if (node.querySelector?.('svg[style*="background-color"]') || node.tagName === 'svg') enhanceSVGTimetable()
        }
      }
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })
  return observer
}