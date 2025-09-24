"use strict";
class DigikabuSecureAutoLogin {
    constructor() {
        this.STORAGE_KEY = 'dkb_al_sec';
        this.SETTINGS_KEY = 'dkb_al_en';
        this.masterKey = null;
        this.init();
    }
    async init() {
        if (this.shouldRunAutoLogin()) {
            await this.handleAutoLogin();
        }
        this.setupFormListeners();
    }
    shouldRunAutoLogin() {
        const currentUrl = window.location.href;
        return (currentUrl.includes('digikabu.de/') || currentUrl.includes('digikabu.de/login')) &&
            this.isAutoLoginEnabled();
    }
    isAutoLoginEnabled() {
        try {
            return localStorage.getItem(this.SETTINGS_KEY) === 'true';
        }
        catch (_a) {
            return false;
        }
    }
    async enableAutoLogin(enable) {
        try {
            localStorage.setItem(this.SETTINGS_KEY, enable.toString());
            if (!enable) {
                await this.clearStoredCredentials();
                this.masterKey = null;
            }
        }
        catch (error) {
            console.error('Failed to save auto-login setting:', error);
        }
    }
    getAutoLoginStatus() {
        return this.isAutoLoginEnabled();
    }
    async generateMasterKey() {
        if (this.masterKey)
            return this.masterKey;
        const browserInfo = await this.getBrowserFingerprint();
        const keyMaterial = await window.crypto.subtle.importKey('raw', new TextEncoder().encode(browserInfo), { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']);
        this.masterKey = await window.crypto.subtle.deriveKey({
            name: 'PBKDF2',
            salt: new TextEncoder().encode(`${browserInfo}-salt-${Date.now()}`),
            iterations: 250000,
            hash: 'SHA-256'
        }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
        return this.masterKey;
    }
    async getBrowserFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        let canvasData = 'fallback';
        if (ctx) {
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('Browser fingerprint', 2, 2);
            canvasData = canvas.toDataURL();
        }
        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset().toString(),
            canvasData,
            navigator.hardwareConcurrency || 'unknown',
            navigator.deviceMemory || 'unknown'
        ].join('|');
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprint));
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    async encryptData(data) {
        try {
            const salt = crypto.getRandomValues(new Uint8Array(32));
            const iv = crypto.getRandomValues(new Uint8Array(16));
            const baseKey = await this.generateMasterKey();
            const derivedKey = await window.crypto.subtle.deriveKey({
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            }, await window.crypto.subtle.importKey('raw', await window.crypto.subtle.exportKey('raw', baseKey), { name: 'PBKDF2' }, false, ['deriveKey']), { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
            const encodedData = new TextEncoder().encode(data);
            const encryptedData = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, derivedKey, encodedData);
            return {
                data: btoa(String.fromCharCode(...new Uint8Array(encryptedData))),
                iv: btoa(String.fromCharCode(...iv)),
                salt: btoa(String.fromCharCode(...salt)),
                timestamp: Date.now()
            };
        }
        catch (error) {
            console.error('Encryption failed:', error);
            throw error;
        }
    }
    async decryptData(secureData) {
        try {
            if (Date.now() - secureData.timestamp > 30 * 24 * 60 * 60 * 1000) {
                throw new Error('Data expired');
            }
            const salt = new Uint8Array(atob(secureData.salt).split('').map(char => char.charCodeAt(0)));
            const iv = new Uint8Array(atob(secureData.iv).split('').map(char => char.charCodeAt(0)));
            const data = new Uint8Array(atob(secureData.data).split('').map(char => char.charCodeAt(0)));
            const baseKey = await this.generateMasterKey();
            const derivedKey = await window.crypto.subtle.deriveKey({
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            }, await window.crypto.subtle.importKey('raw', await window.crypto.subtle.exportKey('raw', baseKey), { name: 'PBKDF2' }, false, ['deriveKey']), { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
            const decryptedData = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, derivedKey, data);
            return new TextDecoder().decode(decryptedData);
        }
        catch (error) {
            console.error('Decryption failed:', error);
            throw error;
        }
    }
    async saveCredentials(username, password) {
        if (!username || !password)
            return;
        try {
            const credentials = { username, password };
            const encryptedStorage = await this.encryptData(JSON.stringify(credentials));
            await chrome.storage.local.set({
                [this.STORAGE_KEY]: JSON.stringify(encryptedStorage)
            });
        }
        catch (error) {
            console.error('Failed to save credentials:', error);
        }
    }
    async getStoredCredentials() {
        try {
            const result = await chrome.storage.local.get([this.STORAGE_KEY]);
            const encryptedData = result[this.STORAGE_KEY];
            if (!encryptedData)
                return null;
            const secureStorage = JSON.parse(encryptedData);
            const decryptedData = await this.decryptData(secureStorage);
            return JSON.parse(decryptedData);
        }
        catch (error) {
            console.error('Failed to retrieve credentials:', error);
            await this.clearStoredCredentials();
            return null;
        }
    }
    async handleAutoLogin() {
        await this.waitForFormElements();
        const usernameField = document.getElementById('UserName');
        const passwordField = document.getElementById('Password');
        const loginButton = document.querySelector('button.btn.btn-primary[type="submit"]');
        if (!usernameField || !passwordField || !loginButton)
            return;
        if (usernameField.value && passwordField.value) {
            this.autoSubmitForm(loginButton);
            return;
        }
        const credentials = await this.getStoredCredentials();
        if (!credentials)
            return;
        this.fillAndSubmitForm(usernameField, passwordField, loginButton, credentials);
    }
    async waitForFormElements() {
        return new Promise((resolve) => {
            const checkForElements = () => {
                const usernameField = document.getElementById('UserName');
                const passwordField = document.getElementById('Password');
                const loginButton = document.querySelector('button.btn.btn-primary[type="submit"]');
                if (usernameField && passwordField && loginButton) {
                    resolve();
                }
                else {
                    setTimeout(checkForElements, 100);
                }
            };
            checkForElements();
        });
    }
    fillAndSubmitForm(usernameField, passwordField, loginButton, credentials) {
        usernameField.value = credentials.username;
        passwordField.value = credentials.password;
        usernameField.dispatchEvent(new Event('input', { bubbles: true }));
        passwordField.dispatchEvent(new Event('input', { bubbles: true }));
        setTimeout(() => {
            this.autoSubmitForm(loginButton);
        }, 500);
    }
    autoSubmitForm(loginButton) {
        setTimeout(() => {
            loginButton.click();
        }, 1000);
    }
    setupFormListeners() {
        const currentUrl = window.location.href;
        if (!(currentUrl.includes('digikabu.de/') || currentUrl.includes('digikabu.de/login'))) {
            return;
        }
        if (!this.isAutoLoginEnabled())
            return;
        this.waitForFormElements().then(() => {
            const loginButton = document.querySelector('button.btn.btn-primary[type="submit"]');
            if (!loginButton)
                return;
            loginButton.addEventListener('click', async (event) => {
                const usernameField = document.getElementById('UserName');
                const passwordField = document.getElementById('Password');
                if (usernameField && passwordField && usernameField.value && passwordField.value) {
                    await this.saveCredentials(usernameField.value, passwordField.value);
                }
            });
        });
    }
    async clearStoredCredentials() {
        try {
            await chrome.storage.local.remove([this.STORAGE_KEY]);
        }
        catch (error) {
            console.error('Failed to clear credentials:', error);
        }
    }
}
const secureAutoLoginWindow = window;
if (!secureAutoLoginWindow.digikabuAutoLoginLoaded) {
    secureAutoLoginWindow.digikabuAutoLoginLoaded = true;
    function initSecureAutoLogin() {
        try {
            const autoLogin = new DigikabuSecureAutoLogin();
            secureAutoLoginWindow.digikabuAutoLogin = autoLogin;
        }
        catch (error) {
            console.error('Failed to initialize secure auto-login:', error);
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSecureAutoLogin);
    }
    else {
        initSecureAutoLogin();
    }
}
