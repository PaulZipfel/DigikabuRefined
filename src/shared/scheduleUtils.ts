// ============================================================
// src/shared/scheduleUtils.ts
// Stundenplan-Analyse und Zeitberechnungen für das Live-Widget.
//
// Wie funktioniert die Stundenplan-Erkennung?
// Digikabu rendert den Stundenplan als SVG-Elemente. Jede Unterrichtsstunde
// ist ein <svg> mit Y-Position und Höhe: y=0 → 1. Stunde, y=60 → 2. Stunde.
// height=60 → Einzelstunde, height=120 → Doppelstunde usw.
// Bei geteilten Plänen (zwei Klassen) hat das SVG width="50%".
// ============================================================

import type { TimeSlot, PeriodInfo, ScheduleAnalysis } from './types'

export const TIME_SLOTS: TimeSlot[] = [
  { start: '08:30', end: '09:15', name: '1. Stunde' },
  { start: '09:15', end: '10:00', name: '2. Stunde' },
  { start: '10:15', end: '11:00', name: '3. Stunde' },
  { start: '11:00', end: '11:45', name: '4. Stunde' },
  { start: '11:45', end: '12:30', name: '5. Stunde' },
  { start: '12:30', end: '13:15', name: '6. Stunde' },
  { start: '13:15', end: '14:00', name: '7. Stunde' },
  { start: '14:00', end: '14:45', name: '8. Stunde' },
  { start: '14:45', end: '15:30', name: '9. Stunde' },
  { start: '15:30', end: '16:15', name: '10. Stunde' },
]

export function parseTime(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0)
}

// Scannt alle SVGs im DOM und bestimmt wann der Schultag endet.
// Bei geteiltem Stundenplan werden nur SVGs der gewählten Seite ausgewertet.
export function analyzeSchedule(userSide: 'left' | 'right' | null): ScheduleAnalysis {
  const svgElements = Array.from(document.querySelectorAll('svg'))
  let isSplitSchedule = false
  let highestEndSlotIndex = -1

  for (const svg of svgElements) {
    if (svg.getAttribute('width') === '50%') {
      isSplitSchedule = true
      break
    }
  }

  for (const svg of svgElements) {
    if (!svg.querySelector('rect.std, rect.vertretStd')) continue

    const width = svg.getAttribute('width') ?? ''
    const xPos = svg.getAttribute('x') ?? '0%'
    const yPos = parseFloat(svg.getAttribute('y') ?? '0')
    const height = parseFloat(svg.getAttribute('height') ?? '60')

    // height >= 300 = Rahmen-SVG, keine Stunde
    if (height >= 300) continue

    if (width === '50%') {
      if (userSide === 'left' && xPos !== '0%') continue
      if (userSide === 'right' && xPos !== '50%') continue
      if (userSide === null) continue
    }

    const endSlotIndex = Math.floor((yPos + height) / 60) - 1
    if (endSlotIndex > highestEndSlotIndex && endSlotIndex >= 0 && endSlotIndex < TIME_SLOTS.length) {
      highestEndSlotIndex = endSlotIndex
    }
  }

  return {
    lastPeriod: highestEndSlotIndex >= 0 ? TIME_SLOTS[highestEndSlotIndex] : null,
    isSplitSchedule,
    userSide,
  }
}

