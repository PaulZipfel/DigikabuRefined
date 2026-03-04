// ============================================================
// src/popup/App.tsx
// Haupt-Komponente des Extension-Popups.
//
// Das Popup läuft auf chrome-extension://, nicht auf digikabu.de.
// Einstellungsänderungen werden deshalb doppelt kommuniziert:
// 1. In chrome.storage.local speichern (für Persistenz und den onSettingsChange-Listener)
// 2. Via chrome.tabs.sendMessage direkt an den aktiven Tab schicken (für sofortige Wirkung)
// ============================================================

import React, { useEffect, useState, useCallback } from 'react'
import type { DigikabuSettings, Theme, BackgroundEffect } from '../shared/types'
import { getSettings, saveSettings } from '../shared/storage'
import ThemeSection from './components/ThemeSection'
import BackgroundSection from './components/BackgroundSection'
import AutoLoginSection from './components/AutoLoginSection'
import Header from './components/Header'
import Toast from './components/Toast'

export type ToastInfo = { message: string; type: 'success' | 'error' | 'info' }
export type ToastState = ToastInfo | null

export default function App() {
  const [settings, setSettings] = useState<DigikabuSettings | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [isOnDigikabu, setIsOnDigikabu] = useState(false)

  useEffect(() => {
    getSettings().then(setSettings)
    checkCurrentTab()
  }, [])

  async function checkCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      setIsOnDigikabu(!!tab?.url?.includes('digikabu.de'))
    } catch {
      setIsOnDigikabu(false)
    }
  }

  const showToast = useCallback((message: string, type: ToastInfo['type'] = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Schickt das aktuelle Theme direkt an den Tab damit es sofort ohne Seiten-Reload wirkt.
  // Fehler werden ignoriert — wenn der Tab nicht erreichbar ist, greift der Storage-Listener.
  async function notifyTab(theme?: Theme) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'changeTheme',
          theme: theme ?? settings?.theme,
        })
      }
    } catch {
      // Nicht auf Digikabu oder Tab nicht erreichbar
    }
  }

  async function handleThemeChange(theme: Theme) {
    if (!settings || theme === settings.theme) return
    const next = { ...settings, theme }
    setSettings(next)
    await saveSettings({ theme })

    try {
      await notifyTab(theme)
    } catch {
      showToast('Theme gespeichert – Seite neu laden', 'info')
      return
    }

    if (theme === 'standard') {
      showToast('Standard Theme aktiviert', 'info')
    } else {
      showToast(`${theme === 'dark-blue' ? 'Dark Blue' : 'Dark'} Theme aktiviert ✨`, 'success')
    }
  }

  async function handleBackgroundChange(effect: BackgroundEffect) {
    if (!settings || effect === settings.backgroundEffect) return
    const next = { ...settings, backgroundEffect: effect }
    setSettings(next)
    await saveSettings({ backgroundEffect: effect })
    await notifyTab()

    const labels: Record<BackgroundEffect, string> = {
      lightpillar: 'Light Pillar',
      floatinglines: 'Floating Lines',
      none: 'Glassmorphism',
    }
    showToast(`Hintergrund: ${labels[effect]} ✨`, 'success')
  }

  async function handleAutoLoginToggle(enabled: boolean) {
    if (!settings) return
    const next = { ...settings, autoLogin: enabled }
    setSettings(next)
    await saveSettings({ autoLogin: enabled })

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, {
          action: enabled ? 'setAutoLogin' : 'clearCredentials',
          enabled,
        })
      }
    } catch { /* nicht auf digikabu */ }

    showToast(enabled ? 'Auto-Login aktiviert 🔐' : 'Auto-Login deaktiviert', enabled ? 'success' : 'info')
  }

  if (!settings) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    )
  }

  const isDarkTheme = settings.theme !== 'standard'

  return (
    <div className="popup-root">
      <div className="bg-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <div className="popup-glass">
        <Header theme={settings.theme} isOnDigikabu={isOnDigikabu} />

        <div className="popup-content">
          <ThemeSection
            currentTheme={settings.theme}
            onThemeChange={handleThemeChange}
          />

          <div className="divider" />

          {/* Deaktiviert wenn Standard-Theme — Effekte sind nur im Dark-Modus sichtbar */}
          <BackgroundSection
            current={settings.backgroundEffect}
            onChange={handleBackgroundChange}
            disabled={!isDarkTheme}
          />

          <div className="divider" />

          <AutoLoginSection
            enabled={settings.autoLogin}
            onToggle={handleAutoLoginToggle}
          />
        </div>

        <footer className="popup-footer">
          <span>Advanced Digikabu v2.0</span>
          <span className="footer-dot">·</span>
          <span>BSZ Wiesau</span>
        </footer>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}