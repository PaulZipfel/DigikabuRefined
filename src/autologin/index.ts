interface Credentials { username: string; password: string }
interface SecureStorage { data: string; iv: string; salt: string; timestamp: number }

const STORAGE_KEY = 'dkb_al_v2'
const SETTINGS_KEY = 'digikabu-settings-v2'
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000

const win = window as any
if (win.__digikabuAutoLoginLoaded) {
  // already loaded, skip
} else {
  win.__digikabuAutoLoginLoaded = true

  class DigikabuAutoLogin {
    private async fingerprint(): Promise<string> {
      const raw = [navigator.userAgent, navigator.language, screen.width + 'x' + screen.height].join('|')
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw) as BufferSource)
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
    }

    private async deriveKey(salt: Uint8Array, timestamp: number, usage: KeyUsage[]): Promise<CryptoKey> {
      const fp = await this.fingerprint()
      const raw = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(fp + timestamp) as BufferSource,
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      )
      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt as BufferSource, iterations: 100000, hash: 'SHA-256' },
        raw,
        { name: 'AES-GCM', length: 256 },
        false,
        usage
      )
    }

    async saveCredentials(username: string, password: string): Promise<void> {
      if (!username || !password) return
      try {
        const salt = crypto.getRandomValues(new Uint8Array(32))
        const iv = crypto.getRandomValues(new Uint8Array(16))
        const timestamp = Date.now()
        const key = await this.deriveKey(salt, timestamp, ['encrypt'])
        const encrypted = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: iv as BufferSource },
          key,
          new TextEncoder().encode(JSON.stringify({ username, password })) as BufferSource
        )
        const storage: SecureStorage = {
          data: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
          iv: btoa(String.fromCharCode(...iv)),
          salt: btoa(String.fromCharCode(...salt)),
          timestamp,
        }
        await chrome.storage.local.set({ [STORAGE_KEY]: JSON.stringify(storage) })
      } catch (e) {
        console.error('[AutoLogin] Save failed:', e)
      }
    }

    async getCredentials(): Promise<Credentials | null> {
      try {
        const result = await chrome.storage.local.get(STORAGE_KEY)
        if (!result[STORAGE_KEY]) return null
        const s = JSON.parse(result[STORAGE_KEY]) as SecureStorage
        if (Date.now() - s.timestamp > EXPIRY_MS) {
          await this.clearStoredCredentials()
          return null
        }
        const salt = new Uint8Array(atob(s.salt).split('').map(c => c.charCodeAt(0)))
        const iv = new Uint8Array(atob(s.iv).split('').map(c => c.charCodeAt(0)))
        const data = new Uint8Array(atob(s.data).split('').map(c => c.charCodeAt(0)))
        const key = await this.deriveKey(salt, s.timestamp, ['decrypt'])
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, data as BufferSource)
        return JSON.parse(new TextDecoder().decode(decrypted))
      } catch (e) {
        console.error('[AutoLogin] Decrypt failed:', e)
        await this.clearStoredCredentials()
        return null
      }
    }

    async clearStoredCredentials(): Promise<void> {
      await chrome.storage.local.remove(STORAGE_KEY)
    }

    async enableAutoLogin(enable: boolean): Promise<void> {
      const result = await chrome.storage.local.get(SETTINGS_KEY)
      const current = result[SETTINGS_KEY] ?? {}
      await chrome.storage.local.set({ [SETTINGS_KEY]: { ...current, autoLogin: enable } })
      if (!enable) await this.clearStoredCredentials()
    }

    private isLoginPage(): boolean {
      const url = window.location.href
      return url.includes('digikabu.de') &&
        (url.includes('/Login') || url === 'https://www.digikabu.de/' || url.endsWith('.de/'))
    }

    private async isAutoLoginEnabled(): Promise<boolean> {
      const result = await chrome.storage.local.get(SETTINGS_KEY)
      return !!(result[SETTINGS_KEY]?.autoLogin)
    }

    private detectLoginError(): { hasError: boolean; isWrongCredentials: boolean; isLocked: boolean; message: string } {
      const alert = document.querySelector('.alert.alert-danger')
      if (!alert) {
        return { hasError: false, isWrongCredentials: false, isLocked: false, message: '' }
      }

      const text = alert.textContent?.toLowerCase() || ''
      const isWrongCredentials = text.includes('falscher benutzername') ||
                                  text.includes('passwort') ||
                                  text.includes('wrong') ||
                                  text.includes('invalid')
      const isLocked = text.includes('gesperrt') ||
                       text.includes('locked') ||
                       text.includes('sekunden')

      return {
        hasError: true,
        isWrongCredentials,
        isLocked,
        message: alert.textContent?.trim() || 'Login-Fehler',
      }
    }

    private waitForElement<T extends Element>(selector: string, timeout = 5000): Promise<T | null> {
      const start = Date.now()
      return new Promise(resolve => {
        const check = () => {
          const el = document.querySelector<T>(selector)
          if (el) return resolve(el)
          if (Date.now() - start > timeout) return resolve(null)
          setTimeout(check, 100)
        }
        check()
      })
    }

    async run(): Promise<void> {
      if (this.isLoginPage()) {
        await this.handleLoginPage()
      }
      this.setupClickCapture()
    }

    private async handleLoginPage(): Promise<void> {
      if (!(await this.isAutoLoginEnabled())) return

      const error = this.detectLoginError()

      if (error.hasError) {
        console.warn('[AutoLogin] Login error detected:', error.message)

        if (error.isWrongCredentials) {
          console.warn('[AutoLogin] Wrong credentials detected — clearing stored data and disabling auto-login')
          await this.clearStoredCredentials()

          this.showAutoLoginWarning(
            '⚠️ Auto-Login deaktiviert: Falsche Anmeldedaten. Bitte manuell einloggen und erneut aktivieren.'
          )
          return
        }

        if (error.isLocked) {
          // Account is temporarily locked → don't retry, just wait
          console.warn('[AutoLogin] Account locked — will NOT retry')
          this.showAutoLoginWarning(
            '⏳ Account gesperrt — Auto-Login wartet. Bitte manuell erneut versuchen.'
          )
          return
        }

        // Any other error → also don't retry
        console.warn('[AutoLogin] Unknown error — stopping auto-login attempt')
        return
      }

      // ── NO ERROR → Proceed with auto-login ─────────────────
      const [userField, passField, btn] = await Promise.all([
        this.waitForElement<HTMLInputElement>('#UserName'),
        this.waitForElement<HTMLInputElement>('#Password'),
        this.waitForElement<HTMLButtonElement>('button.btn.btn-primary[type="submit"]'),
      ])

      if (!userField || !passField || !btn) return
      userField.setAttribute('autocomplete', 'username')
      passField.setAttribute('autocomplete', 'current-password')

      // If fields are already filled (e.g. browser autofill), just submit
      if (userField.value && passField.value) {
        setTimeout(() => btn.click(), 600)
        return
      }

      const creds = await this.getCredentials()
      if (!creds) return

      userField.value = creds.username
      passField.value = creds.password
      userField.dispatchEvent(new Event('input', { bubbles: true }))
      passField.dispatchEvent(new Event('input', { bubbles: true }))
      setTimeout(() => btn.click(), 500)
    }

    // ── NEW: Show visual warning on login page ──────────────
    private showAutoLoginWarning(message: string): void {
      // Don't duplicate
      if (document.getElementById('__dk-autologin-warn')) return

      const el = document.createElement('div')
      el.id = '__dk-autologin-warn'
      el.style.cssText = `
        position: fixed;
        top: 16px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 99999;
        background: rgba(255, 107, 107, 0.95);
        color: white;
        padding: 12px 24px;
        border-radius: 10px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
        max-width: 500px;
        text-align: center;
        animation: dkWarnSlide 0.4s ease-out;
      `
      el.textContent = message

      // Add animation
      const style = document.createElement('style')
      style.textContent = `
        @keyframes dkWarnSlide {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `
      document.head.appendChild(style)
      document.body.appendChild(el)

      // Auto-remove after 15 seconds
      setTimeout(() => el.remove(), 15000)
    }

    private setupClickCapture(): void {
      this.waitForElement<HTMLButtonElement>('button.btn.btn-primary[type="submit"]').then(btn => {
        if (!btn) return
        btn.addEventListener('click', async () => {
          if (!(await this.isAutoLoginEnabled())) return
          const user = document.querySelector<HTMLInputElement>('#UserName')?.value
          const pass = document.querySelector<HTMLInputElement>('#Password')?.value
          if (user && pass) await this.saveCredentials(user, pass)
        })
      })
    }
  }

  const autoLogin = new DigikabuAutoLogin()
  win.__digikabuAutoLogin = autoLogin

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => autoLogin.run())
  } else {
    autoLogin.run()
  }
}