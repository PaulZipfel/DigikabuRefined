interface DigikabuSettings {
  theme: 'standard' | 'dark' | 'dark-blue';
}

interface TimeSlot {
  start: string;
  end: string;
  name: string;
}

interface CurrentPeriodInfo {
  period: TimeSlot | null;
  minutesRemaining: number;
  secondsRemaining: number;
  isInPeriod: boolean;
  nextPeriod: TimeSlot | null;
  minutesUntilNext: number;
  schoolEndTime: Date | null;
  minutesUntilSchoolEnd: number;
  currentPeriodType: string;
  currentPeriodEndTime: Date | null;
}

class DigikabuEnhancer {
  private settings: DigikabuSettings = {
    theme: 'standard'
  };
  private isInitialized = false;
  private isActive = false;
  private timeDisplayInterval?: number;
  private lastSchoolEndCheck = 0;

  private readonly timeSlots: TimeSlot[] = [
    { start: "08:30", end: "09:15", name: "1. Stunde" },
    { start: "09:15", end: "10:00", name: "2. Stunde" },
    { start: "10:15", end: "11:00", name: "3. Stunde" },
    { start: "11:00", end: "11:45", name: "4. Stunde" },
    { start: "11:45", end: "12:30", name: "5. Stunde" },
    { start: "12:30", end: "13:15", name: "6. Stunde" },
    { start: "13:15", end: "14:00", name: "7. Stunde" },
    { start: "14:00", end: "14:45", name: "8. Stunde" },
    { start: "14:45", end: "15:30", name: "9. Stunde" },
    { start: "15:30", end: "16:15", name: "10. Stunde" },
  ];

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    await this.loadSettings();
    
    if (this.settings.theme === 'standard') {
      this.isActive = false;
      this.cleanupAll();
    } else {
      this.isActive = true;
      this.applyTheme();
    }
    
