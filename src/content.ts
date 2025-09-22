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
}

class DigikabuEnhancer {
  private settings: DigikabuSettings = {
    theme: 'standard'
  };
  private isInitialized = false;
  private isActive = false;
  private timeDisplayInterval?: number;

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

  private getCurrentPeriodInfo(): CurrentPeriodInfo {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    let currentPeriod: TimeSlot | null = null;
    let nextPeriod: TimeSlot | null = null;
    let minutesRemaining = 0;
    let secondsRemaining = 0;
    let minutesUntilNext = 0;

    for (const slot of this.timeSlots) {
      const startTime = this.parseTime(slot.start);
      const endTime = this.parseTime(slot.end);
      const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
      const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();

      if (currentTime >= startMinutes && currentTime < endMinutes) {
        currentPeriod = slot;
        const schoolEndTime = this.getSchoolEndTime();
        const diffMs = schoolEndTime.getTime() - now.getTime();
        minutesRemaining = Math.floor(diffMs / (1000 * 60));
        secondsRemaining = Math.floor((diffMs % (1000 * 60)) / 1000);
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
      minutesUntilNext
    };
  }

  private getSchoolEndTime(): Date {
    const lastSlot = this.timeSlots[this.timeSlots.length - 1];
    return this.parseTime(lastSlot.end);
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

  private addTimeDisplay(): void {
    this.removeTimeDisplay();

    const currentUrl = window.location.href;
    let targetElement: Element | null = null;
    let insertPosition: 'after' | 'inside' = 'after';
    let position: 'main' | 'stundenplan' | null = null;

    if (currentUrl.includes('/Main')) {
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

    if (periodInfo.isInPeriod && periodInfo.period) {
      const minutes = periodInfo.minutesRemaining;
      const seconds = periodInfo.secondsRemaining;
      const schoolEnd = this.getSchoolEndTime();
      const schoolEndTimeStr = schoolEnd.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      const formattedTime = this.formatTimeRemaining(minutes, seconds);
      
      timeDisplay.innerHTML = `
        <div class="digikabu-time-header">
          <span class="digikabu-time-icon"></span>
          Aktuelle Stunde: ${periodInfo.period.name}
        </div>
        <div class="digikabu-time-content">
          ${formattedTime}
        </div>
        <div class="digikabu-time-subtext">
          verbleibend bis Unterrichtsschluss ${schoolEndTimeStr} Uhr
        </div>
      `;
    } else if (periodInfo.nextPeriod && periodInfo.minutesUntilNext > 0 && periodInfo.minutesUntilNext < 60) {
      timeDisplay.innerHTML = `
        <div class="digikabu-time-header">
          <span class="digikabu-time-icon"></span>
          Pause
        </div>
        <div class="digikabu-time-content">
          ${periodInfo.minutesUntilNext} Min
        </div>
        <div class="digikabu-time-subtext">
          bis ${periodInfo.nextPeriod.name} (${periodInfo.nextPeriod.start} Uhr)
        </div>
      `;
    } else {
      const now = new Date();
      const timeString = now.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      timeDisplay.innerHTML = `
        <div class="digikabu-time-header">
          <span class="digikabu-time-icon"></span>
          Aktuelle Zeit
        </div>
        <div class="digikabu-time-content">
          ${timeString}
        </div>
        <div class="digikabu-time-subtext">
          ${periodInfo.nextPeriod ? `Nächste Stunde: ${periodInfo.nextPeriod.name} um ${periodInfo.nextPeriod.start} Uhr` : 'Kein Unterricht heute'}
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
    }
    else if (oldTheme === 'standard') {
      this.isActive = true;
      this.applyTheme();
      this.addTimeDisplay();
    }
    else {
      this.applyTheme();
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
      }
      
      return true;
    });
  }
}

const windowAny = window as any;

if (!windowAny.digikabuEnhancerLoaded) {
  windowAny.digikabuEnhancerLoaded = true;
  
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