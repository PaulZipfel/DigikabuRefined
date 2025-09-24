interface LoginCredentials {
  username: string;
  password: string;
}

interface SecureStorage {
  data: string;
  iv: string;
  salt: string;
  timestamp: number;
}

class DigikabuAutoLogin {
  private readonly STORAGE_KEY = 'dkb_al_sec';
  private readonly SETTINGS_KEY = 'dkb_al_en';
  private masterKey: CryptoKey | null = null;
  
  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    if (this.shouldRunAutoLogin()) {
      await this.handleAutoLogin();
    }
    this.setupFormListeners();
  }

  private shouldRunAutoLogin(): boolean {
    const currentUrl = window.location.href;
    return (currentUrl.includes('digikabu.de/') || currentUrl.includes('digikabu.de/login')) &&
           this.isAutoLoginEnabled();
  }

  private isAutoLoginEnabled(): boolean {
    try {
      return localStorage.getItem(this.SETTINGS_KEY) === 'true';
    } catch {
      return false;
    }
  }

  public async enableAutoLogin(enable: boolean): Promise<void> {
    try {
      localStorage.setItem(this.SETTINGS_KEY, enable.toString());
      if (!enable) {
        await this.clearStoredCredentials();
        this.masterKey = null;
      }
    } catch (error) {
      console.error('Failed to save auto-login setting:', error);
    }
  }

  public getAutoLoginStatus(): boolean {
    return this.isAutoLoginEnabled();
  }

  private async generateMasterKey(): Promise<CryptoKey> {
    if (this.masterKey) return this.masterKey;

    const browserInfo = await this.getBrowserFingerprint();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(browserInfo),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    this.masterKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode(`${browserInfo}-salt-${Date.now()}`),
        iterations: 250000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    return this.masterKey;
  }

  private async getBrowserFingerprint(): Promise<string> {
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
      (navigator as any).deviceMemory || 'unknown'
    ].join('|');
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprint));
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async encryptData(data: string): Promise<SecureStorage> {
    try {
      const salt = crypto.getRandomValues(new Uint8Array(32));
      const iv = crypto.getRandomValues(new Uint8Array(16));
      const timestamp = Date.now();
      
      const browserInfo = await this.getBrowserFingerprint();
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(browserInfo + timestamp.toString()),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      const encryptionKey = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      const encodedData = new TextEncoder().encode(data);
      const encryptedData = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        encryptionKey,
        encodedData
      );

      return {
        data: btoa(String.fromCharCode(...new Uint8Array(encryptedData))),
        iv: btoa(String.fromCharCode(...iv)),
        salt: btoa(String.fromCharCode(...salt)),
        timestamp: timestamp
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  }

  private async decryptData(secureData: SecureStorage): Promise<string> {
    try {
      if (Date.now() - secureData.timestamp > 30 * 24 * 60 * 60 * 1000) {
        throw new Error('Data expired');
      }

      const salt = new Uint8Array(atob(secureData.salt).split('').map(char => char.charCodeAt(0)));
      const iv = new Uint8Array(atob(secureData.iv).split('').map(char => char.charCodeAt(0)));
      const data = new Uint8Array(atob(secureData.data).split('').map(char => char.charCodeAt(0)));

      const browserInfo = await this.getBrowserFingerprint();
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(browserInfo + secureData.timestamp.toString()),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      const decryptionKey = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      const decryptedData = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        decryptionKey,
        data
      );

      return new TextDecoder().decode(decryptedData);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw error;
    }
  }

  public async saveCredentials(username: string, password: string): Promise<void> {
    if (!username || !password) return;

    try {
      const credentials: LoginCredentials = { username, password };
      const encryptedStorage = await this.encryptData(JSON.stringify(credentials));
      
      await chrome.storage.local.set({
        [this.STORAGE_KEY]: JSON.stringify(encryptedStorage)
      });
    } catch (error) {
      console.error('Failed to save credentials:', error);
    }
  }

  private async getStoredCredentials(): Promise<LoginCredentials | null> {
    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEY]);
      const encryptedData = result[this.STORAGE_KEY];
      
      if (!encryptedData) return null;
      
      const secureStorage = JSON.parse(encryptedData) as SecureStorage;
      const decryptedData = await this.decryptData(secureStorage);
      return JSON.parse(decryptedData) as LoginCredentials;
    } catch (error) {
      console.error('Failed to retrieve credentials:', error);
      await this.clearStoredCredentials();
      return null;
    }
  }

  private async handleAutoLogin(): Promise<void> {
    await this.waitForFormElements();
    
    const usernameField = document.getElementById('UserName') as HTMLInputElement;
    const passwordField = document.getElementById('Password') as HTMLInputElement;
    const loginButton = document.querySelector('button.btn.btn-primary[type="submit"]') as HTMLButtonElement;

    if (!usernameField || !passwordField || !loginButton) return;

    if (usernameField.value && passwordField.value) {
      this.autoSubmitForm(loginButton);
      return;
    }

    const credentials = await this.getStoredCredentials();
    if (!credentials) return;

    this.fillAndSubmitForm(usernameField, passwordField, loginButton, credentials);
  }

  private async waitForFormElements(): Promise<void> {
    return new Promise((resolve) => {
      const checkForElements = () => {
        const usernameField = document.getElementById('UserName');
        const passwordField = document.getElementById('Password');
        const loginButton = document.querySelector('button.btn.btn-primary[type="submit"]');

        if (usernameField && passwordField && loginButton) {
          resolve();
        } else {
          setTimeout(checkForElements, 100);
        }
      };
      
      checkForElements();
    });
  }

  private fillAndSubmitForm(
    usernameField: HTMLInputElement,
    passwordField: HTMLInputElement,
    loginButton: HTMLButtonElement,
    credentials: LoginCredentials
  ): void {
    usernameField.value = credentials.username;
    passwordField.value = credentials.password;

    usernameField.dispatchEvent(new Event('input', { bubbles: true }));
    passwordField.dispatchEvent(new Event('input', { bubbles: true }));

    setTimeout(() => {
      this.autoSubmitForm(loginButton);
    }, 200);
  }

  private autoSubmitForm(loginButton: HTMLButtonElement): void {
    setTimeout(() => {
      loginButton.click();
    }, 300);
  }

  private setupFormListeners(): void {
    const currentUrl = window.location.href;
    if (!(currentUrl.includes('digikabu.de/') || currentUrl.includes('digikabu.de/login'))) {
      return;
    }

    if (!this.isAutoLoginEnabled()) return;

    this.waitForFormElements().then(() => {
      const loginButton = document.querySelector('button.btn.btn-primary[type="submit"]') as HTMLButtonElement;
      if (!loginButton) return;

      loginButton.addEventListener('click', async (event) => {
        const usernameField = document.getElementById('UserName') as HTMLInputElement;
        const passwordField = document.getElementById('Password') as HTMLInputElement;

        if (usernameField && passwordField && usernameField.value && passwordField.value) {
          await this.saveCredentials(usernameField.value, passwordField.value);
        }
      });
    });
  }

  public async clearStoredCredentials(): Promise<void> {
    try {
      await chrome.storage.local.remove([this.STORAGE_KEY]);
    } catch (error) {
      console.error('Failed to clear credentials:', error);
    }
  }
}

const autoLoginWindow = window as any;

if (!autoLoginWindow.digikabuAutoLoginLoaded) {
  autoLoginWindow.digikabuAutoLoginLoaded = true;
  
  function initAutoLogin() {
    try {
      const autoLogin = new DigikabuAutoLogin();
      autoLoginWindow.digikabuAutoLogin = autoLogin;
    } catch (error) {
      console.error('Failed to initialize auto-login:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoLogin);
  } else {
    initAutoLogin();
  }
}