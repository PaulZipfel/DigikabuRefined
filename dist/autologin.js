"use strict";
var DigikabuAutoLogin = (() => {
  // src/autologin/index.ts
  var STORAGE_KEY = "dkb_al_v2";
  var SETTINGS_KEY = "digikabu-settings-v2";
  var EXPIRY_MS = 30 * 24 * 60 * 60 * 1e3;
  var win = window;
  if (win.__digikabuAutoLoginLoaded) {
  } else {
    win.__digikabuAutoLoginLoaded = true;
    class DigikabuAutoLogin {
      async fingerprint() {
        const raw = [navigator.userAgent, navigator.language, screen.width + "x" + screen.height].join("|");
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
        return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
      }
      async deriveKey(salt, timestamp, usage) {
        const fp = await this.fingerprint();
        const raw = await crypto.subtle.importKey(
          "raw",
          new TextEncoder().encode(fp + timestamp),
          { name: "PBKDF2" },
          false,
          ["deriveKey"]
        );
        return crypto.subtle.deriveKey(
          { name: "PBKDF2", salt, iterations: 1e5, hash: "SHA-256" },
          raw,
          { name: "AES-GCM", length: 256 },
          false,
          usage
        );
      }
      async saveCredentials(username, password) {
        if (!username || !password) return;
        try {
          const salt = crypto.getRandomValues(new Uint8Array(32));
          const iv = crypto.getRandomValues(new Uint8Array(16));
          const timestamp = Date.now();
          const key = await this.deriveKey(salt, timestamp, ["encrypt"]);
          const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            key,
            new TextEncoder().encode(JSON.stringify({ username, password }))
          );
          const storage = {
            data: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
            iv: btoa(String.fromCharCode(...iv)),
            salt: btoa(String.fromCharCode(...salt)),
            timestamp
          };
          await chrome.storage.local.set({ [STORAGE_KEY]: JSON.stringify(storage) });
        } catch (e) {
          console.error("[AutoLogin] Save failed:", e);
        }
      }
      async getCredentials() {
        try {
          const result = await chrome.storage.local.get(STORAGE_KEY);
          if (!result[STORAGE_KEY]) return null;
          const s = JSON.parse(result[STORAGE_KEY]);
          if (Date.now() - s.timestamp > EXPIRY_MS) {
            await this.clearStoredCredentials();
            return null;
          }
          const salt = new Uint8Array(atob(s.salt).split("").map((c) => c.charCodeAt(0)));
          const iv = new Uint8Array(atob(s.iv).split("").map((c) => c.charCodeAt(0)));
          const data = new Uint8Array(atob(s.data).split("").map((c) => c.charCodeAt(0)));
          const key = await this.deriveKey(salt, s.timestamp, ["decrypt"]);
          const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
          return JSON.parse(new TextDecoder().decode(decrypted));
        } catch (e) {
          console.error("[AutoLogin] Decrypt failed:", e);
          await this.clearStoredCredentials();
          return null;
        }
      }
      async clearStoredCredentials() {
        await chrome.storage.local.remove(STORAGE_KEY);
      }
      async enableAutoLogin(enable) {
        const result = await chrome.storage.local.get(SETTINGS_KEY);
        const current = result[SETTINGS_KEY] ?? {};
        await chrome.storage.local.set({ [SETTINGS_KEY]: { ...current, autoLogin: enable } });
        if (!enable) await this.clearStoredCredentials();
      }
      isLoginPage() {
        const url = window.location.href;
        return url.includes("digikabu.de") && (url.includes("/Login") || url === "https://www.digikabu.de/" || url.endsWith(".de/"));
      }
      async isAutoLoginEnabled() {
        const result = await chrome.storage.local.get(SETTINGS_KEY);
        return !!result[SETTINGS_KEY]?.autoLogin;
      }
      detectLoginError() {
        const alert = document.querySelector(".alert.alert-danger");
        if (!alert) {
          return { hasError: false, isWrongCredentials: false, isLocked: false, message: "" };
        }
        const text = alert.textContent?.toLowerCase() || "";
        const isWrongCredentials = text.includes("falscher benutzername") || text.includes("passwort") || text.includes("wrong") || text.includes("invalid");
        const isLocked = text.includes("gesperrt") || text.includes("locked") || text.includes("sekunden");
        return {
          hasError: true,
          isWrongCredentials,
          isLocked,
          message: alert.textContent?.trim() || "Login-Fehler"
        };
      }
      waitForElement(selector, timeout = 5e3) {
        const start = Date.now();
        return new Promise((resolve) => {
          const check = () => {
            const el = document.querySelector(selector);
            if (el) return resolve(el);
            if (Date.now() - start > timeout) return resolve(null);
            setTimeout(check, 100);
          };
          check();
        });
      }
      async run() {
        if (this.isLoginPage()) {
          await this.handleLoginPage();
        }
        this.setupClickCapture();
      }
      async handleLoginPage() {
        if (!await this.isAutoLoginEnabled()) return;
        const error = this.detectLoginError();
        if (error.hasError) {
          console.warn("[AutoLogin] Login error detected:", error.message);
          if (error.isWrongCredentials) {
            console.warn("[AutoLogin] Wrong credentials detected \u2014 clearing stored data and disabling auto-login");
            await this.clearStoredCredentials();
            this.showAutoLoginWarning(
              "\u26A0\uFE0F Auto-Login deaktiviert: Falsche Anmeldedaten. Bitte manuell einloggen und erneut aktivieren."
            );
            return;
          }
          if (error.isLocked) {
            console.warn("[AutoLogin] Account locked \u2014 will NOT retry");
            this.showAutoLoginWarning(
              "\u23F3 Account gesperrt \u2014 Auto-Login wartet. Bitte manuell erneut versuchen."
            );
            return;
          }
          console.warn("[AutoLogin] Unknown error \u2014 stopping auto-login attempt");
          return;
        }
        const [userField, passField, btn] = await Promise.all([
          this.waitForElement("#UserName"),
          this.waitForElement("#Password"),
          this.waitForElement('button.btn.btn-primary[type="submit"]')
        ]);
        if (!userField || !passField || !btn) return;
        userField.setAttribute("autocomplete", "username");
        passField.setAttribute("autocomplete", "current-password");
        if (userField.value && passField.value) {
          setTimeout(() => btn.click(), 600);
          return;
        }
        const creds = await this.getCredentials();
        if (!creds) return;
        userField.value = creds.username;
        passField.value = creds.password;
        userField.dispatchEvent(new Event("input", { bubbles: true }));
        passField.dispatchEvent(new Event("input", { bubbles: true }));
        setTimeout(() => btn.click(), 500);
      }
      // ── NEW: Show visual warning on login page ──────────────
      showAutoLoginWarning(message) {
        if (document.getElementById("__dk-autologin-warn")) return;
        const el = document.createElement("div");
        el.id = "__dk-autologin-warn";
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
      `;
        el.textContent = message;
        const style = document.createElement("style");
        style.textContent = `
        @keyframes dkWarnSlide {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `;
        document.head.appendChild(style);
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 15e3);
      }
      setupClickCapture() {
        this.waitForElement('button.btn.btn-primary[type="submit"]').then((btn) => {
          if (!btn) return;
          btn.addEventListener("click", async () => {
            if (!await this.isAutoLoginEnabled()) return;
            const user = document.querySelector("#UserName")?.value;
            const pass = document.querySelector("#Password")?.value;
            if (user && pass) await this.saveCredentials(user, pass);
          });
        });
      }
    }
    const autoLogin = new DigikabuAutoLogin();
    win.__digikabuAutoLogin = autoLogin;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => autoLogin.run());
    } else {
      autoLogin.run();
    }
  }
})();
