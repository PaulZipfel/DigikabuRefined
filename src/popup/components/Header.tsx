import React from 'react'
import type { Theme } from '../../shared/types'

interface Props {
  theme: Theme
  isOnDigikabu: boolean
}

const STATUS_LABELS: Record<Theme, string> = {
  standard: 'Original Design',
  dark: 'Dark Mode aktiv',
  'dark-blue': 'Dark Blue aktiv',
}

export default function Header({ theme, isOnDigikabu }: Props) {
  return (
    <header className="popup-header">
      <div className="logo-area">
        <div className={`logo-icon logo-icon--${theme}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div className="logo-text">
          <h1>Digikabu</h1>
          <span>Enhancer</span>
        </div>
      </div>
      <div className={`status-badge status-badge--${theme === 'standard' ? 'off' : 'on'}`}>
        <span className="status-dot" />
        {STATUS_LABELS[theme]}
      </div>
      {!isOnDigikabu && (
        <div className="not-on-site-note">
          ⚠️ Nicht auf digikabu.de
        </div>
      )}
    </header>
  )
}
