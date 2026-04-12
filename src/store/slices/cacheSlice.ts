import type { StateCreator } from 'zustand';
import type { FileNode, TreeNode } from '@/types';

export interface CachedRepoData {
  timestamp: number;
  data: FileNode[];
  fileTree: TreeNode[];
}

export interface CacheSlice {
  repoCache: Record<string, CachedRepoData>;
  
  setCachedRepo: (repoUrl: string, data: FileNode[], fileTree: TreeNode[]) => void;
  getCachedRepo: (repoUrl: string) => CachedRepoData | null;
  clearCache: (repoUrl?: string) => void;
}

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const createCacheSlice: StateCreator<CacheSlice> = (set, get) => ({
  repoCache: {},

  setCachedRepo: (repoUrl: string, data: FileNode[], fileTree: TreeNode[]) => {
    set((state) => ({
      repoCache: {
        ...state.repoCache,
        [repoUrl]: {
          timestamp: Date.now(),
          data,
          fileTree,
        },
      },
    }));
  },

  getCachedRepo: (repoUrl: string) => {
    const cache = get().repoCache[repoUrl];
    if (!cache) return null;

    // Check TTL
    if (Date.now() - cache.timestamp > CACHE_TTL) {
      // Cache expired, remove it
      get().clearCache(repoUrl);
      return null;
    }

    return cache;
  },

  clearCache: (repoUrl?: string) => {
    if (repoUrl) {
      set((state) => {
        const newCache = { ...state.repoCache };
        delete newCache[repoUrl];
        return { repoCache: newCache };
      });
    } else {
      set({ repoCache: {} });
    }
  },
});
