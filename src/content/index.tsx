// ============================================================
// src/content/index.tsx
// Haupt-Entry des Content Scripts — wird auf jeder digikabu.de-Seite injiziert.
//
// Zuständig für: Theme setzen, WebGL-Hintergrund mounten,
// Live-Widget mounten, auf Popup-Nachrichten reagieren.
// ============================================================

import React from 'react'
import { createRoot } from 'react-dom/client'
import { getSettings, onSettingsChange } from '../shared/storage'
import type { DigikabuSettings } from '../shared/types'
import { applyThemeClass, removeThemeClasses, createAmbientParticles, observeAndEnhance } from './enhancer'
import TimeWidget from './components/TimeWidget'
import SideDialog from './components/SideDialog'
import BackgroundEffect from './components/BackgroundEffect'

// Verhindert doppelte Initialisierung falls Chrome das Script mehrfach injiziert
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
let bgEffectRoot: ReturnType<typeof createRoot> | null = null
let bgEffectContainer: HTMLElement | null = null

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
    applyBackground(s)
    mountTimeWidget(s)
    observeAndEnhance()
  } else {
    removeTimeWidget()
    removeBackgroundEffect()
    removeAmbientParticles()
  }
}

function applyBackground(s: DigikabuSettings) {
  if (s.backgroundEffect === 'none') {
    removeBackgroundEffect()
    createAmbientParticles()
  } else {
    removeAmbientParticles()
    mountBackgroundEffect(s)
  }
}

// Mountet den WebGL-Effekt in einem Shadow DOM mit z-index: -1,
// damit er hinter dem gesamten Seiteninhalt bleibt.
function mountBackgroundEffect(s: DigikabuSettings) {
  removeBackgroundEffect()
  if (s.theme === 'standard') return

  bgEffectContainer = document.createElement('div')
  bgEffectContainer.id = '__digikabu-bg-host'
  bgEffectContainer.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none;'

  const shadow = bgEffectContainer.attachShadow({ mode: 'open' })
  const mountPoint = document.createElement('div')
  mountPoint.style.cssText = 'width:100%;height:100%;position:fixed;inset:0;'
  shadow.appendChild(mountPoint)

  document.body.prepend(bgEffectContainer)

  bgEffectRoot = createRoot(mountPoint)
  bgEffectRoot.render(
    <BackgroundEffect theme={s.theme} effect={s.backgroundEffect} />
  )
}

function removeBackgroundEffect() {
  if (bgEffectRoot) {
    try { bgEffectRoot.unmount() } catch { /* ignore */ }
    bgEffectRoot = null
  }
  document.getElementById('__digikabu-bg-host')?.remove()
  bgEffectContainer = null
}

function removeAmbientParticles() {
  document.getElementById('__digikabu-ambient')?.remove()
}

// Mountet das Widget in einem Shadow DOM direkt in den Seiteninhalt.
// Auf /Stundenplan nach der Überschrift, auf /Main vor "Aktuelle Termine".
// Bei geteiltem Stundenplan ohne gespeicherte Seite: erst SideDialog zeigen.
function mountTimeWidget(s: DigikabuSettings) {
  const url = window.location.href
  if (!url.includes('/Main') && !url.includes('/Stundenplan')) return

  let anchor: Element | null = null
  let insertMode: 'before' | 'after' = 'after'

  if (url.includes('/Stundenplan')) {
    anchor = document.getElementById('stdplanheading')
    insertMode = 'after'
  } else if (url.includes('/Main')) {
    const headings = Array.from(document.querySelectorAll('h3'))
    for (const h of headings) {
      if (h.textContent?.includes('Aktuelle Termine')) {
        anchor = h
        insertMode = 'before'
        break
      }
    }
    if (!anchor) {
      const form = document.querySelector('form[action="/Main"]')
      if (form) { anchor = form; insertMode = 'after' }
    }
  }

  if (!anchor) return

  removeTimeWidget()

  timeWidgetContainer = document.createElement('div')
  timeWidgetContainer.id = '__digikabu-widget-host'
  timeWidgetContainer.style.cssText = 'display: contents;'
  shadowRoot = timeWidgetContainer.attachShadow({ mode: 'open' })

  if (insertMode === 'before') {
    anchor.parentNode?.insertBefore(timeWidgetContainer, anchor)
  } else {
    anchor.parentNode?.insertBefore(timeWidgetContainer, anchor.nextSibling)
  }

  const mountPoint = document.createElement('div')
  shadowRoot.appendChild(mountPoint)
  timeWidgetRoot = createRoot(mountPoint)

  const isSplit = hasSplitSchedule()

  if (isSplit && !s.sidePreference) {
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

// Geteilter Stundenplan erkennbar an SVGs mit width="50%"
function hasSplitSchedule(): boolean {
  return !!document.querySelector('svg[width="50%"]')
}

function removeTimeWidget() {
  if (timeWidgetRoot) {
    try { timeWidgetRoot.unmount() } catch { /* ignore */ }
    timeWidgetRoot = null
  }
  document.getElementById('__digikabu-widget-host')?.remove()
  timeWidgetContainer = null
  shadowRoot = null
}

// Empfängt Nachrichten vom Popup (Theme-Wechsel, Auto-Login-Toggle etc.)
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}