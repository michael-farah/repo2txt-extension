import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { createThemeSlice } from './slices/themeSlice';
import { createProviderSlice } from './slices/providerSlice';
import { createFileTreeSlice } from './slices/fileTreeSlice';
import { createUISlice } from './slices/uiSlice';
import { createCacheSlice } from './slices/cacheSlice';
import { chromeStorage } from '@/lib/storage/chromeStorage';

import type { ThemeSlice } from './slices/themeSlice';
import type { ProviderSlice } from './slices/providerSlice';
import type { FileTreeSlice } from './slices/fileTreeSlice';
import type { UISlice } from './slices/uiSlice';
import type { CacheSlice } from './slices/cacheSlice';

export type AppStore = ThemeSlice & ProviderSlice & FileTreeSlice & UISlice & CacheSlice;

export const useStore = create<AppStore>()(
  devtools(
    persist(
      (...a) => ({
        ...createThemeSlice(...a),
        ...createProviderSlice(...a),
        ...createFileTreeSlice(...a),
        ...createUISlice(...a),
        ...createCacheSlice(...a),
      }),
      {
        name: 'repo2txt-secure-store',
        storage: createJSONStorage(() => chromeStorage),
        partialize: (state) => ({
          pat: state.pat,
          repoCache: state.repoCache,
        }),
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
export { type UISlice } from './slices/uiSlice';
export { type CacheSlice } from './slices/cacheSlice';
