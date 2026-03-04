// ============================================================
// src/popup/components/BackgroundSection.tsx
// Hintergrundeffekt-Auswahl. Deaktiviert wenn Standard-Theme aktiv ist,
// da Effekte nur auf dunklem Hintergrund sichtbar sind.
// ============================================================

import React from 'react'
import type { BackgroundEffect } from '../../shared/types'

interface Props {
  current: BackgroundEffect
  onChange: (effect: BackgroundEffect) => void
  disabled?: boolean
}

interface EffectOption {
  id: BackgroundEffect
  label: string
  description: string
  icon: React.ReactNode
}

const OPTIONS: EffectOption[] = [
  {
    id: 'lightpillar',
    label: 'Light Pillar',
    description: '3D Volumetrischer Lichtstrahl',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2v20" />
        <path d="M8 4c0 0 4 3 4 10s-4 10-4 10" opacity="0.4" />
        <path d="M16 4c0 0-4 3-4 10s4 10 4 10" opacity="0.4" />
        <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.6" />
      </svg>
    ),
  },
  {
    id: 'floatinglines',
    label: 'Floating Lines',
    description: 'Animierte Wellenlinien',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
        <path d="M2 8c2-3 4-3 6 0s4 3 6 0 4-3 6 0" opacity="0.4" />
        <path d="M2 16c2-3 4-3 6 0s4 3 6 0 4-3 6 0" opacity="0.4" />
      </svg>
    ),
  },
  {
    id: 'none',
    label: 'Glassmorphism',
    description: 'Ambient Glow ohne WebGL',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="4" opacity="0.5" />
        <rect x="6" y="6" width="12" height="12" rx="3" opacity="0.3" />
        <circle cx="12" cy="12" r="3" opacity="0.6" />
      </svg>
    ),
  },
]

export default function BackgroundSection({ current, onChange, disabled }: Props) {
  return (
    <section className={`popup-section ${disabled ? 'section-disabled' : ''}`}>
      <h2 className="section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="2" width="20" height="20" rx="3" />
          <path d="M2 14l6-6 4 4 4-4 6 6" />
        </svg>
        Hintergrund-Effekt
      </h2>

      <div className="bg-effect-grid">
        {OPTIONS.map(opt => (
          <button
            key={opt.id}
            className={`bg-effect-card ${current === opt.id ? 'bg-effect-card--active' : ''}`}
            onClick={() => !disabled && onChange(opt.id)}
            disabled={disabled}
            title={opt.description}
          >
            <div className="bg-effect-icon">{opt.icon}</div>
            <div className="bg-effect-info">
              <span className="bg-effect-label">{opt.label}</span>
              <span className="bg-effect-desc">{opt.description}</span>
            </div>
          </button>
        ))}
      </div>

      {disabled && (
        <p className="bg-effect-hint">
          Wähle zuerst ein Dark Theme um den Hintergrund-Effekt zu ändern.
        </p>
      )}
    </section>
  )
}