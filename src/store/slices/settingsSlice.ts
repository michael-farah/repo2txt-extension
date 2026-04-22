import type { StateCreator } from 'zustand';

export interface SettingsSlice {
  showGitHubButton: boolean;
  showTokenCount: boolean;
  showLineCount: boolean;
  autoExpandDirectories: boolean;

  setShowGitHubButton: (show: boolean) => void;
  setShowTokenCount: (show: boolean) => void;
  setShowLineCount: (show: boolean) => void;
  setAutoExpandDirectories: (auto: boolean) => void;
}

const initialState = {
  showGitHubButton: true,
  showTokenCount: true,
  showLineCount: true,
  autoExpandDirectories: false,
};

/**
 * Sync settings to a separate, non-encrypted chrome.storage.local key
 * so content scripts (which run outside the React/Zustand context)
 * can read them without needing the encryption key.
 */
function syncContentSettings(settings: {
  showGitHubButton: boolean;
  showTokenCount: boolean;
  showLineCount: boolean;
  autoExpandDirectories: boolean;
}): void {
  try {
    const isChromeExtension =
      typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
    if (isChromeExtension) {
      chrome.storage.local.set({ 'repo2txt-content-settings': settings });
    } else {
      localStorage.setItem('repo2txt-content-settings', JSON.stringify(settings));
    }
  } catch {
    // Non-critical: content script will fall back to defaults
  }
}

export const createSettingsSlice: StateCreator<SettingsSlice> = (set, get) => ({
  ...initialState,

  setShowGitHubButton: (show: boolean) => {
    set({ showGitHubButton: show });
    syncContentSettings({ ...get() });
  },

  setShowTokenCount: (show: boolean) => {
    set({ showTokenCount: show });
    syncContentSettings({ ...get() });
  },

  setShowLineCount: (show: boolean) => {
    set({ showLineCount: show });
    syncContentSettings({ ...get() });
  },

  setAutoExpandDirectories: (auto: boolean) => {
    set({ autoExpandDirectories: auto });
    syncContentSettings({ ...get() });
  },
});
