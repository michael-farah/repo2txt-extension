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
});
