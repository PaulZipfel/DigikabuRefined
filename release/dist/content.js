"use strict";
class DigikabuEnhancer {
    constructor() {
        this.settings = {
            theme: 'standard'
        };
        this.isInitialized = false;
        this.isActive = false;
        this.init();
    }
    async init() {
        if (this.isInitialized) {
            return;
        }
        await this.loadSettings();
        if (this.settings.theme === 'standard') {
            this.isActive = false;
            this.cleanupAll();
        }
        else {
            this.isActive = true;
            this.applyTheme();
        }
        this.setupMessageListener();
        this.isInitialized = true;
    }
    async loadSettings() {
        try {
            const savedTheme = localStorage.getItem('digikabu-theme');
            this.settings.theme = savedTheme || 'standard';
        }
        catch (error) {
            console.error('Fehler beim Laden der Settings:', error);
        }
    }
    async saveSettings() {
        try {
            localStorage.setItem('digikabu-theme', this.settings.theme);
        }
        catch (error) {
            console.error('Fehler beim Speichern der Settings:', error);
        }
    }
    applyTheme() {
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
    cleanupAll() {
        document.body.classList.remove('digikabu-dark', 'digikabu-dark-blue');
        this.removeAmbientAnimations();
        const extensionStyles = document.getElementById('digikabu-extension-styles');
        if (extensionStyles) {
            extensionStyles.remove();
        }
    }
    addAmbientAnimations() {
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
    removeAmbientAnimations() {
        const existingAmbient = document.getElementById('digikabu-ambient');
        if (existingAmbient) {
            existingAmbient.remove();
        }
    }
    changeTheme(theme) {
        const oldTheme = this.settings.theme;
        this.settings.theme = theme;
        if (theme === 'standard') {
            this.isActive = false;
            this.cleanupAll();
        }
        else if (oldTheme === 'standard') {
            this.isActive = true;
            this.applyTheme();
        }
        else {
            this.applyTheme();
        }
        this.saveSettings();
    }
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'changeTheme') {
                this.changeTheme(message.theme);
                sendResponse({
                    success: true,
                    theme: this.settings.theme,
                    active: this.isActive
                });
            }
            else if (message.action === 'getCurrentTheme') {
                sendResponse({
                    theme: this.settings.theme,
                    active: this.isActive
                });
            }
            else if (message.action === 'getStatus') {
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
const windowAny = window;
if (!windowAny.digikabuEnhancerLoaded) {
    windowAny.digikabuEnhancerLoaded = true;
    function initDigikabuEnhancer() {
        try {
            new DigikabuEnhancer();
        }
        catch (error) {
            console.error('Fehler beim Starten von Digikabu Enhancer:', error);
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDigikabuEnhancer);
    }
    else {
        initDigikabuEnhancer();
    }
}
