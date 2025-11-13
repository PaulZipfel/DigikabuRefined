"use strict";
class DigikabuPopup {
    constructor() {
        this.currentTheme = 'standard';
        this.isExtensionActive = false;
        this.autoLoginEnabled = false;
        this.init();
    }
    async init() {
        await this.loadCurrentTheme();
        await this.loadAutoLoginSettings();
        this.updateActiveTheme();
        this.setupEventListeners();
        this.addRippleEffect();
        this.updateStatusDisplay();
        this.updateAutoLoginUI();
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
    async loadAutoLoginSettings() {
        try {
            const autoLoginSetting = localStorage.getItem('digikabu-autologin-enabled');
            this.autoLoginEnabled = autoLoginSetting === 'true';
        }
        catch (error) {
            console.error('Fehler beim Laden der AutoLogin-Einstellungen:', error);
            this.autoLoginEnabled = false;
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
    updateAutoLoginUI() {
        const toggle = document.getElementById('autologin-toggle');
        const securityNote = document.getElementById('security-note');
        if (toggle) {
            if (this.autoLoginEnabled) {
                toggle.classList.add('active');
            }
            else {
                toggle.classList.remove('active');
            }
        }
        if (securityNote) {
            if (this.autoLoginEnabled) {
                securityNote.classList.add('visible');
            }
            else {
                securityNote.classList.remove('visible');
            }
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
        const autoLoginToggle = document.getElementById('autologin-toggle');
        if (autoLoginToggle) {
            autoLoginToggle.addEventListener('click', () => {
                this.toggleAutoLogin();
            });
        }
    }
    async toggleAutoLogin() {
        this.autoLoginEnabled = !this.autoLoginEnabled;
        try {
            localStorage.setItem('digikabu-autologin-enabled', this.autoLoginEnabled.toString());
            this.updateAutoLoginUI();
            await this.sendAutoLoginMessage();
            if (this.autoLoginEnabled) {
                this.showStatus('Auto-Login aktiviert ✨', 'success');
            }
            else {
                this.showStatus('Auto-Login deaktiviert', 'info');
                await this.clearStoredCredentials();
            }
        }
        catch (error) {
            console.error('Fehler beim Ändern der AutoLogin-Einstellung:', error);
            this.autoLoginEnabled = !this.autoLoginEnabled;
            this.updateAutoLoginUI();
            this.showStatus('Fehler beim Ändern der Einstellung', 'error');
        }
    }
    async sendAutoLoginMessage() {
        var _a;
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if ((_a = tabs[0]) === null || _a === void 0 ? void 0 : _a.id) {
                await chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'setAutoLogin',
                    enabled: this.autoLoginEnabled
                });
            }
        }
        catch (error) {
            console.error('Fehler beim Senden der AutoLogin-Nachricht:', error);
        }
    }
    async clearStoredCredentials() {
        var _a;
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if ((_a = tabs[0]) === null || _a === void 0 ? void 0 : _a.id) {
                await chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'clearCredentials'
                });
            }
        }
        catch (error) {
            console.error('Fehler beim Löschen der gespeicherten Daten:', error);
        }
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
            autoLoginEnabled: this.autoLoginEnabled,
            timestamp: new Date().toISOString()
        };
    }
}
document.addEventListener('DOMContentLoaded', () => {
    const popup = new DigikabuPopup();
    window.digikabuPopup = popup;
});
