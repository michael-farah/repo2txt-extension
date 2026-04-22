import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { createThemeSlice } from './slices/themeSlice';
import { createProviderSlice } from './slices/providerSlice';
import { createFileTreeSlice } from './slices/fileTreeSlice';
import { createUISlice } from './slices/uiSlice';
import { createCacheSlice } from './slices/cacheSlice';
import type { CachedRepoData } from './slices/cacheSlice';
import { createSettingsSlice } from './slices/settingsSlice';
import { chromeStorage } from '@/lib/storage/chromeStorage';
import type { FileNode } from '@/types';

import type { ThemeSlice } from './slices/themeSlice';
import type { ProviderSlice } from './slices/providerSlice';
import type { FileTreeSlice } from './slices/fileTreeSlice';
import type { UISlice } from './slices/uiSlice';
import type { CacheSlice } from './slices/cacheSlice';
import type { SettingsSlice } from './slices/settingsSlice';

export type AppStore = ThemeSlice &
  ProviderSlice &
  FileTreeSlice &
  UISlice &
  CacheSlice &
  SettingsSlice;

interface PersistedState {
  pat: string | null;
  repoCache: Record<string, CachedRepoData>;
  repoUrl: string;
  providerType: 'github' | 'local' | null;
  nodes: FileNode[];
  selectedPaths: string[];
  expandedPaths: string[];
  excludedPaths: string[];
  gitignorePatterns: string[];
  extensions: [string, { count: number; selected: boolean }][];
  outputText: string;
  tokenCount: number;
  lineCount: number;
}
export const useStore = create<AppStore>()(
  devtools(
    persist(
      (...a) => ({
        ...createThemeSlice(...a),
        ...createProviderSlice(...a),
        ...createFileTreeSlice(...a),
        ...createUISlice(...a),
        ...createSettingsSlice(...a),
        ...createCacheSlice(...a),
      }),
      {
        name: 'repo2txt-secure-store',
        storage: createJSONStorage(() => chromeStorage),
        partialize: (state) => ({
          pat: state.pat,
          repoCache: state.repoCache,
          repoUrl: state.repoUrl,
          providerType: state.providerType,
          nodes: state.nodes,
          selectedPaths: Array.from(state.selectedPaths),
          expandedPaths: Array.from(state.expandedPaths),
          excludedPaths: Array.from(state.excludedPaths),
          gitignorePatterns: state.gitignorePatterns,
          extensions: Array.from(state.extensions.entries()),
          outputText: state.outputText,
          tokenCount: state.tokenCount,
          lineCount: state.lineCount,
        }),
        merge: (persistedState, currentState) => {
          const state = persistedState as PersistedState;
          return {
            ...currentState,
            ...state,
            selectedPaths: new Set(state.selectedPaths || []),
            expandedPaths: new Set(state.expandedPaths || []),
            excludedPaths: new Set(state.excludedPaths || []),
            extensions: new Map(state.extensions || []),
          };
        },
      }
    ),
    {
      name: 'repo2txt-store',
    }
  )
);

// Export individual slices for convenience
export { type ThemeSlice } from './slices/themeSlice';
export { type ProviderSlice } from './slices/providerSlice';
export { type FileTreeSlice } from './slices/fileTreeSlice';
export { type UISlice, type ActiveTab } from './slices/uiSlice';
export { type CacheSlice } from './slices/cacheSlice';
export { type SettingsSlice } from './slices/settingsSlice';
