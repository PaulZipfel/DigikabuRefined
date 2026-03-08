// ============================================================
// src/shared/storage.ts
// Wrapper für chrome.storage.local.
//
// Warum kein localStorage?
// Popup (chrome-extension://) und Content Script (https://digikabu.de) laufen
// auf verschiedenen Origins — localStorage ist origin-isoliert, die beiden
// sehen jeweils ihren eigenen Storage. chrome.storage.local ist extension-weit
// geteilt und funktioniert deshalb als gemeinsamer Kanal.
// ============================================================

import type { DigikabuSettings } from './types'

const SETTINGS_KEY = 'digikabu-settings-v2'

export const DEFAULT_SETTINGS: DigikabuSettings = {
  theme: 'dark',
  backgroundEffect: 'lightpillar',
  autoLogin: false,
  sidePreference: null,
}

export async function getSettings(): Promise<DigikabuSettings> {
  try {
    const result = await chrome.storage.local.get(SETTINGS_KEY)
    // Mit DEFAULT_SETTINGS mergen damit neu hinzugekommene Felder einen Fallback haben
    return { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] ?? {}) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

// Speichert nur die übergebenen Felder (Partial), der Rest bleibt unberührt
export async function saveSettings(patch: Partial<DigikabuSettings>): Promise<void> {
  const current = await getSettings()
  await chrome.storage.local.set({ [SETTINGS_KEY]: { ...current, ...patch } })
}

// Gibt eine Unsubscribe-Funktion zurück — wichtig um Listener-Leaks zu vermeiden
export function onSettingsChange(callback: (settings: DigikabuSettings) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
    if (changes[SETTINGS_KEY]) {
      const newVal = changes[SETTINGS_KEY].newValue as DigikabuSettings
      callback({ ...DEFAULT_SETTINGS, ...newVal })
    }
  }
  chrome.storage.local.onChanged.addListener(listener)
  return () => chrome.storage.local.onChanged.removeListener(listener)
}