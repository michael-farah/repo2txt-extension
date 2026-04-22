import type { StateStorage } from 'zustand/middleware';

/**
 * Custom JSON replacer that serializes Set and Map instances
 * into objects with a __type__ discriminator so they can be
 * round-tripped through JSON.stringify / JSON.parse.
 */
export function jsonReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Set) {
    return { __type__: 'Set', value: Array.from(value) };
  }
  if (value instanceof Map) {
    return { __type__: 'Map', value: Array.from(value.entries()) };
  }
  return value;
}

/**
 * Custom JSON reviver that deserializes __type__-tagged objects
 * back into their original Set / Map instances.
 */
export function jsonReviver(_key: string, value: unknown): unknown {
  if (value !== null && typeof value === 'object' && '__type__' in (value as object)) {
    const tagged = value as { __type__: string; value: unknown };
    if (tagged.__type__ === 'Set' && Array.isArray(tagged.value)) {
      return new Set(tagged.value as unknown[]);
    }
    if (tagged.__type__ === 'Map' && Array.isArray(tagged.value)) {
      return new Map(tagged.value as [unknown, unknown][]);
    }
  }
  return value;
}

const isChromeExtension = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

const STORAGE_KEY_ID = 'repo2txt-enc-key';

async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  let rawKey: string | null;
  if (isChromeExtension) {
    const result = await chrome.storage.local.get([STORAGE_KEY_ID]);
    rawKey = (result as Record<string, string>)[STORAGE_KEY_ID] ?? null;
  } else {
    rawKey = localStorage.getItem(STORAGE_KEY_ID);
  }

  if (!rawKey) {
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    rawKey = Array.from(keyBytes, (b) => b.toString(16).padStart(2, '0')).join('');

    if (isChromeExtension) {
      await chrome.storage.local.set({ [STORAGE_KEY_ID]: rawKey });
    } else {
      localStorage.setItem(STORAGE_KEY_ID, rawKey);
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
      const result = await chrome.storage.local.get([name]);
      value = (result as Record<string, string>)[name] ?? null;
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
      await chrome.storage.local.set({ [name]: finalValue });
    } else {
      localStorage.setItem(name, finalValue);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    if (isChromeExtension) {
      await chrome.storage.local.remove([name]);
    } else {
      localStorage.removeItem(name);
    }
  },
};
