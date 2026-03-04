# Advanced Digikabu Enhancer

> Eine Chrome Extension, die das BSZ-Schulportal [digikabu.de](https://www.digikabu.de) visuell und funktional aufwertet — mit Dark Themes, WebGL-Hintergründen, einem Live-Stundenplan-Widget und Auto-Login.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)

> 🤖 **Dieses Projekt wurde vollständig mit [Claude Opus 4.6 & Claude Sonnet 4.6](https://claude.ai) von Anthropic erstellt** — von der Architektur über die WebGL-Shader bis hin zum kompletten React-UI.

---

## Features

### 🎨 Themes
Drei verschiedene visuelle Themes, die sich per Popup umschalten lassen:

| Theme | Beschreibung |
|---|---|
| **Standard** | Originales Digikabu-Design, unverändert |
| **Dark Mode** | Dunkles Theme mit Cyan-Akzenten |
| **Dark Blue** | GitHub-inspiriertes Theme mit Blau-/Saphir-Tönen |

Alle Themes überschreiben Digikibus inline `color: blue/red`-Styles auf `<td>`-Elementen sauber per CSS-Attributselektoren mit `!important`. Glyphicon-Fonts bleiben dabei vollständig erhalten.

---

### 🌌 Hintergrund-Effekte (WebGL)
Im Dark-Modus kann ein animierter WebGL-Hintergrund aktiviert werden:

- **Light Pillar** — Volumetrischer 3D-Lichtstrahl per GLSL Raymarching-Shader (Three.js). Cyan-zu-Lila im Dark-Mode, Blau im Dark-Blue-Mode.
- **Floating Lines** — Animierte Wellenlinien mit konfigurierbaren Gradienten und Mouse-Parallax.
- **Glassmorphism** — CSS-only Ambient-Glow ohne WebGL-Overhead.

Die WebGL-Canvas läuft in einem Shadow DOM mit `z-index: -1`, sodass der Seiteninhalt immer im Vordergrund bleibt.

---

### ⏱️ Live-Stundenplan-Widget
Ein Echtzeit-Widget, das auf der Hauptseite und im Stundenplan automatisch eingeblendet wird:

- **Countdown** zur nächsten Stunde oder zum Ende der laufenden Stunde
- **Fortschrittsbalken** für die aktuelle Unterrichtsstunde
- **Schulschluss-Anzeige** mit verbleibender Zeit
- **Split-Stundenplan-Unterstützung** — erkennt automatisch ob der Stundenplan zweigeteilt ist (z.B. FWI links / andere Klasse rechts) und fragt beim ersten Start nach der eigenen Seite
- Das Widget läuft vollständig isoliert in einem Shadow DOM, damit keine Extension-CSS in die Seite „blutet"

---

### 🔐 Auto-Login
- Speichert Zugangsdaten verschlüsselt mit **AES-256-GCM** in `chrome.storage.local`
- Füllt das Login-Formular bei jedem Besuch automatisch aus
- Credentials laufen nach 30 Tagen automatisch ab
- Lässt sich per Popup ein- und ausschalten
- Zeigt eine visuelle Warnung wenn der Account gesperrt ist oder die Session abgelaufen ist

---

## Tech Stack

| Bereich | Technologie |
|---|---|
| UI / Popup | React 18 + TypeScript |
| Build | Vite (Popup) + esbuild (Content Script) via `build.mjs` |
| 3D / WebGL | Three.js r183 + custom GLSL Shaders |
| Verschlüsselung | WebCrypto API (AES-256-GCM + PBKDF2) |
| Storage | `chrome.storage.local` (kein `localStorage` — origin-isolated) |
| Isolation | Shadow DOM für Widget und Hintergrund-Container |
| Fonts | Space Grotesk (Popup), JetBrains Mono (Widget), Outfit |
| KI-Entwicklung | Claude Opus 4.6 & Claude Sonnet 4.6 (Anthropic) |

---

## Projektstruktur

```
src/
├── popup/                         # React Popup UI (chrome-extension://...)
│   ├── App.tsx                    # Haupt-App, koordiniert alle Sektionen
│   ├── main.tsx                   # ReactDOM Entry Point
│   ├── styles/popup.css           # Glassmorphism-Popup-Styles
│   └── components/
│       ├── Header.tsx             # Popup-Header mit Status-Indikator
│       ├── ThemeSection.tsx       # Theme-Auswahl (3 Karten)
│       ├── BackgroundSection.tsx  # Hintergrund-Effekt-Auswahl
│       ├── AutoLoginSection.tsx   # Auto-Login Toggle + Info
│       └── Toast.tsx              # Temporäre Statusmeldungen
│
├── content/                       # Content Script (läuft auf digikabu.de)
│   ├── index.tsx                  # Entry: Theme, Widget, Background mounten
│   ├── enhancer.ts                # DOM-Manipulationen (Termine, SVG-Stundenplan)
│   └── components/
│       ├── BackgroundEffect.tsx   # Switcher: LightPillar | FloatingLines | keine
│       ├── LightPillar.tsx        # WebGL GLSL Raymarching-Shader (Three.js)
│       ├── FloatingLines.tsx      # WebGL animierte Wellenlinien (Three.js)
│       ├── TimeWidget.tsx         # Live-Countdown + Schulschluss-Widget
│       └── SideDialog.tsx         # Dialog zur Seiten-Auswahl (Split-Stundenplan)
│
├── autologin/                     # Auto-Login Script (separates Bundle)
│   └── index.ts                   # AES-256-GCM Verschlüsselung + Form-Autofill
│
└── shared/                        # Geteilt zwischen Popup und Content Script
    ├── types.ts                   # TypeScript-Typen & Interfaces
    ├── storage.ts                 # chrome.storage.local Wrapper
    └── scheduleUtils.ts           # Stundenplan-Parsing & Zeitberechnungen

public/                            # Statische Assets (werden 1:1 nach dist/ kopiert)
├── manifest.json                  # Chrome Extension Manifest V3
├── content.css                    # Theme-CSS, direkt in digikabu.de injiziert
└── icons/                         # Extension Icons (16, 48, 128px)

build.mjs                          # Build-Script: Vite (Popup) + esbuild (Scripts)
```

---

## Setup & Build

### Voraussetzungen
- [Node.js](https://nodejs.org) v18 oder neuer
- npm (kommt mit Node.js)

### Installation

```bash
# Repository klonen
git clone https://github.com/DEIN-USERNAME/digikabu-enhancer.git
cd digikabu-enhancer

# Abhängigkeiten installieren
npm install
```

### Bauen

```bash
# Einmaliger Build → erzeugt dist/
npm run build

# Watcher-Modus (auto-rebuild bei Änderungen)
npm run dev
```

Der Build-Output landet in `dist/` und enthält:
- `dist/content.js` — Content Script (via esbuild gebündelt, IIFE-Format)
- `dist/autologin.js` — Auto-Login Script (via esbuild gebündelt)
- `dist/popup/` — React Popup (via Vite gebündelt)
- `dist/manifest.json`, `dist/content.css`, `dist/icons/` — Statische Assets aus `public/`

### In Chrome laden

1. `chrome://extensions/` öffnen
2. **Entwicklermodus** oben rechts aktivieren
3. **„Entpackte Erweiterung laden"** klicken → `dist/`-Ordner auswählen
4. Nach Code-Änderungen: Reload-Button (↻) bei der Extension klicken und ggf. den Digikabu-Tab neu laden

---

## Wichtige technische Details

### CSS-Override Strategie
Digikabu setzt inline `color: blue` / `color: red` direkt auf `<td>`-Elemente. Normale Klassen-Selektoren haben nicht genug Spezifizität, um das zu überschreiben. Die Lösung sind Attribut-Selektoren mit `!important`:

```css
/* In public/content.css */
td[style*="color: blue"] { color: #ff9f6b !important; }
td[style*="color: red"]  { color: #ff6b8a !important; }
```

### Storage: Warum kein localStorage?
Popup und Content Script laufen auf unterschiedlichen Origins (`chrome-extension://` vs `https://digikabu.de`). `localStorage` ist origin-isoliert — beide Seiten sehen jeweils ihren eigenen, getrennten Storage. Die Extension verwendet deshalb ausschließlich `chrome.storage.local`, das extension-weit geteilt wird.

### WebGL Z-Index Stacking
Ein `position: fixed` Canvas mit `z-index: 0` würde alle nicht-gestackten Seitenelemente überdecken, weil diese keinen eigenen Stacking Context haben. Die Lösung: WebGL-Canvas auf `z-index: -1`, und die wichtigsten Page-Container (`.container`, `#stdplan`, `#umgebung` etc.) bekommen explizit `position: relative; z-index: 1` per CSS, damit sie über dem Canvas liegen.

### Shadow DOM Isolation
Sowohl das Time Widget als auch der WebGL-Hintergrund-Container werden mit `attachShadow({ mode: 'open' })` in einem Shadow DOM isoliert. Das verhindert:
- CSS-Konflikte: Digikibus Bootstrap-Styles beeinflussen das Widget nicht
- Reverse-Konflikte: Extension-CSS greift nicht ungewollt in die Seite ein

### Glyphicon-Fonts
Bootstrap-Glyphicons (Icons in der Navbar etc.) verwenden eine spezielle `font-family: 'Glyphicons Halflings'`. Breite `font-family`-Overrides in den Theme-CSS-Variablen würden diese Icons in Fragezeichen verwandeln. Deshalb: `:not(.glyphicon)`-Ausschlüsse in Selektoren und explizites Wiederherstellen der Glyphicon-Schriftart.

---

## Über das Projekt

Entwickelt von **Paul Zipfel** (BSZ, Klasse FWI2) für BSZ-Schüler.

Das Projekt entstand mit Unterstützung von **[Claude Opus 4.6 & Claude Sonnet 4.6](https://claude.ai)** von Anthropic — von der Architektur über das Storage-System bis zum kompletten React-UI.

Die WebGL-Komponenten **LightPillar** und **FloatingLines** basieren auf Komponenten von [reactbits.dev](https://reactbits.dev) und wurden für die Extension angepasst und in das Theme-System integriert.

---

## Lizenz

MIT — mach damit was du willst.