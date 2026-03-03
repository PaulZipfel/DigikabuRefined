import type { DigikabuSettings, Theme } from './types'

const SETTINGS_KEY = 'digikabu-settings-v2'

export const DEFAULT_SETTINGS: DigikabuSettings = {
  theme: 'standard',
  autoLogin: false,
  sidePreference: null,
}

export async function getSettings(): Promise<DigikabuSettings> {
  try {
    const result = await chrome.storage.local.get(SETTINGS_KEY)
    return { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] ?? {}) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export async function saveSettings(patch: Partial<DigikabuSettings>): Promise<void> {
  const current = await getSettings()
  await chrome.storage.local.set({ [SETTINGS_KEY]: { ...current, ...patch } })
}

export async function getTheme(): Promise<Theme> {
  const s = await getSettings()
  return s.theme
}

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
