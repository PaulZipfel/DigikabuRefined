import React from 'react'
import type { Theme } from '../../shared/types'

interface ThemeCardProps {
  id: Theme
  label: string
  description: string
  isActive: boolean
  onClick: () => void
  preview: React.ReactNode
}

function ThemeCard({ id, label, description, isActive, onClick, preview }: ThemeCardProps) {
  return (
    <button
      className={`theme-card theme-card--${id} ${isActive ? 'theme-card--active' : ''}`}
      onClick={onClick}
    >
      <div className="theme-card-preview">
        {preview}
        {isActive && (
          <div className="theme-card-check">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </div>
      <div className="theme-card-info">
        <span className="theme-card-label">{label}</span>
        <span className="theme-card-desc">{description}</span>
      </div>
    </button>
  )
}

interface Props {
  currentTheme: Theme
  onThemeChange: (theme: Theme) => void
}

export default function ThemeSection({ currentTheme, onThemeChange }: Props) {
  return (
    <section className="popup-section">
      <h2 className="section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
        </svg>
        Theme wählen
      </h2>

      <div className="theme-grid">
        <ThemeCard
          id="standard"
          label="Standard"
          description="Original Digikabu"
          isActive={currentTheme === 'standard'}
          onClick={() => onThemeChange('standard')}
          preview={
            <div className="preview-standard">
              <div className="prev-nav" />
              <div className="prev-body">
                <div className="prev-bar prev-bar--blue" />
                <div className="prev-bar prev-bar--short" />
              </div>
            </div>
          }
        />

        <ThemeCard
          id="dark"
          label="Dark Mode"
          description="Dunkel mit Cyan"
          isActive={currentTheme === 'dark'}
          onClick={() => onThemeChange('dark')}
          preview={
            <div className="preview-dark">
              <div className="prev-nav prev-nav--dark" />
              <div className="prev-body prev-body--dark">
                <div className="prev-bar prev-bar--cyan" />
                <div className="prev-bar prev-bar--short prev-bar--dim" />
              </div>
            </div>
          }
        />

        <ThemeCard
          id="dark-blue"
          label="Dark Blue"
          description="GitHub-Stil mit Blau"
          isActive={currentTheme === 'dark-blue'}
          onClick={() => onThemeChange('dark-blue')}
          preview={
            <div className="preview-dark-blue">
              <div className="prev-nav prev-nav--navy" />
              <div className="prev-body prev-body--navy">
                <div className="prev-bar prev-bar--sapphire" />
                <div className="prev-bar prev-bar--short prev-bar--muted" />
              </div>
            </div>
          }
        />
      </div>
    </section>
  )
}
