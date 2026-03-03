import React from 'react'

interface Props {
  enabled: boolean
  onToggle: (enabled: boolean) => void
}

export default function AutoLoginSection({ enabled, onToggle }: Props) {
  return (
    <section className="popup-section">
      <h2 className="section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Auto-Login
      </h2>

      <div className="autologin-card">
        <div className="autologin-row">
          <div className="autologin-info">
            <span className="autologin-label">Automatisch einloggen</span>
            <span className="autologin-sub">
              Login-Daten werden verschlüsselt gespeichert
            </span>
          </div>
          <button
            className={`toggle ${enabled ? 'toggle--on' : ''}`}
            onClick={() => onToggle(!enabled)}
            aria-label="Auto-Login umschalten"
          >
            <div className="toggle-thumb" />
          </button>
        </div>

        {enabled && (
          <div className="autologin-notice">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="notice-icon">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>AES-256 verschlüsselt · Nur lokal gespeichert · 30 Tage gültig</span>
          </div>
        )}
      </div>
    </section>
  )
}
