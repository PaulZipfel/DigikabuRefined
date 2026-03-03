export type Theme = 'standard' | 'dark' | 'dark-blue'

export interface DigikabuSettings {
  theme: Theme
  autoLogin: boolean
  sidePreference: 'left' | 'right' | null
}

export interface TimeSlot {
  start: string
  end: string
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
  periodType: string
  periodEndTime: Date | null
}

export interface ScheduleAnalysis {
  lastPeriod: TimeSlot | null
  isSplitSchedule: boolean
  userSide: 'left' | 'right' | null
}
