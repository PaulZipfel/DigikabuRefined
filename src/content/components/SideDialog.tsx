import React, { useState } from 'react'
import type { Theme } from '../../shared/types'

interface Props {
  theme: Theme
  onSelect: (side: 'left' | 'right') => void
}

const DIALOG_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  :host { display: block; margin: 16px 0; }

  .dialog {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    border-radius: 14px;
    padding: 20px;
    max-width: 400px;
    animation: fadeIn 0.3s ease;
  }

  .dialog--dark {
    background: linear-gradient(135deg, rgba(15,20,30,0.95), rgba(20,30,45,0.95));
    border: 1px solid rgba(77,184,255,0.25);
    color: #e0e0e0;
    backdrop-filter: blur(20px);
    box-shadow: 0 4px 24px rgba(77,184,255,0.15);
  }

  .dialog--dark-blue {
    background: linear-gradient(135deg, rgba(13,17,23,0.95), rgba(22,27,34,0.95));
    border: 1px solid rgba(88,166,255,0.25);
    color: #c9d1d9;
    backdrop-filter: blur(20px);
    box-shadow: 0 4px 24px rgba(88,166,255,0.15);
  }

  .dialog--standard {
    background: linear-gradient(135deg, #f0f4ff, #e8f0fe);
    border: 1px solid rgba(66,133,244,0.2);
    color: #1e293b;
    box-shadow: 0 4px 20px rgba(66,133,244,0.1);
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .dialog-icon {
    font-size: 24px;
    margin-bottom: 10px;
  }

  .dialog-title {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 6px;
  }

  .dialog-desc {
    font-size: 12px;
    opacity: 0.65;
    margin-bottom: 16px;
    line-height: 1.4;
  }

  .dialog-buttons {
    display: flex;
    gap: 10px;
  }

  .dialog-btn {
    flex: 1;
    padding: 10px;
    border-radius: 8px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid rgba(255,255,255,0.1);
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .dialog--dark .dialog-btn {
    background: rgba(77,184,255,0.1);
    color: #4db8ff;
    border-color: rgba(77,184,255,0.25);
  }
  .dialog--dark .dialog-btn:hover {
    background: rgba(77,184,255,0.2);
    transform: translateY(-1px);
  }

  .dialog--dark-blue .dialog-btn {
    background: rgba(88,166,255,0.1);
    color: #58a6ff;
    border-color: rgba(88,166,255,0.25);
  }
  .dialog--dark-blue .dialog-btn:hover {
    background: rgba(88,166,255,0.2);
    transform: translateY(-1px);
  }

  .dialog--standard .dialog-btn {
    background: rgba(66,133,244,0.1);
    color: #1a56db;
    border-color: rgba(66,133,244,0.2);
  }
  .dialog--standard .dialog-btn:hover {
    background: rgba(66,133,244,0.2);
    transform: translateY(-1px);
  }
`

export default function SideDialog({ theme, onSelect }: Props) {
  const [injectedStyles, setInjectedStyles] = useState(false)

  // Styles are injected by parent via shadow DOM
  return (
    <>
      <style>{DIALOG_CSS}</style>
      <div className={`dialog dialog--${theme}`}>
        <div className="dialog-icon">📋</div>
        <div className="dialog-title">Geteilter Stundenplan erkannt</div>
        <div className="dialog-desc">
          Deine Klasse hat einen geteilten Stundenplan. Welche Seite betrifft dich?
          Diese Einstellung wird gespeichert.
        </div>
        <div className="dialog-buttons">
          <button className="dialog-btn" onClick={() => onSelect('left')}>
            ← Links
          </button>
          <button className="dialog-btn" onClick={() => onSelect('right')}>
            Rechts →
          </button>
        </div>
      </div>
    </>
  )
}
