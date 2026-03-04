// ============================================================
// src/shared/types.ts
// Zentrale TypeScript-Typen für Popup und Content Script.
// ============================================================

export type Theme = 'standard' | 'dark' | 'dark-blue'

// 'none' = CSS-only Glassmorphism, kein WebGL
export type BackgroundEffect = 'none' | 'lightpillar' | 'floatinglines'

export interface DigikabuSettings {
  theme: Theme
  backgroundEffect: BackgroundEffect
  autoLogin: boolean
  // Bei geteiltem Stundenplan (zwei Klassen, 50%/50% SVG): welche Seite gehört dem User?
  sidePreference: 'left' | 'right' | null
}

export interface TimeSlot {
  start: string  // "HH:MM"
  end: string    // "HH:MM"
  name: string
}

export interface PeriodInfo {
  period: TimeSlot | null
  minutesRemaining: number
  secondsRemaining: number
  isInPeriod: boolean
  nextPeriod: TimeSlot | null
  minutesUntilNext: number
  schoolEndTime: Date | null
  minutesUntilSchoolEnd: number
  // "Stunde" | "Doppelstunde" | "Dreifachstunde" etc. — aus SVG-Höhe berechnet
  periodType: string
  periodEndTime: Date | null
}

export interface ScheduleAnalysis {
  lastPeriod: TimeSlot | null
  isSplitSchedule: boolean
  userSide: 'left' | 'right' | null
}