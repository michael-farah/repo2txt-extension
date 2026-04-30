import type { StateCreator } from 'zustand';
import { ChromeBridge } from '@/lib/chrome/ChromeBridge';

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

function syncContentSettings(settings: {
  showGitHubButton: boolean;
  showTokenCount: boolean;
  showLineCount: boolean;
  autoExpandDirectories: boolean;
}): void {
  try {
    ChromeBridge.setLocalStorage('repo2txt-content-settings', settings);
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
