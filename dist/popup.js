"use strict";
class DigikabuPopup {
    constructor() {
        this.currentTheme = 'standard';
        this.isExtensionActive = false;
        this.init();
    }
    async init() {
        await this.loadCurrentTheme();
        this.updateActiveTheme();
        this.setupEventListeners();
        this.addRippleEffect();
        this.updateStatusDisplay();
    }
    async loadCurrentTheme() {
        try {
            const savedTheme = localStorage.getItem('digikabu-theme');
            this.currentTheme = savedTheme || 'standard';
            await this.loadExtensionStatus();
        }
        catch (error) {
            console.error('Fehler beim Laden des Themes:', error);
            this.currentTheme = 'standard';
            this.isExtensionActive = false;
        }
    }
    async loadExtensionStatus() {
        var _a;
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if ((_a = tabs[0]) === null || _a === void 0 ? void 0 : _a.id) {
                const response = await chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'getStatus'
                });
                if (response) {
                    this.currentTheme = response.theme || this.currentTheme;
                    this.isExtensionActive = response.active || false;
                }
            }
        }
        catch (error) {
            this.isExtensionActive = this.currentTheme !== 'standard';
        }
    }
    updateActiveTheme() {
        document.querySelectorAll('.theme-option').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeButton = document.querySelector(`[data-theme="${this.currentTheme}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }
    updateStatusDisplay() {
        const statusElement = document.getElementById('extension-status');
        if (statusElement) {
            if (this.currentTheme === 'standard') {
                statusElement.textContent = 'Extension inaktiv (Standard Theme)';
                statusElement.className = 'extension-status inactive';
            }
            else {
                statusElement.textContent = `Extension aktiv (${this.currentTheme} Theme)`;
                statusElement.className = 'extension-status active';
            }
        }
        this.updateThemeDescription();
    }
    updateThemeDescription() {
        const descElement = document.getElementById('theme-description');
        if (descElement) {
            const descriptions = {
                'standard': 'Originales digikabu.de Design - keine Änderungen',
                'dark': 'Dunkles Theme mit blauen Akzenten und Animationen',
                'dark-blue': 'Dunkelblaues Theme mit grünen Akzenten und GitHub-Stil'
            };
            descElement.textContent = descriptions[this.currentTheme] || 'Unbekanntes Theme';
        }
    }
    setupEventListeners() {
        document.querySelectorAll('.theme-option').forEach(button => {
            button.addEventListener('click', (e) => {
                const target = e.currentTarget;
                const theme = target.getAttribute('data-theme');
                if (theme) {
                    this.changeTheme(theme);
                }
            });
        });
    }
    async changeTheme(theme) {
        if (theme === this.currentTheme)
            return;
        const oldTheme = this.currentTheme;
        this.showStatus('Ändere Theme...', 'loading');
        localStorage.setItem('digikabu-theme', theme);
        this.currentTheme = theme;
        this.isExtensionActive = theme !== 'standard';
        this.updateActiveTheme();
        this.updateStatusDisplay();
        this.sendThemeMessage(theme);
        setTimeout(() => {
            if (theme === 'standard') {
                this.showStatus('Standard Theme aktiviert - Extension deaktiviert ✨', 'success');
            }
            else if (oldTheme === 'standard') {
                this.showStatus(`${theme} Theme aktiviert - Extension gestartet ✨`, 'success');
            }
            else {
                this.showStatus(`Theme zu "${theme}" gewechselt ✨`, 'success');
            }
        }, 500);
    }
    sendThemeMessage(theme) {
        chrome.tabs.query({ active: true, currentWindow: true })
            .then(tabs => {
            var _a;
            if ((_a = tabs[0]) === null || _a === void 0 ? void 0 : _a.id) {
                return chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'changeTheme',
                    theme: theme
                });
            }
        })
            .then((response) => {
            if (response) {
                this.isExtensionActive = response.active || false;
                this.updateStatusDisplay();
            }
        })
            .catch((error) => {
            setTimeout(() => {
                this.showStatus('Theme gespeichert - bitte Seite neu laden', 'info');
            }, 2000);
        });
    }
    showStatus(message, type) {
        const statusElement = document.getElementById('status');
        if (!statusElement)
            return;
        statusElement.className = 'status';
        statusElement.style.display = 'block';
        if (type === 'loading') {
            statusElement.innerHTML = '<div class="loading"></div>';
        }
        else {
            statusElement.textContent = message;
            statusElement.classList.add(type);
        }
        statusElement.classList.add('show');
        if (type !== 'loading') {
            setTimeout(() => {
                statusElement.classList.remove('show');
                setTimeout(() => {
                    statusElement.style.display = 'none';
                }, 300);
            }, 3000);
        }
    }
    addRippleEffect() {
        document.querySelectorAll('.theme-option').forEach(button => {
            button.addEventListener('click', (e) => {
                const mouseEvent = e;
                const rect = button.getBoundingClientRect();
                const ripple = document.createElement('span');
                const size = Math.max(rect.width, rect.height);
                const x = mouseEvent.clientX - rect.left - size / 2;
                const y = mouseEvent.clientY - rect.top - size / 2;
                ripple.classList.add('ripple');
                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = x + 'px';
                ripple.style.top = y + 'px';
                button.appendChild(ripple);
                setTimeout(() => {
                    ripple.remove();
                }, 600);
            });
        });
    }
    getDebugInfo() {
        return {
            currentTheme: this.currentTheme,
            isExtensionActive: this.isExtensionActive,
            timestamp: new Date().toISOString()
        };
    }
}
document.addEventListener('DOMContentLoaded', () => {
    const popup = new DigikabuPopup();
    window.digikabuPopup = popup;
});
