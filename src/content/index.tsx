import React from 'react'
import { createRoot } from 'react-dom/client'
import { getSettings, onSettingsChange } from '../shared/storage'
import type { DigikabuSettings } from '../shared/types'
import { applyThemeClass, removeThemeClasses, createAmbientParticles } from './enhancer'
import TimeWidget from './components/TimeWidget'
import SideDialog from './components/SideDialog'

// Prevent double-init
const win = window as any
if (win.__digikabuEnhancerLoaded) {
  throw new Error('Already loaded')
}
win.__digikabuEnhancerLoaded = true

let settings: DigikabuSettings | null = null
let timeWidgetRoot: ReturnType<typeof createRoot> | null = null
let timeWidgetContainer: HTMLElement | null = null
let shadowRoot: ShadowRoot | null = null
let unsubscribe: (() => void) | null = null

async function init() {
  settings = await getSettings()
  applySettings(settings)

  unsubscribe = onSettingsChange((newSettings) => {
    settings = newSettings
    applySettings(newSettings)
  })

  setupMessageListener()
}

function applySettings(s: DigikabuSettings) {
  removeThemeClasses()

  if (s.theme !== 'standard') {
    applyThemeClass(s.theme)
    createAmbientParticles()
    mountTimeWidget(s)
  } else {
    removeTimeWidget()
    removeAmbientParticles()
  }
}

function mountTimeWidget(s: DigikabuSettings) {
  const url = window.location.href

  // Only show on relevant pages
  if (!url.includes('/Main') && !url.includes('/Stundenplan')) {
    return
  }

  // Find injection point
  let anchor: Element | null = null
  let insertMode: 'before' | 'after' | 'prepend' = 'after'

  if (url.includes('/Stundenplan')) {
    anchor = document.getElementById('stdplanheading')
    insertMode = 'after'
  } else if (url.includes('/Main')) {
    // Try "Aktuelle Termine" heading first
    const headings = Array.from(document.querySelectorAll('h3'))
    for (const h of headings) {
      if (h.textContent?.includes('Aktuelle Termine')) {
        anchor = h
        insertMode = 'before'
        break
      }
    }
    // Fallback: after nav form
    if (!anchor) {
      const form = document.querySelector('form[action="/Main"]')
      if (form) { anchor = form; insertMode = 'after' }
    }
  }

  if (!anchor) return

  // Remove existing widget
  removeTimeWidget()

  // Create host container
  timeWidgetContainer = document.createElement('div')
  timeWidgetContainer.id = '__digikabu-widget-host'
  timeWidgetContainer.style.cssText = 'display: contents;'

  // Shadow DOM for style isolation
  shadowRoot = timeWidgetContainer.attachShadow({ mode: 'open' })

  // Inject into DOM
  if (insertMode === 'before') {
    anchor.parentNode?.insertBefore(timeWidgetContainer, anchor)
  } else if (insertMode === 'after') {
    anchor.parentNode?.insertBefore(timeWidgetContainer, anchor.nextSibling)
  }

  // Create React root inside shadow DOM
  const mountPoint = document.createElement('div')
  shadowRoot.appendChild(mountPoint)

  timeWidgetRoot = createRoot(mountPoint)

  const isSplit = hasSplitSchedule()

  if (isSplit && !s.sidePreference) {
    // Show side selection dialog first
    timeWidgetRoot.render(
      <SideDialog
        theme={s.theme}
        onSelect={async (side) => {
          const { saveSettings } = await import('../shared/storage')
          await saveSettings({ sidePreference: side })
          if (shadowRoot && mountPoint) {
            createRoot(mountPoint).render(
              <TimeWidget theme={s.theme} userSide={side} shadowRoot={shadowRoot!} />
            )
          }
        }}
      />
    )
  } else {
    timeWidgetRoot.render(
      <TimeWidget theme={s.theme} userSide={s.sidePreference} shadowRoot={shadowRoot} />
    )
  }
}

function hasSplitSchedule(): boolean {
  return !!document.querySelector('svg[width="50%"]')
}

function removeTimeWidget() {
  if (timeWidgetRoot) {
    try { timeWidgetRoot.unmount() } catch { /* ignore */ }
    timeWidgetRoot = null
  }
  const existing = document.getElementById('__digikabu-widget-host')
  if (existing) existing.remove()
  timeWidgetContainer = null
  shadowRoot = null
}

function removeAmbientParticles() {
  document.getElementById('__digikabu-ambient')?.remove()
}

function setupMessageListener() {
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === 'changeTheme') {
      if (settings) {
        settings = { ...settings, theme: msg.theme }
        applySettings(settings)
      }
      sendResponse({ success: true, theme: msg.theme, active: msg.theme !== 'standard' })
    } else if (msg.action === 'getStatus') {
      sendResponse({
        theme: settings?.theme ?? 'standard',
        active: settings?.theme !== 'standard',
        initialized: true,
      })
    } else if (msg.action === 'setAutoLogin') {
      win.__digikabuAutoLogin?.enableAutoLogin(msg.enabled)
      sendResponse({ success: true })
    } else if (msg.action === 'clearCredentials') {
      win.__digikabuAutoLogin?.clearStoredCredentials()
      sendResponse({ success: true })
    }
    return true
  })
}

// Run init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
