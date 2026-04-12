import type { StateStorage } from 'zustand/middleware';

const isChromeExtension = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

const STORAGE_KEY_ID = 'repo2txt-enc-key';

async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  const storage = isChromeExtension ? chrome.storage.local : localStorage;

  let rawKey: string | null;
  if (isChromeExtension) {
    rawKey = await new Promise<string | null>((resolve) => {
      (storage as chrome.storage.LocalStorageArea).get([STORAGE_KEY_ID], (result) => {
        resolve(result[STORAGE_KEY_ID] || null);
      });
    });
  } else {
    rawKey = (storage as Storage).getItem(STORAGE_KEY_ID);
  }

  if (!rawKey) {
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    rawKey = Array.from(keyBytes, (b) => b.toString(16).padStart(2, '0')).join('');

    if (isChromeExtension) {
      await new Promise<void>((resolve) => {
        (storage as chrome.storage.LocalStorageArea).set({ [STORAGE_KEY_ID]: rawKey }, () => {
          resolve();
        });
      });
    } else {
      (storage as Storage).setItem(STORAGE_KEY_ID, rawKey);
    }
  }

  const enc = new TextEncoder();
  const keyMaterial = enc.encode(rawKey);
  const hash = await crypto.subtle.digest('SHA-256', keyMaterial);
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encrypt(text: string): Promise<string> {
  try {
    const key = await getOrCreateEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encoded = enc.encode(text);

    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Convert to base64 safely
    let binary = '';
    const len = combined.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return btoa(binary);
  } catch (e) {
    console.error('Encryption failed:', e);
    throw new Error('Failed to encrypt sensitive data');
  }
}

async function decrypt(encryptedBase64: string): Promise<string> {
  try {
    if (!/^[A-Za-z0-9+/=]+$/.test(encryptedBase64)) {
      return encryptedBase64;
    }

    const binary = atob(encryptedBase64);
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      combined[i] = binary.charCodeAt(i);
    }

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const key = await getOrCreateEncryptionKey();

    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (e) {
    console.error('Decryption failed:', e);
    throw new Error('Failed to decrypt stored data');
  }
}

export const chromeStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    let value: string | null = null;

    if (isChromeExtension) {
      value = await new Promise((resolve) => {
        chrome.storage.local.get([name], (result) => {
          resolve(result[name] || null);
        });
      });
    } else {
      value = localStorage.getItem(name);
    }

    if (value && name.includes('secure')) {
      return await decrypt(value);
    }

    return value;
  },

  setItem: async (name: string, value: string): Promise<void> => {
    let finalValue = value;

    if (name.includes('secure')) {
      finalValue = await encrypt(value);
    }

    if (isChromeExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [name]: finalValue }, () => {
          resolve();
        });
      });
    } else {
      localStorage.setItem(name, finalValue);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    if (isChromeExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.remove([name], () => {
          resolve();
        });
      });
    } else {
      localStorage.removeItem(name);
    }
  },
};
