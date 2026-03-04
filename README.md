# Advanced Digikabu Refined v2.0 — React Edition

Komplett neu aufgebaut mit React + TypeScript + Vite.

## Setup

### 1. Node.js installieren (v18+)
https://nodejs.org

### 2. Dependencies installieren
```bash
npm install
```

### 3. Bauen
```bash
npm run build   # Einmalig
npm run dev     # Watcher (auto-rebuild)
```

### 4. In Chrome laden
1. chrome://extensions/ öffnen
2. "Entwicklermodus" aktivieren
3. "Entpackte Erweiterung laden" → dist/ Ordner wählen
4. Nach Änderungen: Reload-Button bei der Extension klicken

## Struktur
- src/popup/ — React-Popup UI
- src/content/ — Content Script + Time Widget (Shadow DOM)
- src/autologin/ — AES-256 Auto-Login
- src/shared/ — Typen, Storage, Stundenplan-Analyse
- src/content/content.css — Theme-CSS (dark, dark-blue)
