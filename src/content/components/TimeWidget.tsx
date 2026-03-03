import React, { useEffect, useState, useRef, useCallback } from 'react'
import type { Theme, PeriodInfo } from '../../shared/types'
import { getPeriodInfo, parseTime, formatCountdown, formatDuration } from '../../shared/scheduleUtils'

interface Props {
  theme: Theme
  userSide: 'left' | 'right' | null
  shadowRoot: ShadowRoot | null
}

const WIDGET_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  :host { display: block; margin: 16px 0; }

  .widget {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    border-radius: 14px;
    padding: 16px 20px;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
    cursor: default;
    max-width: 440px;
  }

  .widget::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    opacity: 0;
    transition: opacity 0.3s ease;
    background: radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.06), transparent 70%);
  }
  .widget:hover::before { opacity: 1; }
  .widget:hover { transform: translateY(-1px); }

  .widget--standard { background: linear-gradient(135deg, #f0f4ff, #e8f0fe); border: 1px solid rgba(66,133,244,0.2); color: #1e293b; box-shadow: 0 4px 20px rgba(66,133,244,0.1); }
  .widget--dark { background: linear-gradient(135deg, rgba(15,20,30,0.95), rgba(20,30,45,0.95)); border: 1px solid rgba(77,184,255,0.25); color: #e0e0e0; box-shadow: 0 4px 24px rgba(77,184,255,0.15); backdrop-filter: blur(20px); }
  .widget--dark-blue { background: linear-gradient(135deg, rgba(13,17,23,0.95), rgba(22,27,34,0.95)); border: 1px solid rgba(88,166,255,0.25); color: #c9d1d9; box-shadow: 0 4px 24px rgba(88,166,255,0.15); backdrop-filter: blur(20px); }

  .widget-glow { position: absolute; top: 0; left: 20%; right: 20%; height: 1px; opacity: 0.6; }
  .widget--dark .widget-glow { background: linear-gradient(90deg, transparent, #4db8ff, transparent); }
  .widget--dark-blue .widget-glow { background: linear-gradient(90deg, transparent, #58a6ff, transparent); }
  .widget--standard .widget-glow { background: linear-gradient(90deg, transparent, #4285f4, transparent); }

  .widget-inner { position: relative; z-index: 1; }

  .widget-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }

  .pulse-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; animation: pulseAnim 2s ease-in-out infinite; }
  .widget--dark .pulse-dot { background: #4db8ff; box-shadow: 0 0 8px rgba(77,184,255,0.6); }
  .widget--dark-blue .pulse-dot { background: #58a6ff; box-shadow: 0 0 8px rgba(88,166,255,0.6); }
  .widget--standard .pulse-dot { background: #4285f4; box-shadow: 0 0 8px rgba(66,133,244,0.4); }

  @keyframes pulseAnim {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.4); opacity: 0.6; }
  }

  .widget-label { font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; opacity: 0.6; }

  .widget-mode-tag { margin-left: auto; font-size: 10px; font-weight: 500; padding: 2px 8px; border-radius: 100px; opacity: 0.7; }
  .widget--dark .widget-mode-tag { background: rgba(77,184,255,0.15); color: #4db8ff; }
  .widget--dark-blue .widget-mode-tag { background: rgba(88,166,255,0.15); color: #58a6ff; }
  .widget--standard .widget-mode-tag { background: rgba(66,133,244,0.1); color: #4285f4; }

  .widget-time {
    font-family: 'JetBrains Mono', monospace;
    font-size: 36px;
    font-weight: 600;
    letter-spacing: -1px;
    line-height: 1;
    margin-bottom: 10px;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .widget--dark .widget-time { background: linear-gradient(135deg, #ffffff, #4db8ff); -webkit-background-clip: text; background-clip: text; }
  .widget--dark-blue .widget-time { background: linear-gradient(135deg, #f0f6fc, #58a6ff); -webkit-background-clip: text; background-clip: text; }
  .widget--standard .widget-time { background: linear-gradient(135deg, #1e293b, #4285f4); -webkit-background-clip: text; background-clip: text; }

  .widget-progress-wrap { height: 3px; border-radius: 100px; background: rgba(255,255,255,0.08); margin-bottom: 10px; overflow: hidden; }
  .widget-progress-bar { height: 100%; border-radius: 100px; transition: width 1s linear; }
  .widget--dark .widget-progress-bar { background: linear-gradient(90deg, #0d7377, #4db8ff); }
  .widget--dark-blue .widget-progress-bar { background: linear-gradient(90deg, #1e40af, #58a6ff); }
  .widget--standard .widget-progress-bar { background: linear-gradient(90deg, #1a56db, #4285f4); }

  .widget-footer { display: flex; align-items: center; justify-content: space-between; font-size: 11px; opacity: 0.65; gap: 8px; flex-wrap: wrap; }
  .widget-footer-item { display: flex; align-items: center; gap: 5px; }
  .widget-footer-icon { width: 12px; height: 12px; opacity: 0.7; }
`

export default function TimeWidget({ theme, userSide, shadowRoot }: Props) {
  const [info, setInfo] = useState<PeriodInfo | null>(null)
  const [tick, setTick] = useState(0)
  const celebrationShownRef = useRef(false)

  const refresh = useCallback(() => {
    const periodInfo = getPeriodInfo(userSide)
    setInfo(periodInfo)
    setTick(t => t + 1)
    checkCelebration(periodInfo)
  }, [userSide])

  useEffect(() => {
    refresh()
    const id = window.setInterval(refresh, 1000)
    return () => clearInterval(id)
  }, [refresh])

  useEffect(() => {
    if (!shadowRoot) return
    if (shadowRoot.getElementById('__widget-styles')) return
    const style = document.createElement('style')
    style.id = '__widget-styles'
    style.textContent = WIDGET_CSS
    shadowRoot.insertBefore(style, shadowRoot.firstChild)
  }, [shadowRoot])

  function checkCelebration(periodInfo: PeriodInfo) {
    if (!periodInfo.schoolEndTime) return
    const now = new Date()
    const diff = now.getTime() - periodInfo.schoolEndTime.getTime()
    const today = now.toDateString()
    const lastCelebration = localStorage.getItem('__dk_celebration')
    if (diff >= 0 && diff <= 60000 && lastCelebration !== today && !celebrationShownRef.current) {
      celebrationShownRef.current = true
      localStorage.setItem('__dk_celebration', today)
      showCelebration()
    }
  }

  function showCelebration() {
    const el = document.createElement('div')
    el.id = '__digikabu-celebration'
    el.style.cssText = 'position:fixed;inset:0;z-index:99998;pointer-events:none;'
    el.innerHTML = `
      <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.45);z-index:99998;"></div>
      <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
        background:rgba(6,8,17,0.95);backdrop-filter:blur(20px);
        border-radius:20px;padding:40px 50px;text-align:center;
        border:1px solid rgba(255,255,255,0.1);z-index:99999;">
        <div style="font-size:52px;margin-bottom:16px">🎉</div>
        <h2 style="color:#ffd700;font-family:Space Grotesk,sans-serif;font-size:26px;margin-bottom:10px;font-weight:700">Schultag beendet!</h2>
        <p style="color:rgba(255,255,255,0.65);font-family:Space Grotesk,sans-serif;font-size:15px">Enjoy your free time! 🚀</p>
      </div>
    `
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 8000)
  }

  if (!info) return null

  const now = new Date()
  const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const schoolEndStr = info.schoolEndTime?.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) ?? ''

  let progressPct = 0
  if (info.isInPeriod && info.period) {
    const slotStart = parseTime(info.period.start)
    const periodEnd = info.periodEndTime ?? parseTime(info.period.end)
    const totalMs = periodEnd.getTime() - slotStart.getTime()
    const elapsed = now.getTime() - slotStart.getTime()
    progressPct = Math.max(0, Math.min(100, (elapsed / totalMs) * 100))
  }

  return (
    <div className={`widget widget--${theme}`}>
      <div className="widget-glow" />
      <div className="widget-inner">
        <div className="widget-header">
          <div className="pulse-dot" />
          <span className="widget-label">
            {info.isInPeriod ? info.periodType
              : info.nextPeriod && info.minutesUntilNext < 60 ? 'Pause'
              : 'Aktuelle Zeit'}
          </span>
          {info.isInPeriod && info.period && (
            <span className="widget-mode-tag">{info.period.name}</span>
          )}
        </div>

        <div className="widget-time" key={tick}>
          {info.isInPeriod
            ? formatCountdown(info.minutesRemaining, info.secondsRemaining)
            : info.nextPeriod && info.minutesUntilNext < 60
            ? `${info.minutesUntilNext} Min Pause`
            : timeStr}
        </div>

        {info.isInPeriod && (
          <div className="widget-progress-wrap">
            <div className="widget-progress-bar" style={{ width: `${progressPct}%` }} />
          </div>
        )}

        <div className="widget-footer">
          {info.isInPeriod && info.periodEndTime && (
            <div className="widget-footer-item">
              <svg className="widget-footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              Ende {info.periodEndTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
            </div>
          )}
          {!info.isInPeriod && info.nextPeriod && info.minutesUntilNext < 60 && (
            <div className="widget-footer-item">
              <svg className="widget-footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="5 12 12 5 19 12"/>
              </svg>
              {info.nextPeriod.name} ab {info.nextPeriod.start} Uhr
            </div>
          )}
          {schoolEndStr && (
            <div className="widget-footer-item" style={{ marginLeft: 'auto' }}>
              <svg className="widget-footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              Schulschluss {schoolEndStr} ({formatDuration(info.minutesUntilSchoolEnd)})
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
