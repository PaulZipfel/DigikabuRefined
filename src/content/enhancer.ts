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
