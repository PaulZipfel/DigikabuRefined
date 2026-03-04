// src/popup/App.tsx

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

  // Send updated settings to the active tab
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
      // Not on digikabu or tab not available
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

    // Notify tab to re-render background
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
    } catch { /* not on digikabu */ }

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

            <a href="https://github.com/PaulZipfel/DigikabuRefined"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-github"
            >
            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            GitHub
          </a>
        </footer>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}