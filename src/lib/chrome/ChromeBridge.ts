import type { ProcessingState } from './ProcessingState';

const STORAGE_KEY = 'processingState';

function isChromeStorageAvailable(): boolean {
  return typeof chrome !== 'undefined' && chrome.storage?.session !== undefined;
}

/**
 * Checks if Chrome storage local API is available
 */
function isChromeLocalStorageAvailable(): boolean {
  return typeof chrome !== 'undefined' && chrome.storage?.local !== undefined;
}

/**
 * Checks if Chrome action API is available (for badges)
 */
function isChromeActionAvailable(): boolean {
  return typeof chrome !== 'undefined' && chrome.action !== undefined;
}

/**
 * ChromeBridge provides a typed interface for managing ProcessingState
 * in chrome.storage.session. All methods gracefully handle non-Chrome environments.
 */
export const ChromeBridge = {
  /**
   * Sets the processing state in chrome.storage.session
   */
  async setProcessingState(state: ProcessingState): Promise<void> {
    if (!isChromeStorageAvailable()) {
      return Promise.resolve();
    }
    return chrome.storage.session.set({ [STORAGE_KEY]: state });
  },

  /**
   * Gets the processing state from chrome.storage.session
   * Returns null if not found or in non-Chrome environments
   */
  async getProcessingState(): Promise<ProcessingState | null> {
    if (!isChromeStorageAvailable()) {
      return Promise.resolve(null);
    }
    const result = await chrome.storage.session.get(STORAGE_KEY);
    return (result[STORAGE_KEY] as ProcessingState | undefined) ?? null;
  },

  /**
   * Clears the processing state from chrome.storage.session
   */
  async clearProcessingState(): Promise<void> {
    if (!isChromeStorageAvailable()) {
      return Promise.resolve();
    }
    return chrome.storage.session.remove(STORAGE_KEY);
  },

  /**
   * Updates just the status field of the current processing state
   * Reads current state, updates status, and writes back
   */
  async updateProcessingStatus(status: ProcessingState['status']): Promise<void> {
    if (!isChromeStorageAvailable()) {
      return Promise.resolve();
    }
    const currentState = await this.getProcessingState();
    if (currentState) {
      await this.setProcessingState({
        ...currentState,
        status,
        timestamp: Date.now(),
      });
    }
  },
  // ==========================================================================
  // Local Storage Methods
  // ==========================================================================

  /**
   * Sets a value in chrome.storage.local
   */
  async setLocalStorage(key: string, value: unknown): Promise<void> {
    if (!isChromeLocalStorageAvailable()) {
      localStorage.setItem(key, JSON.stringify(value));
      return;
    }
    return chrome.storage.local.set({ [key]: value });
  },

  /**
   * Gets a value from chrome.storage.local
   */
  async getLocalStorage<T = unknown>(key: string): Promise<T | null> {
    if (!isChromeLocalStorageAvailable()) {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    }
    const result = await chrome.storage.local.get(key);
    return (result[key] as T | undefined) ?? null;
  },

  /**
   * Removes a key from chrome.storage.local
   */
  async removeLocalStorage(key: string): Promise<void> {
    if (!isChromeLocalStorageAvailable()) {
      localStorage.removeItem(key);
      return;
    }
    return chrome.storage.local.remove(key);
  },

  // ==========================================================================
  // Badge Methods
  // ==========================================================================

  /**
   * Sets the extension badge text and color
   */
  async setBadge(text: string, color: string = '#4F46E5'): Promise<void> {
    if (!isChromeActionAvailable()) return;
    await chrome.action.setBadgeText({ text });
    if (text) {
      await chrome.action.setBadgeBackgroundColor({ color });
    }
  },

  /**
   * Clears the extension badge
   */
  async clearBadge(): Promise<void> {
    if (!isChromeActionAvailable()) return;
    await chrome.action.setBadgeText({ text: '' });
  },
};
