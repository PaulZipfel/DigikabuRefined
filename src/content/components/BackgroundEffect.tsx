// ============================================================
// src/content/components/BackgroundEffect.tsx
// Switcher zwischen LightPillar, FloatingLines und keinem Effekt.
// Enthält die theme-spezifischen Farbkonfigurationen für beide WebGL-Komponenten.
// ============================================================

import React from 'react'
import LightPillar from './LightPillar'
import FloatingLines from './FloatingLines'
import type { Theme, BackgroundEffect as BgType } from '../../shared/types'

interface BackgroundEffectProps {
  theme: Theme
  effect: BgType
}

const PILLAR: Record<string, {
  topColor: string
  bottomColor: string
  intensity: number
  glowAmount: number
}> = {
  dark: {
    topColor: '#4db8ff',
    bottomColor: '#7c4fff',
    intensity: 0.6,
    glowAmount: 0.0015,
  },
  'dark-blue': {
    topColor: '#58a6ff',
    bottomColor: '#1e40af',
    intensity: 0.5,
    glowAmount: 0.0013,
  },
}

const LINES: Record<string, { gradient: string[] }> = {
  dark: {
    gradient: ['#0d4f7a', '#1a6fb5', '#4db8ff', '#7c4fff', '#5227cc'],
  },
  'dark-blue': {
    gradient: ['#0a2a5e', '#1e40af', '#3b82f6', '#58a6ff', '#1a4f8c'],
  },
}

// Fixed hinter dem gesamten Seiteninhalt, Klicks gehen durch (pointer-events: none)
const HOST: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  zIndex: -1,
  pointerEvents: 'none',
  overflow: 'hidden',
}

const BackgroundEffect: React.FC<BackgroundEffectProps> = ({ theme, effect }) => {
  if (effect === 'none' || theme === 'standard') return null

  const key = theme === 'dark-blue' ? 'dark-blue' : 'dark'

  if (effect === 'lightpillar') {
    const cfg = PILLAR[key] || PILLAR.dark
    return (
      <div style={HOST}>
        <LightPillar
          topColor={cfg.topColor}
          bottomColor={cfg.bottomColor}
          intensity={cfg.intensity}
          rotationSpeed={0.3}
          glowAmount={cfg.glowAmount}
          pillarWidth={3}
          pillarHeight={0.4}
          noiseIntensity={0.5}
          pillarRotation={25}
          interactive={false}
          mixBlendMode="screen"
          quality="high"
        />
      </div>
    )
  }

  if (effect === 'floatinglines') {
    const cfg = LINES[key] || LINES.dark
    return (
      // FloatingLines braucht pointer-events für die Maus-Interaktion
      <div style={{ ...HOST, pointerEvents: 'auto' }}>
        <FloatingLines
          linesGradient={cfg.gradient}
          enabledWaves={['top', 'middle', 'bottom']}
          lineCount={5}
          lineDistance={5}
          bendRadius={5}
          bendStrength={-0.5}
          interactive={true}
          parallax={true}
          mixBlendMode="screen"
        />
      </div>
    )
  }

  return null
}

export default BackgroundEffect