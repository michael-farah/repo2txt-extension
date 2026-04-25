import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { createThemeSlice } from './slices/themeSlice';
import { createProviderSlice } from './slices/providerSlice';
import { createFileTreeSlice } from './slices/fileTreeSlice';
import { createUISlice } from './slices/uiSlice';
import { createCacheSlice } from './slices/cacheSlice';
import { createSettingsSlice } from './slices/settingsSlice';
import { chromeStorage, jsonReplacer, jsonReviver } from '@/lib/storage/chromeStorage';

import type { ThemeSlice } from './slices/themeSlice';
import type { ProviderSlice } from './slices/providerSlice';
import type { FileTreeSlice } from './slices/fileTreeSlice';
import type { UISlice } from './slices/uiSlice';
import type { CacheSlice } from './slices/cacheSlice';
import type { SettingsSlice } from './slices/settingsSlice';

export type AppStore = ThemeSlice & ProviderSlice & FileTreeSlice & UISlice & CacheSlice & SettingsSlice;

function reviveSetMap(state: AppStore | undefined): Partial<AppStore> | undefined {
  if (!state) return undefined;

  const fixes: Partial<AppStore> = {};
  const raw = state as unknown as Record<string, unknown>;

  if (Array.isArray(raw.selectedPaths)) {
    fixes.selectedPaths = new Set(raw.selectedPaths as string[]);
  }
  if (Array.isArray(raw.expandedPaths)) {
    fixes.expandedPaths = new Set(raw.expandedPaths as string[]);
  }
  if (Array.isArray(raw.excludedPaths)) {
    fixes.excludedPaths = new Set(raw.excludedPaths as string[]);
  }
  if (Array.isArray(raw.extensions)) {
    fixes.extensions = new Map(raw.extensions as [string, { count: number; selected: boolean }][]);
  }

  return Object.keys(fixes).length > 0 ? fixes : undefined;
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
        storage: createJSONStorage(() => chromeStorage, {
          reviver: jsonReviver,
          replacer: jsonReplacer,
        }),
        partialize: (state) => ({
          pat: state.pat,
          repoCache: state.repoCache,
          recentRepos: state.recentRepos,
          providerType: state.providerType,
          repoUrl: state.repoUrl,
          repoMetadata: state.repoMetadata,
          nodes: state.nodes,
          selectedPaths: state.selectedPaths,
          expandedPaths: state.expandedPaths,
          excludedPaths: state.excludedPaths,
          extensions: state.extensions,
          gitignorePatterns: state.gitignorePatterns,
          showExcludedFiles: state.showExcludedFiles,
          outputText: state.outputText,
          tokenCount: state.tokenCount,
          lineCount: state.lineCount,
          activeTab: state.activeTab,
          showGitHubButton: state.showGitHubButton,
          showTokenCount: state.showTokenCount,
          showLineCount: state.showLineCount,
          autoExpandDirectories: state.autoExpandDirectories,
        }),
        onRehydrateStorage: () => (state) => {
          const fixes = reviveSetMap(state);
          if (fixes && state) {
            useStore.setState(fixes);
          }
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
export { type CacheSlice, type CachedRepoData, type RepoSnapshot, type RecentRepo } from './slices/cacheSlice';
export { type SettingsSlice } from './slices/settingsSlice';
