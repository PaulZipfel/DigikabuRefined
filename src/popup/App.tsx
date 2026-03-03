import React, { useEffect, useState, useCallback } from 'react'
import type { DigikabuSettings, Theme } from '../shared/types'
import { getSettings, saveSettings } from '../shared/storage'
import ThemeSection from './components/ThemeSection'
import AutoLoginSection from './components/AutoLoginSection'
import Header from './components/Header'
import Toast from './components/Toast'

export type ToastState = { message: string; type: 'success' | 'error' | 'info' } | null

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

  const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  async function handleThemeChange(theme: Theme) {
    if (!settings || theme === settings.theme) return
    const next = { ...settings, theme }
    setSettings(next)
    await saveSettings({ theme })

    // Notify active tab
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, { action: 'changeTheme', theme })
      }
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
