import type { StateCreator } from 'zustand';
import type { FileNode, TreeNode, ProviderType } from '@/types';
import { normalizeGitHubUrl } from '@/lib/utils/repoName';

export interface RepoSnapshot {
  data: FileNode[];
  fileTree: TreeNode[];
  selectedPaths: string[];
  expandedPaths: string[];
  excludedPaths: string[];
  extensions: [string, { count: number; selected: boolean }][];
  gitignorePatterns: string[];
  providerType: ProviderType | null;
  repoUrl: string;
  repoName: string;
}

export interface CachedRepoData extends RepoSnapshot {
  timestamp: number;
}

export interface RecentRepo {
  url: string;
  name: string;
  timestamp: number;
}

export interface CacheSlice {
  repoCache: Record<string, CachedRepoData>;
  recentRepos: RecentRepo[];

  setCachedRepo: (repoUrl: string, data: FileNode[], fileTree: TreeNode[]) => void;
  getCachedRepo: (repoUrl: string) => CachedRepoData | null;
  clearCache: (repoUrl?: string) => void;
  snapshotRepoState: (repoUrl: string, state: RepoSnapshot) => void;
  restoreRepoState: (repoUrl: string) => RepoSnapshot | null;
  addRecentRepo: (repoUrl: string, repoName: string) => void;
  removeRecentRepo: (repoUrl: string) => void;
}

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MAX_CACHE_ENTRIES = 10;
const MAX_RECENT_REPOS = 5;

export const createCacheSlice: StateCreator<CacheSlice> = (set, get) => ({
  repoCache: {},
  recentRepos: [],

  setCachedRepo: (repoUrl: string, data: FileNode[], fileTree: TreeNode[]) => {
    set((state) => {
      const newCache = { ...state.repoCache };

      // Evict oldest non-recent entry if at capacity
      const cacheKeys = Object.keys(newCache);
      if (cacheKeys.length >= MAX_CACHE_ENTRIES && !(repoUrl in newCache)) {
        const recentUrls = new Set(state.recentRepos.map((r) => r.url));
        let oldestKey: string | null = null;
        let oldestTimestamp = Infinity;

        for (const key of cacheKeys) {
          if (recentUrls.has(key)) continue;
          const entry = newCache[key];
          if (entry.timestamp < oldestTimestamp) {
            oldestTimestamp = entry.timestamp;
            oldestKey = key;
          }
        }

        if (oldestKey) {
          delete newCache[oldestKey];
        } else {
          // All entries are recent — evict oldest overall
          for (const key of cacheKeys) {
            const entry = newCache[key];
            if (entry.timestamp < oldestTimestamp) {
              oldestTimestamp = entry.timestamp;
              oldestKey = key;
            }
          }
          if (oldestKey) {
            delete newCache[oldestKey];
          }
        }
      }

      newCache[repoUrl] = {
        timestamp: Date.now(),
        data,
        fileTree,
        selectedPaths: [],
        expandedPaths: [],
        excludedPaths: [],
        extensions: [],
        gitignorePatterns: [],
        providerType: null,
        repoUrl,
        repoName: '',
      };

      return { repoCache: newCache };
    });
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

  snapshotRepoState: (repoUrl: string, snapshot: RepoSnapshot) => {
    const normalizedUrl = normalizeGitHubUrl(repoUrl);
    set((state) => {
      const newCache = { ...state.repoCache };

      // Check if we need to evict entries
      const cacheKeys = Object.keys(newCache);
      if (cacheKeys.length >= MAX_CACHE_ENTRIES && !(normalizedUrl in newCache)) {
        // Find the oldest entry that is NOT in recentRepos
        const recentUrls = new Set(state.recentRepos.map((r) => r.url));
        let oldestKey: string | null = null;
        let oldestTimestamp = Infinity;

        for (const key of cacheKeys) {
          if (recentUrls.has(key)) continue; // Don't evict recent repos
          const entry = newCache[key];
          if (entry.timestamp < oldestTimestamp) {
            oldestTimestamp = entry.timestamp;
            oldestKey = key;
          }
        }

        // If we found a non-recent entry to evict, remove it
        if (oldestKey) {
          delete newCache[oldestKey];
        }
        // If all entries are recent, evict the oldest overall
        else {
          for (const key of cacheKeys) {
            const entry = newCache[key];
            if (entry.timestamp < oldestTimestamp) {
              oldestTimestamp = entry.timestamp;
              oldestKey = key;
            }
          }
          if (oldestKey) {
            delete newCache[oldestKey];
          }
        }
      }

      newCache[normalizedUrl] = {
        ...snapshot,
        timestamp: Date.now(),
      };

      return { repoCache: newCache };
    });
  },

  restoreRepoState: (repoUrl: string) => {
    const normalizedUrl = normalizeGitHubUrl(repoUrl);
    const cache = get().repoCache[normalizedUrl];
    if (!cache) return null;

    // Check TTL
    if (Date.now() - cache.timestamp > CACHE_TTL) {
      get().clearCache(normalizedUrl);
      return null;
    }

    // Return snapshot without timestamp
    const { timestamp: _, ...snapshot } = cache;
    return snapshot as RepoSnapshot;
  },

  addRecentRepo: (repoUrl: string, repoName: string) => {
    const normalizedUrl = normalizeGitHubUrl(repoUrl);
    set((state) => {
      // Remove if already exists (to move to front)
      const filtered = state.recentRepos.filter((r) => r.url !== normalizedUrl);

      // Add to front
      const newRecent = [
        { url: normalizedUrl, name: repoName, timestamp: Date.now() },
        ...filtered,
      ].slice(0, MAX_RECENT_REPOS);

      return { recentRepos: newRecent };
    });
  },

  removeRecentRepo: (repoUrl: string) => {
    set((state) => {
      const newRecent = state.recentRepos.filter((r) => r.url !== repoUrl);
      const newCache = { ...state.repoCache };
      delete newCache[repoUrl];
      return { recentRepos: newRecent, repoCache: newCache };
    });
  },
});
