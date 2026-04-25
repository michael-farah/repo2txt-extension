import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { create } from 'zustand';
import { createCacheSlice, type CacheSlice } from '../cacheSlice';
import type { FileNode, TreeNode } from '@/types';

const mockFileNodes: FileNode[] = [
  { path: 'src/index.ts', type: 'blob', url: 'https://api.github.com/repos/test' },
  { path: 'src/utils.ts', type: 'blob', url: 'https://api.github.com/repos/test' },
];

const mockTreeNodes: TreeNode[] = [
  { name: 'index.ts', path: 'src/index.ts', type: 'file' },
  { name: 'utils.ts', path: 'src/utils.ts', type: 'file' },
];

function createStore() {
  return create<CacheSlice>()(createCacheSlice);
}

describe('cacheSlice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('setCachedRepo / getCachedRepo', () => {
    test('stores and retrieves cached repo data', () => {
      const store = createStore();
      store.getState().setCachedRepo('https://github.com/owner/repo', mockFileNodes, mockTreeNodes);

      const cached = store.getState().getCachedRepo('https://github.com/owner/repo');
      expect(cached).not.toBeNull();
      expect(cached!.data).toEqual(mockFileNodes);
      expect(cached!.fileTree).toEqual(mockTreeNodes);
      expect(cached!.timestamp).toBe(Date.now());
    });

    test('returns null for uncached repo', () => {
      const store = createStore();
      expect(store.getState().getCachedRepo('https://github.com/other/repo')).toBeNull();
    });

    test('caches multiple repos independently', () => {
      const store = createStore();
      const otherFiles: FileNode[] = [{ path: 'lib/main.rs', type: 'blob' }];
      const otherTree: TreeNode[] = [{ name: 'main.rs', path: 'lib/main.rs', type: 'file' }];

      store.getState().setCachedRepo('https://github.com/a/repo', mockFileNodes, mockTreeNodes);
      store.getState().setCachedRepo('https://github.com/b/repo', otherFiles, otherTree);

      const cachedA = store.getState().getCachedRepo('https://github.com/a/repo');
      const cachedB = store.getState().getCachedRepo('https://github.com/b/repo');

      expect(cachedA!.data).toEqual(mockFileNodes);
      expect(cachedB!.data).toEqual(otherFiles);
    });
  });

  describe('TTL expiry', () => {
    test('returns cached data within TTL', () => {
      const store = createStore();
      store.getState().setCachedRepo('https://github.com/owner/repo', mockFileNodes, mockTreeNodes);

      vi.advanceTimersByTime(23 * 60 * 60 * 1000);

      expect(store.getState().getCachedRepo('https://github.com/owner/repo')).not.toBeNull();
    });

    test('returns null and clears cache after 24h TTL', () => {
      const store = createStore();
      store.getState().setCachedRepo('https://github.com/owner/repo', mockFileNodes, mockTreeNodes);

      vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);

      expect(store.getState().getCachedRepo('https://github.com/owner/repo')).toBeNull();
      expect(store.getState().repoCache['https://github.com/owner/repo']).toBeUndefined();
    });
  });

  describe('clearCache', () => {
    test('clears specific repo when repoUrl provided', () => {
      const store = createStore();
      store.getState().setCachedRepo('https://github.com/a/repo', mockFileNodes, mockTreeNodes);
      store.getState().setCachedRepo('https://github.com/b/repo', mockFileNodes, mockTreeNodes);

      store.getState().clearCache('https://github.com/a/repo');

      expect(store.getState().getCachedRepo('https://github.com/a/repo')).toBeNull();
      expect(store.getState().getCachedRepo('https://github.com/b/repo')).not.toBeNull();
    });

    test('clears all repos when no repoUrl provided', () => {
      const store = createStore();
      store.getState().setCachedRepo('https://github.com/a/repo', mockFileNodes, mockTreeNodes);
      store.getState().setCachedRepo('https://github.com/b/repo', mockFileNodes, mockTreeNodes);

      store.getState().clearCache();

      expect(store.getState().repoCache).toEqual({});
    });

    test('clearCache with non-existent key is a no-op', () => {
      const store = createStore();
      store.getState().setCachedRepo('https://github.com/a/repo', mockFileNodes, mockTreeNodes);

      store.getState().clearCache('https://github.com/nonexistent/repo');

      expect(store.getState().getCachedRepo('https://github.com/a/repo')).not.toBeNull();
    });
  });

  describe('snapshotRepoState', () => {
    test('saves full UI state to cache', () => {
      const store = createStore();
      const snapshot = {
        data: mockFileNodes,
        fileTree: mockTreeNodes,
        selectedPaths: ['src/index.ts'],
        expandedPaths: ['src'],
        excludedPaths: [],
        extensions: [['.ts', { count: 2, selected: true }]],
        gitignorePatterns: ['node_modules/'],
        providerType: 'github' as const,
        repoUrl: 'https://github.com/owner/repo',
        repoName: 'repo',
      };

      store.getState().snapshotRepoState('https://github.com/owner/repo', snapshot);

      const cached = store.getState().getCachedRepo('https://github.com/owner/repo');
      expect(cached).not.toBeNull();
      expect(cached!.data).toEqual(mockFileNodes);
      expect(cached!.fileTree).toEqual(mockTreeNodes);
      expect(cached!.selectedPaths).toEqual(['src/index.ts']);
      expect(cached!.expandedPaths).toEqual(['src']);
      expect(cached!.gitignorePatterns).toEqual(['node_modules/']);
      expect(cached!.providerType).toBe('github');
      expect(cached!.repoName).toBe('repo');
    });

    test('updates existing cache entry with snapshot', () => {
      const store = createStore();

      // First create a basic cache entry
      store.getState().setCachedRepo('https://github.com/owner/repo', mockFileNodes, mockTreeNodes);

      // Then snapshot with full state
      const snapshot = {
        data: mockFileNodes,
        fileTree: mockTreeNodes,
        selectedPaths: ['src/index.ts', 'src/utils.ts'],
        expandedPaths: ['src', 'src/components'],
        excludedPaths: ['dist/'],
        extensions: [['.ts', { count: 2, selected: true }]],
        gitignorePatterns: ['node_modules/', 'dist/'],
        providerType: 'github' as const,
        repoUrl: 'https://github.com/owner/repo',
        repoName: 'repo',
      };

      store.getState().snapshotRepoState('https://github.com/owner/repo', snapshot);

      const cached = store.getState().getCachedRepo('https://github.com/owner/repo');
      expect(cached!.selectedPaths).toEqual(['src/index.ts', 'src/utils.ts']);
      expect(cached!.expandedPaths).toEqual(['src', 'src/components']);
      expect(cached!.excludedPaths).toEqual(['dist/']);
    });
  });

  describe('restoreRepoState', () => {
    test('returns null for missing cache entry', () => {
      const store = createStore();
      const restored = store.getState().restoreRepoState('https://github.com/nonexistent/repo');
      expect(restored).toBeNull();
    });

    test('returns null for stale cache entry', () => {
      const store = createStore();
      const snapshot = {
        data: mockFileNodes,
        fileTree: mockTreeNodes,
        selectedPaths: [],
        expandedPaths: [],
        excludedPaths: [],
        extensions: [],
        gitignorePatterns: [],
        providerType: 'github' as const,
        repoUrl: 'https://github.com/owner/repo',
        repoName: 'repo',
      };

      store.getState().snapshotRepoState('https://github.com/owner/repo', snapshot);

      // Advance time past TTL
      vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);

      const restored = store.getState().restoreRepoState('https://github.com/owner/repo');
      expect(restored).toBeNull();
    });

    test('returns snapshot without timestamp field', () => {
      const store = createStore();
      const snapshot = {
        data: mockFileNodes,
        fileTree: mockTreeNodes,
        selectedPaths: ['src/index.ts'],
        expandedPaths: ['src'],
        excludedPaths: [],
        extensions: [['.ts', { count: 2, selected: true }]],
        gitignorePatterns: ['node_modules/'],
        providerType: 'github' as const,
        repoUrl: 'https://github.com/owner/repo',
        repoName: 'repo',
      };

      store.getState().snapshotRepoState('https://github.com/owner/repo', snapshot);
      const restored = store.getState().restoreRepoState('https://github.com/owner/repo');

      expect(restored).not.toBeNull();
      expect(restored!.data).toEqual(mockFileNodes);
      expect(restored!.selectedPaths).toEqual(['src/index.ts']);
      // Should not have timestamp field
      expect('timestamp' in restored!).toBe(false);
    });

    test('returns full snapshot data correctly', () => {
      const store = createStore();
      const snapshot = {
        data: mockFileNodes,
        fileTree: mockTreeNodes,
        selectedPaths: ['src/index.ts', 'src/utils.ts'],
        expandedPaths: ['src', 'src/lib'],
        excludedPaths: ['node_modules/'],
        extensions: [['.ts', { count: 2, selected: true }]],
        gitignorePatterns: ['node_modules/', '.env'],
        providerType: 'github' as const,
        repoUrl: 'https://github.com/owner/repo',
        repoName: 'my-repo',
      };

      store.getState().snapshotRepoState('https://github.com/owner/repo', snapshot);
      const restored = store.getState().restoreRepoState('https://github.com/owner/repo');

      expect(restored!.data).toEqual(mockFileNodes);
      expect(restored!.fileTree).toEqual(mockTreeNodes);
      expect(restored!.selectedPaths).toEqual(['src/index.ts', 'src/utils.ts']);
      expect(restored!.expandedPaths).toEqual(['src', 'src/lib']);
      expect(restored!.excludedPaths).toEqual(['node_modules/']);
      expect(restored!.extensions).toEqual([['.ts', { count: 2, selected: true }]]);
      expect(restored!.gitignorePatterns).toEqual(['node_modules/', '.env']);
      expect(restored!.providerType).toBe('github');
      expect(restored!.repoUrl).toBe('https://github.com/owner/repo');
      expect(restored!.repoName).toBe('my-repo');
    });
  });

  describe('addRecentRepo', () => {
    test('adds repo to recent list', () => {
      const store = createStore();
      store.getState().addRecentRepo('https://github.com/owner/repo', 'repo');

      expect(store.getState().recentRepos).toHaveLength(1);
      expect(store.getState().recentRepos[0].url).toBe('https://github.com/owner/repo');
      expect(store.getState().recentRepos[0].name).toBe('repo');
    });

    test('adds repo to front of list', () => {
      const store = createStore();
      store.getState().addRecentRepo('https://github.com/owner/first', 'first');
      store.getState().addRecentRepo('https://github.com/owner/second', 'second');

      expect(store.getState().recentRepos[0].name).toBe('second');
      expect(store.getState().recentRepos[1].name).toBe('first');
    });

    test('moves existing repo to front when added again (LRU behavior)', () => {
      const store = createStore();
      store.getState().addRecentRepo('https://github.com/owner/first', 'first');
      store.getState().addRecentRepo('https://github.com/owner/second', 'second');
      store.getState().addRecentRepo('https://github.com/owner/first', 'first');

      expect(store.getState().recentRepos).toHaveLength(2);
      expect(store.getState().recentRepos[0].name).toBe('first');
      expect(store.getState().recentRepos[1].name).toBe('second');
    });

    test('maintains maximum of 5 recent repos', () => {
      const store = createStore();
      store.getState().addRecentRepo('https://github.com/owner/1', '1');
      store.getState().addRecentRepo('https://github.com/owner/2', '2');
      store.getState().addRecentRepo('https://github.com/owner/3', '3');
      store.getState().addRecentRepo('https://github.com/owner/4', '4');
      store.getState().addRecentRepo('https://github.com/owner/5', '5');
      store.getState().addRecentRepo('https://github.com/owner/6', '6');

      expect(store.getState().recentRepos).toHaveLength(5);
      expect(store.getState().recentRepos[0].name).toBe('6');
      expect(store.getState().recentRepos[4].name).toBe('2');
      expect(store.getState().recentRepos.map((r) => r.name)).not.toContain('1');
    });

    test('updates timestamp when adding repo', () => {
      const store = createStore();
      const beforeTime = Date.now();
      store.getState().addRecentRepo('https://github.com/owner/repo', 'repo');
      const afterTime = Date.now();

      expect(store.getState().recentRepos[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(store.getState().recentRepos[0].timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('removeRecentRepo', () => {
    test('removes repo from recent list', () => {
      const store = createStore();
      store.getState().addRecentRepo('https://github.com/owner/repo', 'repo');
      store.getState().removeRecentRepo('https://github.com/owner/repo');

      expect(store.getState().recentRepos).toHaveLength(0);
    });

    test('removes only specified repo from list', () => {
      const store = createStore();
      store.getState().addRecentRepo('https://github.com/owner/first', 'first');
      store.getState().addRecentRepo('https://github.com/owner/second', 'second');
      store.getState().removeRecentRepo('https://github.com/owner/first');

      expect(store.getState().recentRepos).toHaveLength(1);
      expect(store.getState().recentRepos[0].name).toBe('second');
    });

    test('also removes associated cache entry', () => {
      const store = createStore();
      store.getState().setCachedRepo('https://github.com/owner/repo', mockFileNodes, mockTreeNodes);
      store.getState().addRecentRepo('https://github.com/owner/repo', 'repo');

      expect(store.getState().getCachedRepo('https://github.com/owner/repo')).not.toBeNull();

      store.getState().removeRecentRepo('https://github.com/owner/repo');

      expect(store.getState().getCachedRepo('https://github.com/owner/repo')).toBeNull();
    });

    test('is no-op for non-existent repo', () => {
      const store = createStore();
      store.getState().addRecentRepo('https://github.com/owner/repo', 'repo');
      store.getState().removeRecentRepo('https://github.com/owner/nonexistent');

      expect(store.getState().recentRepos).toHaveLength(1);
      expect(store.getState().recentRepos[0].name).toBe('repo');
    });
  });

  describe('LRU eviction', () => {
    test('evicts oldest non-recent entry when cache exceeds MAX_CACHE_ENTRIES', () => {
      const store = createStore();

      // Add 10 entries (at capacity)
      for (let i = 1; i <= 10; i++) {
        store.getState().setCachedRepo(`https://github.com/owner/repo${i}`, mockFileNodes, mockTreeNodes);
      }

      // Add one more - should evict oldest
      store.getState().setCachedRepo('https://github.com/owner/repo11', mockFileNodes, mockTreeNodes);

      expect(Object.keys(store.getState().repoCache)).toHaveLength(10);
      expect(store.getState().getCachedRepo('https://github.com/owner/repo1')).toBeNull();
      expect(store.getState().getCachedRepo('https://github.com/owner/repo11')).not.toBeNull();
    });

    test('does not evict recent repos during LRU eviction', () => {
      const store = createStore();

      // Add 10 entries
      for (let i = 1; i <= 10; i++) {
        store.getState().setCachedRepo(`https://github.com/owner/repo${i}`, mockFileNodes, mockTreeNodes);
      }

      // Mark first 5 as recent
      for (let i = 1; i <= 5; i++) {
        store.getState().addRecentRepo(`https://github.com/owner/repo${i}`, `repo${i}`);
      }

      // Add new entry - should evict from non-recent (repo6-10)
      store.getState().setCachedRepo('https://github.com/owner/repo11', mockFileNodes, mockTreeNodes);

      // Recent repos should still be cached
      expect(store.getState().getCachedRepo('https://github.com/owner/repo1')).not.toBeNull();
      expect(store.getState().getCachedRepo('https://github.com/owner/repo5')).not.toBeNull();
    });

    test('evicts oldest overall when all entries are recent', () => {
      const store = createStore();

      // Add 10 entries and mark all as recent
      for (let i = 1; i <= 10; i++) {
        store.getState().setCachedRepo(`https://github.com/owner/repo${i}`, mockFileNodes, mockTreeNodes);
        store.getState().addRecentRepo(`https://github.com/owner/repo${i}`, `repo${i}`);
      }

      // Advance time to ensure different timestamps
      vi.advanceTimersByTime(1000);

      // Add new entry
      store.getState().setCachedRepo('https://github.com/owner/repo11', mockFileNodes, mockTreeNodes);
      store.getState().addRecentRepo('https://github.com/owner/repo11', 'repo11');

      // Should still have 10 cache entries (MAX_CACHE_ENTRIES)
      expect(Object.keys(store.getState().repoCache)).toHaveLength(10);
      // But 5 recent repos (MAX_RECENT_REPOS)
      expect(store.getState().recentRepos).toHaveLength(5);
    });

    test('snapshotRepoState also triggers LRU eviction', () => {
      const store = createStore();

      // Fill cache to capacity
      for (let i = 1; i <= 10; i++) {
        store.getState().setCachedRepo(`https://github.com/owner/repo${i}`, mockFileNodes, mockTreeNodes);
      }

      const snapshot = {
        data: mockFileNodes,
        fileTree: mockTreeNodes,
        selectedPaths: [],
        expandedPaths: [],
        excludedPaths: [],
        extensions: [],
        gitignorePatterns: [],
        providerType: 'github' as const,
        repoUrl: 'https://github.com/owner/new',
        repoName: 'new',
      };

      store.getState().snapshotRepoState('https://github.com/owner/new', snapshot);

      expect(Object.keys(store.getState().repoCache)).toHaveLength(10);
      expect(store.getState().getCachedRepo('https://github.com/owner/new')).not.toBeNull();
    });
  });
});
