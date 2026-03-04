// src/content/components/LightPillarBackground.tsx
// Fullscreen fixed background wrapper for LightPillar
// Passes theme-appropriate colors to the original component

import React from 'react';
import LightPillar from './LightPillar';

interface LightPillarBackgroundProps {
  theme: 'dark' | 'dark-blue' | 'standard';
}

// Theme → pillar color mapping
const THEME_COLORS: Record<string, {
  topColor: string;
  bottomColor: string;
  intensity: number;
  glowAmount: number;
}> = {
  dark: {
    topColor: '#4db8ff',      // Cyan accent
    bottomColor: '#7c4fff',   // Purple secondary
    intensity: 0.6,           // Subtle — it's a background, not a hero
    glowAmount: 0.0015,
  },
  'dark-blue': {
    topColor: '#58a6ff',      // GitHub blue accent
    bottomColor: '#1e40af',   // Deep sapphire
    intensity: 0.5,
    glowAmount: 0.0013,
  },
};

const HOST_STYLES: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  zIndex: -1,
  pointerEvents: 'none',
  overflow: 'hidden',
};

const LightPillarBackground: React.FC<LightPillarBackgroundProps> = ({ theme }) => {
  const colors = THEME_COLORS[theme] || THEME_COLORS.dark;

  return (
    <div style={HOST_STYLES}>
      <LightPillar
        topColor={colors.topColor}
        bottomColor={colors.bottomColor}
        intensity={colors.intensity}
        rotationSpeed={0.3}
        glowAmount={colors.glowAmount}
        pillarWidth={3}
        pillarHeight={0.4}
        noiseIntensity={0.5}
        pillarRotation={25}
        interactive={false}
        mixBlendMode="screen"
        quality="high"
      />
    </div>
  );
};

export default LightPillarBackground;