    this.setupMessageListener();
    this.addTimeDisplay();
    this.isInitialized = true;
  }

  private async loadSettings(): Promise<void> {
    try {
      const savedTheme = localStorage.getItem('digikabu-theme');
      this.settings.theme = savedTheme as DigikabuSettings['theme'] || 'standard';
    } catch (error) {
      console.error('Fehler beim Laden der Settings:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      localStorage.setItem('digikabu-theme', this.settings.theme);
    } catch (error) {
      console.error('Fehler beim Speichern der Settings:', error);
    }
  }

  private applyTheme(): void {
    if (this.settings.theme === 'standard') {
      this.cleanupAll();
      this.isActive = false;
      return;
    }

    this.isActive = true;
    
    this.cleanupAll();
    
    const themeClass = this.settings.theme === 'dark-blue' ? 'digikabu-dark-blue' : `digikabu-${this.settings.theme}`;
    document.body.classList.add(themeClass);
    this.addAmbientAnimations();
  }

  private cleanupAll(): void {
    document.body.classList.remove('digikabu-dark', 'digikabu-dark-blue');
    this.removeAmbientAnimations();
    this.removeTimeDisplay();
    
    const extensionStyles = document.getElementById('digikabu-extension-styles');
    if (extensionStyles) {
      extensionStyles.remove();
    }
  }

  private addAmbientAnimations(): void {
    if (!this.isActive) {
      return;
    }

    if (document.getElementById('digikabu-ambient')) {
      return;
    }

    const ambientContainer = document.createElement('div');
    ambientContainer.id = 'digikabu-ambient';
    ambientContainer.className = 'digikabu-ambient-container';
    
    for (let i = 0; i < 6; i++) {
      const particle = document.createElement('div');
      particle.className = `digikabu-particle digikabu-particle-${i + 1}`;
      ambientContainer.appendChild(particle);
    }
    
    document.body.appendChild(ambientContainer);
  }

  private removeAmbientAnimations(): void {
    const existingAmbient = document.getElementById('digikabu-ambient');
    if (existingAmbient) {
      existingAmbient.remove();
    }
  }

  private parseTime(timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const now = new Date();
    const timeDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
    return timeDate;
  }

  private getActualLastPeriodFromSchedule(): TimeSlot | null {
    try {
      let highestEndSlotIndex = -1;
      const userSide = this.getUserSidePreference();

      const svgElements = Array.from(document.querySelectorAll('svg'));
      let hasSplitClass = false;
      
      for (const svg of svgElements) {
        const width = svg.getAttribute('width') || '';
        if (width === '50%') {
          hasSplitClass = true;
          break;
        }
      }

      if (hasSplitClass && userSide === null) {
        this.showSideSelectionDialog();
        return null;
      }
      
      for (const svg of svgElements) {
        const hasClasses = svg.querySelector('rect.std');
        if (!hasClasses) continue;

        const width = svg.getAttribute('width') || '';
        const xPos = svg.getAttribute('x') || '0%';
        const yPos = parseFloat(svg.getAttribute('y') || '0');
        const height = parseFloat(svg.getAttribute('height') || '60');
        
        if (height >= 300) continue;
        
        if (width === '50%') {
          if (userSide === 'left' && xPos !== '0%') continue;
          if (userSide === 'right' && xPos !== '50%') continue;
        }

        const endY = yPos + height;
        const endSlotIndex = Math.floor(endY / 60) - 1;
        
        if (endSlotIndex > highestEndSlotIndex && endSlotIndex >= 0 && endSlotIndex < this.timeSlots.length) {
          highestEndSlotIndex = endSlotIndex;
        }
      }

      if (highestEndSlotIndex >= 0) {
        return this.timeSlots[highestEndSlotIndex];
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private getUserSidePreference(): 'left' | 'right' | null {
    try {
      const saved = localStorage.getItem('digikabu-side-preference');
      return saved as 'left' | 'right' | null;
    } catch {
      return null;
    }
  }

  private showSideSelectionDialog(): void {
    if (document.getElementById('digikabu-side-dialog')) return;
    
    const overlay = document.createElement('div');
    overlay.id = 'digikabu-side-dialog';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    const isDark = document.body.classList.contains('digikabu-dark') || document.body.classList.contains('digikabu-dark-blue');
    const bgColor = isDark ? '#2d2d2d' : 'white';
    const textColor = isDark ? '#e0e0e0' : '#333';
    const buttonBg = isDark ? '#4db8ff' : '#007bff';
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: ${bgColor};
      color: ${textColor};
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 400px;
      margin: 20px;
    `;
    
    dialog.innerHTML = `
      <h3 style="margin: 0 0 15px 0; font-size: 18px;">Stundenplan-Auswahl</h3>
      <p style="margin: 0 0 25px 0; line-height: 1.4;">Deine Klasse ist geteilt. Welche Seite des Stundenplans betrifft dich?</p>
      <button id="side-left" style="margin: 0 10px; padding: 12px 24px; background: ${buttonBg}; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">Links</button>
      <button id="side-right" style="margin: 0 10px; padding: 12px 24px; background: ${buttonBg}; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">Rechts</button>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    dialog.querySelector('#side-left')?.addEventListener('click', () => {
      localStorage.setItem('digikabu-side-preference', 'left');
      document.body.removeChild(overlay);
      this.addTimeDisplay();
    });

    dialog.querySelector('#side-right')?.addEventListener('click', () => {
      localStorage.setItem('digikabu-side-preference', 'right');
      document.body.removeChild(overlay);
      this.addTimeDisplay();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
  }

  private getCurrentPeriodLengthFromSchedule(): { periods: number; endTime: Date | null; type: string } {
    try {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const userSide = this.getUserSidePreference();

      const svgElements = Array.from(document.querySelectorAll('svg'));
      
      for (const svg of svgElements) {
        const hasClasses = svg.querySelector('rect.std, rect.vertretStd');
        if (!hasClasses) continue;

        const width = svg.getAttribute('width') || '';
        const xPos = svg.getAttribute('x') || '0%';
        const yPos = parseFloat(svg.getAttribute('y') || '0');
        const height = parseFloat(svg.getAttribute('height') || '60');
        
        if (height >= 300) continue;
        
        if (width === '50%') {
          if (userSide === 'left' && xPos !== '0%') continue;
          if (userSide === 'right' && xPos !== '50%') continue;
        }

        const startSlotIndex = Math.floor(yPos / 60);
        const periods = Math.round(height / 60);
        const endSlotIndex = startSlotIndex + periods - 1;
        
        if (startSlotIndex >= 0 && startSlotIndex < this.timeSlots.length && 
            endSlotIndex >= 0 && endSlotIndex < this.timeSlots.length) {
          
          const startTime = this.parseTime(this.timeSlots[startSlotIndex].start);
          const endTime = this.parseTime(this.timeSlots[endSlotIndex].end);
          const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
          const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
          
          if (currentTime >= startMinutes && currentTime < endMinutes) {
            let type = 'Stunde';
            if (periods === 2) type = 'Doppelstunde';
            else if (periods === 3) type = 'Dreifachstunde';
            else if (periods > 3) type = `${periods}-Stunden-Block`;
            
            return {
              periods,
              endTime,
              type
            };
          }
        }
      }

      return { periods: 1, endTime: null, type: 'Stunde' };
    } catch (error) {
      return { periods: 1, endTime: null, type: 'Stunde' };
    }
  }

  private getSchoolEndTime(): Date {
    const actualLastPeriod = this.getActualLastPeriodFromSchedule();
    
    if (!actualLastPeriod) {
      console.warn('Stundenplan-Analyse fehlgeschlagen, nutze Fallback');
      this.debugScheduleAnalysis();
    }
    
    if (actualLastPeriod) {
      return this.parseTime(actualLastPeriod.end);
    }
    
    const lastSlot = this.timeSlots[this.timeSlots.length - 1];
    return this.parseTime(lastSlot.end);
  }

  private debugScheduleAnalysis(): void {
    console.log('=== STUNDENPLAN DEBUG ===');
    const userSide = this.getUserSidePreference();
    const svgElements = Array.from(document.querySelectorAll('svg'));
    
    console.log('User Seite:', userSide);
    console.log('SVG-Elemente gefunden:', svgElements.length);
    
    let validSVGs = 0;
    for (const svg of svgElements) {
      const hasClasses = svg.querySelector('rect.std');
      if (!hasClasses) continue;
      
      const width = svg.getAttribute('width') || '';
      const xPos = svg.getAttribute('x') || '0%';
      const yPos = parseFloat(svg.getAttribute('y') || '0');
      const height = parseFloat(svg.getAttribute('height') || '60');
      
      if (width === '50%') {
        if (userSide === 'left' && xPos !== '0%') continue;
        if (userSide === 'right' && xPos !== '50%') continue;
      }
      
      validSVGs++;
      const endY = yPos + height;
      const endSlotIndex = Math.floor(endY / 60) - 1;
      
      console.log(`SVG ${validSVGs}: width=${width}, x=${xPos}, y=${yPos}, h=${height} → endY=${endY}, slot=${endSlotIndex}, time=${this.timeSlots[endSlotIndex]?.end || 'invalid'}`);
    }
    
    console.log('Gültige SVGs nach Filterung:', validSVGs);
    console.log('=== DEBUG ENDE ===');
  }

  private getCurrentPeriodInfo(): CurrentPeriodInfo {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    let currentPeriod: TimeSlot | null = null;
    let nextPeriod: TimeSlot | null = null;
    let minutesRemaining = 0;
    let secondsRemaining = 0;
    let minutesUntilNext = 0;
    
    const schoolEndTime = this.getSchoolEndTime();
    const diffMsToSchoolEnd = schoolEndTime.getTime() - now.getTime();
    const minutesUntilSchoolEnd = Math.max(0, Math.floor(diffMsToSchoolEnd / (1000 * 60)));

    const periodLength = this.getCurrentPeriodLengthFromSchedule();
    let currentPeriodEndTime: Date | null = null;

    for (const slot of this.timeSlots) {
      const startTime = this.parseTime(slot.start);
      const endTime = this.parseTime(slot.end);
      const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
      const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();

      if (currentTime >= startMinutes && currentTime < endMinutes) {
        currentPeriod = slot;
        
        if (periodLength.endTime) {
          currentPeriodEndTime = periodLength.endTime;
          const diffMs = periodLength.endTime.getTime() - now.getTime();
          minutesRemaining = Math.floor(diffMs / (1000 * 60));
          secondsRemaining = Math.floor((diffMs % (1000 * 60)) / 1000);
        } else {
          currentPeriodEndTime = endTime;
          const diffMs = endTime.getTime() - now.getTime();
          minutesRemaining = Math.floor(diffMs / (1000 * 60));
          secondsRemaining = Math.floor((diffMs % (1000 * 60)) / 1000);
        }
        break;
      }
    }

    for (const slot of this.timeSlots) {
      const startTime = this.parseTime(slot.start);
      const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
      
      if (startMinutes > currentTime) {
        nextPeriod = slot;
        minutesUntilNext = startMinutes - currentTime;
        break;
      }
    }

    return {
      period: currentPeriod,
      minutesRemaining: Math.max(0, minutesRemaining),
      secondsRemaining: Math.max(0, secondsRemaining),
      isInPeriod: currentPeriod !== null,
      nextPeriod,
      minutesUntilNext,
      schoolEndTime,
      minutesUntilSchoolEnd,
      currentPeriodType: periodLength.type,
      currentPeriodEndTime
    };
  }

  private formatTimeRemaining(totalMinutes: number, seconds: number): string {
    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours.toString().padStart(1, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${totalMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  private formatMinutesToHours(totalMinutes: number): string {
    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}:${minutes.toString().padStart(2, '0')}h`;
    } else {
      return `${totalMinutes} Min`;
    }
  }

  private checkForSchoolEndCelebration(): void {
    const periodInfo = this.getCurrentPeriodInfo();
    if (!periodInfo.schoolEndTime) return;

    const now = new Date();
    const schoolEndTime = periodInfo.schoolEndTime;
    const timeDiff = now.getTime() - schoolEndTime.getTime();
    
    const today = now.toDateString();
    const lastCelebrationDate = localStorage.getItem('digikabu-last-celebration');
    
    if (timeDiff >= 0 && timeDiff <= 60000 && lastCelebrationDate !== today) {
      localStorage.setItem('digikabu-last-celebration', today);
      this.showSchoolEndCelebration();
    }
  }

  private showSchoolEndCelebration(): void {
    if (document.getElementById('digikabu-celebration')) return;

    const celebration = document.createElement('div');
    celebration.id = 'digikabu-celebration';
    celebration.innerHTML = `
      <div class="celebration-message">
        <h2>🎉 Schultag beendet! 🎉</h2>
        <p>Enjoy your free time! 🚀</p>
      </div>
    `;

    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + 'vw';
      confetti.style.animationDelay = Math.random() * 3 + 's';
      confetti.style.backgroundColor = this.getRandomColor();
      celebration.appendChild(confetti);
    }

    for (let i = 0; i < 8; i++) {
      const firework = document.createElement('div');
      firework.className = 'firework';
      firework.style.left = Math.random() * 80 + 10 + 'vw';
      firework.style.top = Math.random() * 50 + 20 + 'vh';
      firework.style.animationDelay = Math.random() * 2 + 's';
      celebration.appendChild(firework);
    }

    this.injectCelebrationStyles();
    document.body.appendChild(celebration);

    setTimeout(() => {
      if (celebration.parentNode) {
        celebration.parentNode.removeChild(celebration);
      }
      this.removeCelebrationStyles();
    }, 10000);
  }

  private getRandomColor(): string {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6c5ce7', '#a29bfe', '#fd79a8', '#00b894'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private injectCelebrationStyles(): void {
    if (document.getElementById('digikabu-celebration-styles')) return;

    const styleElement = document.createElement('style');
    styleElement.id = 'digikabu-celebration-styles';
    styleElement.textContent = `
      #digikabu-celebration {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 10000;
        pointer-events: none;
        overflow: hidden;
      }

      .celebration-message {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 30px;
        border-radius: 20px;
        animation: celebrationBounce 1s ease-out;
        backdrop-filter: blur(10px);
        box-shadow: 0 0 30px rgba(255, 255, 255, 0.3);
      }

      .celebration-message h2 {
        font-size: 2.5rem;
        margin: 0 0 10px 0;
        color: #ffd700 !important;
        text-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
        animation: glow 2s ease-in-out infinite alternate;
      }

      .celebration-message p {
        font-size: 1.2rem;
        margin: 0;
        color: #fff !important;
      }

      @keyframes celebrationBounce {
        0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
        50% { transform: translate(-50%, -50%) scale(1.1); }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      }

      @keyframes glow {
        from { text-shadow: 0 0 20px rgba(255, 215, 0, 0.8); }
        to { text-shadow: 0 0 30px rgba(255, 215, 0, 1), 0 0 40px rgba(255, 215, 0, 0.6); }
      }

      .confetti {
        position: absolute;
        width: 10px;
        height: 10px;
        top: -10px;
        animation: confettiFall 3s linear infinite;
        transform-origin: center;
      }

      @keyframes confettiFall {
        0% {
          transform: translateY(-10vh) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translateY(110vh) rotate(720deg);
          opacity: 0;
        }
      }

      .firework {
        position: absolute;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        animation: fireworkExplode 2s ease-out infinite;
      }

      @keyframes fireworkExplode {
        0% {
          transform: scale(1);
          opacity: 1;
          box-shadow: 
            0 0 0 0 #ff6b6b,
            0 0 0 0 #4ecdc4,
            0 0 0 0 #45b7d1,
            0 0 0 0 #f9ca24,
            0 0 0 0 #f0932b,
            0 0 0 0 #eb4d4b,
            0 0 0 0 #6c5ce7,
            0 0 0 0 #a29bfe;
        }
        50% {
          transform: scale(1);
          opacity: 1;
          box-shadow: 
            30px 0 0 2px #ff6b6b,
            -30px 0 0 2px #4ecdc4,
            0 30px 0 2px #45b7d1,
            0 -30px 0 2px #f9ca24,
            21px 21px 0 2px #f0932b,
            -21px -21px 0 2px #eb4d4b,
            -21px 21px 0 2px #6c5ce7,
            21px -21px 0 2px #a29bfe;
        }
        100% {
          transform: scale(1);
          opacity: 0;
          box-shadow: 
            50px 0 0 4px transparent,
            -50px 0 0 4px transparent,
            0 50px 0 4px transparent,
            0 -50px 0 4px transparent,
            35px 35px 0 4px transparent,
            -35px -35px 0 4px transparent,
            -35px 35px 0 4px transparent,
            35px -35px 0 4px transparent;
        }
      }

      @media (max-width: 768px) {
        .celebration-message h2 {
          font-size: 2rem;
        }
        .celebration-message p {
          font-size: 1rem;
        }
        .celebration-message {
          padding: 20px;
          margin: 20px;
        }
      }
    `;
    
    document.head.appendChild(styleElement);
  }

  private removeCelebrationStyles(): void {
    const existingStyles = document.getElementById('digikabu-celebration-styles');
    if (existingStyles) {
      existingStyles.remove();
    }
  }

  private addTimeDisplay(): void {
    this.removeTimeDisplay();

    const currentUrl = window.location.href;
    let targetElement: Element | null = null;
    let insertPosition: 'after' | 'inside' = 'after';
    let position: 'main' | 'stundenplan' | null = null;

    if (currentUrl.includes('/Main')) {
      const h3Elements = Array.from(document.querySelectorAll('h3'));
      for (const h3 of h3Elements) {
        if (h3.textContent?.includes('Aktuelle Termine')) {
          targetElement = h3;
          insertPosition = 'inside';
          position = 'main';
          break;
        }
      }
      
      if (!targetElement) {
        const forms = Array.from(document.querySelectorAll('form[method="get"][action="/Main"]'));
        for (const form of forms) {
          const centerBlock = form.querySelector('.center-block');
          if (centerBlock && (centerBlock.textContent?.includes('Mo,') || centerBlock?.textContent?.includes('Di,') || centerBlock?.textContent?.includes('Mi,') || centerBlock?.textContent?.includes('Do,') || centerBlock?.textContent?.includes('Fr,') || centerBlock?.textContent?.includes('Sa,') || centerBlock?.textContent?.includes('So,'))) {
            targetElement = form;
            insertPosition = 'after';
            position = 'main';
            break;
          }
        }
      }
    } else if (currentUrl.includes('/Stundenplan/Klasse')) {
      targetElement = document.getElementById('stdplanheading');
      if (targetElement) {
        insertPosition = 'after';
        position = 'stundenplan';
      }
    }

    if (!targetElement) {
      return;
    }

    const timeDisplay = document.createElement('div');
    timeDisplay.id = 'digikabu-time-display';
    timeDisplay.className = `digikabu-time-display digikabu-time-display-${position}`;
    
    this.injectTimeDisplayStyles();
    
    if (insertPosition === 'after') {
      targetElement.parentNode?.insertBefore(timeDisplay, targetElement.nextSibling);
    } else if (insertPosition === 'inside' && targetElement.tagName === 'H3') {
      targetElement.parentNode?.insertBefore(timeDisplay, targetElement);
    } else {
      targetElement.appendChild(timeDisplay);
    }

    this.updateTimeDisplay();
    this.timeDisplayInterval = window.setInterval(() => {
      this.updateTimeDisplay();
    }, 1000);
  }

  private injectTimeDisplayStyles(): void {
    if (document.getElementById('digikabu-time-styles')) {
      return;
    }

    const styleElement = document.createElement('style');
    styleElement.id = 'digikabu-time-styles';
    styleElement.textContent = `
      .digikabu-time-display {
        margin: 20px 0;
        padding: 15px 20px;
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        backdrop-filter: blur(10px);
        border: 2px solid transparent;
        transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        position: relative;
        overflow: hidden;
      }

      .digikabu-time-display-main {
        text-align: center;
        max-width: 400px;
        margin: 20px auto;
      }

      .digikabu-time-display-stundenplan {
        display: inline-block;
        margin-left: 20px;
        vertical-align: top;
      }

      .digikabu-time-header {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .digikabu-time-content {
        font-size: 24px;
        font-weight: 700;
        margin-bottom: 5px;
        font-family: 'Courier New', monospace;
        letter-spacing: 1px;
      }

      .digikabu-time-subtext {
        font-size: 12px;
        opacity: 0.8;
        font-weight: 500;
      }

      .digikabu-time-icon {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: inline-block;
        animation: pulse 2s ease-in-out infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.1); }
      }

      body:not(.digikabu-dark):not(.digikabu-dark-blue) .digikabu-time-display {
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        border-color: #cbd5e1;
        color: #1e293b;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      }

      body:not(.digikabu-dark):not(.digikabu-dark-blue) .digikabu-time-icon {
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      }

      body.digikabu-dark .digikabu-time-display {
        background: linear-gradient(135deg, rgba(45, 45, 45, 0.9) 0%, rgba(26, 26, 26, 0.9) 100%);
        border-color: #4db8ff;
        color: #e0e0e0;
        box-shadow: 0 4px 20px rgba(77, 184, 255, 0.2), 0 0 30px rgba(77, 184, 255, 0.1);
      }

      body.digikabu-dark .digikabu-time-icon {
        background: linear-gradient(135deg, #4db8ff, #0d7377);
      }

      body.digikabu-dark .digikabu-time-display:hover {
        border-color: #66c2ff;
        box-shadow: 0 6px 25px rgba(77, 184, 255, 0.3), 0 0 40px rgba(77, 184, 255, 0.15);
        transform: translateY(-1px);
      }

      body.digikabu-dark-blue .digikabu-time-display {
        background: linear-gradient(135deg, rgba(22, 27, 34, 0.9) 0%, rgba(13, 17, 23, 0.9) 100%);
        border-color: #58a6ff;
        color: #c9d1d9;
        box-shadow: 0 4px 20px rgba(88, 166, 255, 0.2), 0 0 30px rgba(88, 166, 255, 0.1);
      }

      body.digikabu-dark-blue .digikabu-time-icon {
        background: linear-gradient(135deg, #58a6ff, #238636);
      }

      body.digikabu-dark-blue .digikabu-time-display:hover {
        border-color: #79c0ff;
        box-shadow: 0 6px 25px rgba(88, 166, 255, 0.3), 0 0 40px rgba(88, 166, 255, 0.15);
        transform: translateY(-1px);
      }

      @media (max-width: 768px) {
        .digikabu-time-display-main {
          margin: 15px 10px;
          padding: 12px 16px;
        }

        .digikabu-time-display-stundenplan {
          display: block;
          margin: 15px 0 0 0;
        }

        .digikabu-time-content {
          font-size: 20px;
        }

        .digikabu-time-header {
          font-size: 14px;
        }
      }

      .digikabu-time-content.updating {
        animation: timeUpdate 0.5s ease-in-out;
      }

      @keyframes timeUpdate {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
    `;
    
    document.head.appendChild(styleElement);
  }

  private updateTimeDisplay(): void {
    const timeDisplay = document.getElementById('digikabu-time-display');
    if (!timeDisplay) {
      return;
    }

    const periodInfo = this.getCurrentPeriodInfo();
    const timeContent = timeDisplay.querySelector('.digikabu-time-content');
    
    if (timeContent) {
      timeContent.classList.add('updating');
      setTimeout(() => timeContent.classList.remove('updating'), 500);
    }

    this.checkForSchoolEndCelebration();

    if (periodInfo.isInPeriod && periodInfo.period) {
      const minutes = periodInfo.minutesRemaining;
      const seconds = periodInfo.secondsRemaining;
      const formattedTime = this.formatTimeRemaining(minutes, seconds);
      
      const schoolEndStr = periodInfo.schoolEndTime?.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) || '';
      const schoolEndFormatted = this.formatMinutesToHours(periodInfo.minutesUntilSchoolEnd);
      const periodEndTime = periodInfo.currentPeriodEndTime?.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) || periodInfo.period.end;
      
      timeDisplay.innerHTML = `
        <div class="digikabu-time-header">
          <span class="digikabu-time-icon"></span>
          Aktuelle ${periodInfo.currentPeriodType}: ${periodInfo.period.name}
        </div>
        <div class="digikabu-time-content">
          ${formattedTime}
        </div>
        <div class="digikabu-time-subtext">
          verbleibend bis ${periodInfo.currentPeriodType}ende (${periodEndTime} Uhr)<br>
          Schulschluss: ${schoolEndStr} Uhr (${schoolEndFormatted})
        </div>
      `;
    } else if (periodInfo.nextPeriod && periodInfo.minutesUntilNext > 0 && periodInfo.minutesUntilNext < 60) {
      const schoolEndStr = periodInfo.schoolEndTime?.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) || '';
      const schoolEndFormatted = this.formatMinutesToHours(periodInfo.minutesUntilSchoolEnd);
      
      timeDisplay.innerHTML = `
        <div class="digikabu-time-header">
          <span class="digikabu-time-icon"></span>
          Pause
        </div>
        <div class="digikabu-time-content">
          ${periodInfo.minutesUntilNext} Min
        </div>
        <div class="digikabu-time-subtext">
          bis ${periodInfo.nextPeriod.name} (${periodInfo.nextPeriod.start} Uhr)<br>
          Schulschluss: ${schoolEndStr} Uhr (${schoolEndFormatted})
        </div>
      `;
    } else {
      const now = new Date();
      const timeString = now.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      const schoolEndStr = periodInfo.schoolEndTime?.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) || '';
      const schoolEndFormatted = this.formatMinutesToHours(periodInfo.minutesUntilSchoolEnd);
      
      timeDisplay.innerHTML = `
        <div class="digikabu-time-header">
          <span class="digikabu-time-icon"></span>
          Aktuelle Zeit
        </div>
        <div class="digikabu-time-content">
          ${timeString}
        </div>
        <div class="digikabu-time-subtext">
          ${periodInfo.nextPeriod ? `Nächste Stunde: ${periodInfo.nextPeriod.name} um ${periodInfo.nextPeriod.start} Uhr<br>` : ''}
          ${schoolEndStr ? `Schulschluss: ${schoolEndStr} Uhr (${schoolEndFormatted})` : 'Kein Unterricht heute'}
        </div>
      `;
    }
  }

  private removeTimeDisplay(): void {
    const existingDisplay = document.getElementById('digikabu-time-display');
    if (existingDisplay) {
      existingDisplay.remove();
    }

    const existingStyles = document.getElementById('digikabu-time-styles');
    if (existingStyles) {
      existingStyles.remove();
    }

    if (this.timeDisplayInterval) {
      clearInterval(this.timeDisplayInterval);
      this.timeDisplayInterval = undefined;
    }
  }

  private changeTheme(theme: DigikabuSettings['theme']): void {    
    const oldTheme = this.settings.theme;
    this.settings.theme = theme;
    
    if (theme === 'standard') {
      this.isActive = false;
      this.cleanupAll();
    } else {
      this.isActive = true;
      this.applyTheme();
      this.addTimeDisplay();
    }
    
    this.saveSettings();
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      
      if (message.action === 'changeTheme') {
        this.changeTheme(message.theme);
        sendResponse({ 
          success: true, 
          theme: this.settings.theme,
          active: this.isActive 
        });
      } else if (message.action === 'getCurrentTheme') {
        sendResponse({ 
          theme: this.settings.theme,
          active: this.isActive 
        });
      } else if (message.action === 'getStatus') {
        sendResponse({
          theme: this.settings.theme,
          active: this.isActive,
          initialized: this.isInitialized
        });
      } else if (message.action === 'setAutoLogin') {
        const contentWindow = window as any;
        if (contentWindow.digikabuAutoLogin) {
          contentWindow.digikabuAutoLogin.enableAutoLogin(message.enabled);
        }
        sendResponse({ success: true });
      } else if (message.action === 'clearCredentials') {
        const contentWindow = window as any;
        if (contentWindow.digikabuAutoLogin) {
          contentWindow.digikabuAutoLogin.clearStoredCredentials();
        }
        sendResponse({ success: true });
      }
      
      return true;
    });
  }
}

const contentWindow = window as any;

if (!contentWindow.digikabuEnhancerLoaded) {
  contentWindow.digikabuEnhancerLoaded = true;
  
  function initDigikabuEnhancer() {
    try {
      new DigikabuEnhancer();
    } catch (error) {
      console.error('Fehler beim Starten von Digikabu Enhancer:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDigikabuEnhancer);
  } else {
    initDigikabuEnhancer();
  }
}