// Gibt zurück wie viele Stunden der aktuelle Block dauert und wann er endet.
// Doppelstunden sind im SVG ein doppelt so hohes Element (height=120 statt 60).
export function getCurrentPeriodBlock(userSide: 'left' | 'right' | null): {
  periods: number
  endTime: Date | null
  type: string
} {
  const now = new Date()
  const currentTime = now.getHours() * 60 + now.getMinutes()
  const svgElements = Array.from(document.querySelectorAll('svg'))

  for (const svg of svgElements) {
    if (!svg.querySelector('rect.std, rect.vertretStd')) continue

    const width = svg.getAttribute('width') ?? ''
    const xPos = svg.getAttribute('x') ?? '0%'
    const yPos = parseFloat(svg.getAttribute('y') ?? '0')
    const height = parseFloat(svg.getAttribute('height') ?? '60')

    if (height >= 300) continue

    if (width === '50%') {
      if (userSide === 'left' && xPos !== '0%') continue
      if (userSide === 'right' && xPos !== '50%') continue
    }

    const startSlotIndex = Math.floor(yPos / 60)
    const periods = Math.round(height / 60)
    const endSlotIndex = startSlotIndex + periods - 1

    if (
      startSlotIndex >= 0 && startSlotIndex < TIME_SLOTS.length &&
      endSlotIndex >= 0 && endSlotIndex < TIME_SLOTS.length
    ) {
      const startTime = parseTime(TIME_SLOTS[startSlotIndex].start)
      const endTime = parseTime(TIME_SLOTS[endSlotIndex].end)
      const startMinutes = startTime.getHours() * 60 + startTime.getMinutes()
      const endMinutes = endTime.getHours() * 60 + endTime.getMinutes()

      if (currentTime >= startMinutes && currentTime < endMinutes) {
        let type = 'Stunde'
        if (periods === 2) type = 'Doppelstunde'
        else if (periods === 3) type = 'Dreifachstunde'
        else if (periods > 3) type = `${periods}-Stunden-Block`
        return { periods, endTime, type }
      }
    }
  }

  return { periods: 1, endTime: null, type: 'Stunde' }
}

// Hauptfunktion des Widgets — wird jede Sekunde aufgerufen.
// Kombiniert analyzeSchedule + getCurrentPeriodBlock zu einer vollständigen PeriodInfo.
export function getPeriodInfo(userSide: 'left' | 'right' | null): PeriodInfo {
  const now = new Date()
  const currentTime = now.getHours() * 60 + now.getMinutes()

  const analysis = analyzeSchedule(userSide)
  const block = getCurrentPeriodBlock(userSide)

  const schoolEndTime = analysis.lastPeriod
    ? parseTime(analysis.lastPeriod.end)
    : parseTime(TIME_SLOTS[TIME_SLOTS.length - 1].end)

  const diffMsToEnd = schoolEndTime.getTime() - now.getTime()
  const minutesUntilSchoolEnd = Math.max(0, Math.floor(diffMsToEnd / 60000))

  let currentPeriod: TimeSlot | null = null
  let nextPeriod: TimeSlot | null = null
  let minutesRemaining = 0
  let secondsRemaining = 0
  let minutesUntilNext = 0
  let periodEndTime: Date | null = null

  for (const slot of TIME_SLOTS) {
    const startTime = parseTime(slot.start)
    const endTime = parseTime(slot.end)
    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes()
    const endMinutes = endTime.getHours() * 60 + endTime.getMinutes()

    if (currentTime >= startMinutes && currentTime < endMinutes) {
      currentPeriod = slot
      // Bei Doppelstunden das Ende des gesamten Blocks verwenden, nicht der Einzelstunde
      const actualEnd = block.endTime ?? endTime
      periodEndTime = actualEnd
      const diffMs = actualEnd.getTime() - now.getTime()
      minutesRemaining = Math.max(0, Math.floor(diffMs / 60000))
      secondsRemaining = Math.max(0, Math.floor((diffMs % 60000) / 1000))
      break
    }
  }

  for (const slot of TIME_SLOTS) {
    const startMinutes = parseTime(slot.start).getHours() * 60 + parseTime(slot.start).getMinutes()
    if (startMinutes > currentTime) {
      nextPeriod = slot
      minutesUntilNext = startMinutes - currentTime
      break
    }
  }

  return {
    period: currentPeriod,
    minutesRemaining,
    secondsRemaining,
    isInPeriod: currentPeriod !== null,
    nextPeriod,
    minutesUntilNext,
    schoolEndTime,
    minutesUntilSchoolEnd,
    periodType: block.type,
    periodEndTime,
  }
}

// "05:03" oder "1:05:03" wenn >= 1 Stunde
export function formatCountdown(minutes: number, seconds: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h}:${String(m).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// "45 Min" oder "1:30h"
export function formatDuration(totalMinutes: number): string {
  if (totalMinutes >= 60) {
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    return `${h}:${String(m).padStart(2, '0')}h`
  }
  return `${totalMinutes} Min`
}