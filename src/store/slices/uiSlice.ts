import type { StateCreator } from 'zustand';

export type ActiveTab = 'github' | 'local' | 'directory' | 'zip';

export interface UISlice {
  outputText: string;
  tokenCount: number;
  lineCount: number;
  isGenerating: boolean;
  showExcludedFiles: boolean;
  activeTab: ActiveTab;

  setOutputText: (text: string) => void;
  setTokenCount: (count: number) => void;
  setLineCount: (count: number) => void;
  setGenerating: (isGenerating: boolean) => void;
  toggleShowExcludedFiles: () => void;
  setShowExcludedFiles: (show: boolean) => void;
  setActiveTab: (tab: ActiveTab) => void;
  reset: () => void;
}

const initialState = {
  outputText: '',
  tokenCount: 0,
  lineCount: 0,
  isGenerating: false,
  showExcludedFiles: false,
  activeTab: 'github' as ActiveTab,
};

export const createUISlice: StateCreator<UISlice> = (set, get) => ({
  ...initialState,

  setOutputText: (text: string) => set({ outputText: text }),

  setTokenCount: (count: number) => set({ tokenCount: count }),

  setLineCount: (count: number) => set({ lineCount: count }),

  setGenerating: (isGenerating: boolean) => set({ isGenerating }),

  toggleShowExcludedFiles: () => {
    const { showExcludedFiles } = get();
    set({ showExcludedFiles: !showExcludedFiles });
  },

  setShowExcludedFiles: (show: boolean) => set({ showExcludedFiles: show }),

  setActiveTab: (tab: ActiveTab) => set({ activeTab: tab }),

  reset: () => set(initialState),
});
