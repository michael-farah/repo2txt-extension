import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RepoSession } from '../RepoSession';
import type { StoreAdapter } from '../RepoSession';
import type { RepoSessionCallbacks, RepoSessionState } from '../RepoSession';
import type {
  IProvider,
  CacheAdapter,
  ProviderError as ProviderErrorType,
} from '@/lib/providers/types';
import type { FileNode, ProviderType, TreeNode } from '@/types';
import type { RepoSnapshot } from '@/store/slices/cacheSlice';

// Mock GitHubProvider with a proper class constructor
vi.mock('@/features/github', () => {
  const MockGitHubProvider = vi.fn().mockImplementation(function () {
    this.getType = vi.fn().mockReturnValue('github');
    this.getName = vi.fn().mockReturnValue('GitHub');
    this.setCredentials = vi.fn();
    this.setCacheAdapter = vi.fn();
    this.fetchTree = vi.fn();
    this.fetchFile = vi.fn();
    this.fetchMultiple = vi.fn();
    this.getRepoInfo = vi.fn().mockReturnValue(null);
    this.validateUrl = vi.fn().mockReturnValue(true);
    this.parseUrl = vi.fn();
    this.reset = vi.fn();
    this.requiresAuth = vi.fn().mockReturnValue(true);
  });
  return { GitHubProvider: MockGitHubProvider };
});

function createMockStoreAdapter(overrides?: Partial<StoreAdapter>): StoreAdapter {
  return {
    getNodes: vi.fn().mockReturnValue([]),
    getTree: vi.fn().mockReturnValue([]),
    getSelectedPaths: vi.fn().mockReturnValue(new Set()),
    getExpandedPaths: vi.fn().mockReturnValue(new Set()),
    getExcludedPaths: vi.fn().mockReturnValue(new Set()),
    getExtensions: vi.fn().mockReturnValue(new Map()),
    getGitignorePatterns: vi.fn().mockReturnValue([]),
    getProviderType: vi.fn().mockReturnValue(null),
    getRepoUrl: vi.fn().mockReturnValue(''),
    getPat: vi.fn().mockReturnValue(''),
    setNodes: vi.fn(),
    setTree: vi.fn(),
    setGitignorePatterns: vi.fn(),
    setProviderType: vi.fn(),
    setRepoUrl: vi.fn(),
    batchSetState: vi.fn(),
    snapshotRepoState: vi.fn(),
    restoreRepoState: vi.fn().mockReturnValue(null),
    addRecentRepo: vi.fn(),
    ...overrides,
  };
}

function createMockProvider(overrides?: Partial<IProvider>): IProvider {
  return {
    getType: vi.fn().mockReturnValue('github'),
    getName: vi.fn().mockReturnValue('MockProvider'),
    setCredentials: vi.fn(),
    setCacheAdapter: vi.fn(),
    fetchTree: vi.fn().mockResolvedValue([]),
    fetchFile: vi.fn().mockResolvedValue({ path: 'test.ts', text: 'hello' }),
    fetchMultiple: vi.fn(),
    getRepoInfo: vi.fn().mockReturnValue(null),
    validateUrl: vi.fn().mockReturnValue(true),
    parseUrl: vi.fn(),
    reset: vi.fn(),
    requiresAuth: vi.fn().mockReturnValue(false),
    ...overrides,
  };
}

describe('RepoSession', () => {
  let storeAdapter: StoreAdapter;
  let callbacks: RepoSessionCallbacks;
  let onStateChange: ReturnType<typeof vi.fn>;
  let onError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    storeAdapter = createMockStoreAdapter();
    onStateChange = vi.fn();
    onError = vi.fn();
    callbacks = { onStateChange, onError, onOutputClear: vi.fn() };
  });

  describe('constructor', () => {
    it('should initialize with default state', () => {
      const session = new RepoSession(callbacks, storeAdapter);
      const state = session.getState();
      expect(state.provider).toBeNull();
      expect(state.repoName).toBe('repo-export');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('loadFiles', () => {
    it('should call snapshotCurrentState before loading', async () => {
      const session = new RepoSession(callbacks, storeAdapter);
      const provider = createMockProvider({
        fetchTree: vi
          .fn()
          .mockResolvedValue([
            { path: 'src/index.ts', type: 'blob' as const, url: 'https://example.com' },
          ]),
      });

      storeAdapter.getRepoUrl = vi.fn().mockReturnValue('https://github.com/old/repo');
      storeAdapter.getNodes = vi
        .fn()
        .mockReturnValue([
          { path: 'old/file.ts', type: 'blob' as const, url: 'https://example.com/old' },
        ]);

      await session.loadFiles(provider, 'https://github.com/new/repo');

      expect(storeAdapter.snapshotRepoState).toHaveBeenCalled();
    });

    it('should restore from cache if available and skip fetch', async () => {
      const snapshot: RepoSnapshot = {
        data: [{ path: 'cached.ts', type: 'blob' as const }],
        fileTree: [{ name: 'cached.ts', path: 'cached.ts', type: 'file' as const }],
        selectedPaths: ['cached.ts'],
        expandedPaths: [],
        excludedPaths: [],
        extensions: [],
        gitignorePatterns: [],
        providerType: 'github',
        repoUrl: 'https://github.com/test/repo',
        repoName: 'test-repo',
      };

      storeAdapter.restoreRepoState = vi.fn().mockReturnValue(snapshot);

      const session = new RepoSession(callbacks, storeAdapter);
      const provider = createMockProvider();

      await session.loadFiles(provider, 'https://github.com/test/repo');

      expect(storeAdapter.setNodes).toHaveBeenCalledWith(snapshot.data);
      expect(storeAdapter.setTree).toHaveBeenCalledWith(snapshot.fileTree);
      expect(storeAdapter.setGitignorePatterns).toHaveBeenCalledWith(snapshot.gitignorePatterns);
      expect(provider.fetchTree).not.toHaveBeenCalled();
    });

    it('should fetch files from provider when no cache exists', async () => {
      const nodes: FileNode[] = [
        { path: 'src/index.ts', type: 'blob' as const, url: 'https://example.com/file' },
      ];

      const session = new RepoSession(callbacks, storeAdapter);
      const provider = createMockProvider({
        fetchTree: vi.fn().mockResolvedValue(nodes),
      });

      const result = await session.loadFiles(provider, 'https://github.com/test/repo');

      expect(provider.fetchTree).toHaveBeenCalledWith('https://github.com/test/repo', {
        signal: expect.any(AbortSignal),
      });
      expect(storeAdapter.setNodes).toHaveBeenCalledWith(nodes);
      expect(result).toEqual(nodes);
    });

    it('should notify state changes during loading', async () => {
      const session = new RepoSession(callbacks, storeAdapter);
      const provider = createMockProvider({
        fetchTree: vi
          .fn()
          .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve([]), 10))),
      });

      const loadPromise = session.loadFiles(provider, 'https://github.com/test/repo');

      // Should have notified loading state
      expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({ isLoading: true }));

      await loadPromise;

      // Should have notified loaded state
      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ isLoading: false, provider })
      );
    });

    it('should handle abort during fetch', async () => {
      const session = new RepoSession(callbacks, storeAdapter);
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      const provider = createMockProvider({
        fetchTree: vi.fn().mockRejectedValue(abortError),
      });

      const result = await session.loadFiles(provider, 'https://github.com/test/repo');

      expect(result).toBeNull();
      expect(onError).not.toHaveBeenCalled();
    });

    it('should handle ProviderError during fetch', async () => {
      const { ProviderError, ErrorCode } = await import('@/lib/providers/types');
      const providerError = new ProviderError(
        'Not found',
        ErrorCode.NOT_FOUND,
        'Repository not found. Please check the URL.',
        undefined
      );

      const session = new RepoSession(callbacks, storeAdapter);
      const provider = createMockProvider({
        fetchTree: vi.fn().mockRejectedValue(providerError),
      });

      await session.loadFiles(provider, 'https://github.com/test/repo');

      expect(onError).toHaveBeenCalledWith({
        message: 'Repository not found. Please check the URL.',
        recovery: undefined,
        recoveryLabel: undefined,
      });
    });

    it('should handle generic errors during fetch', async () => {
      const session = new RepoSession(callbacks, storeAdapter);
      const provider = createMockProvider({
        fetchTree: vi.fn().mockRejectedValue(new Error('Network failure')),
      });

      await session.loadFiles(provider, 'https://github.com/test/repo');

      expect(onError).toHaveBeenCalledWith({
        message: 'Network failure',
      });
    });

    it('should set isLoading to false even when error occurs', async () => {
      const session = new RepoSession(callbacks, storeAdapter);
      const provider = createMockProvider({
        fetchTree: vi.fn().mockRejectedValue(new Error('fail')),
      });

      await session.loadFiles(provider, 'https://github.com/test/repo');

      const state = session.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('cancelLoad', () => {
    it('should abort an in-progress load', async () => {
      const session = new RepoSession(callbacks, storeAdapter);
      let resolveFetch!: (value: FileNode[]) => void;
      const fetchPromise = new Promise<FileNode[]>((resolve) => {
        resolveFetch = resolve;
      });

      const provider = createMockProvider({
        fetchTree: vi.fn().mockImplementation(
          () =>
            new Promise((resolve, reject) => {
              const abortError = new Error('Aborted');
              abortError.name = 'AbortError';
              // Simulate abort
              setTimeout(() => reject(abortError), 50);
            })
        ),
      });

      const loadPromise = session.loadFiles(provider, 'https://github.com/test/repo');

      // Cancel while loading
      session.cancelLoad();

      const result = await loadPromise;
      expect(result).toBeNull();
      expect(session.getState().isLoading).toBe(false);
    });

    it('should be safe to call when no load is in progress', () => {
      const session = new RepoSession(callbacks, storeAdapter);
      expect(() => session.cancelLoad()).not.toThrow();
    });
  });

  describe('snapshotCurrentState', () => {
    it('should create a snapshot of the current repo state', () => {
      const nodes: FileNode[] = [{ path: 'file.ts', type: 'blob' as const }];
      const selectedPaths = new Set(['file.ts']);
      const expandedPaths = new Set(['src']);
      const extensions = new Map([['.ts', { count: 1, selected: true }]]);

      storeAdapter.getNodes = vi.fn().mockReturnValue(nodes);
      storeAdapter.getTree = vi.fn().mockReturnValue([]);
      storeAdapter.getSelectedPaths = vi.fn().mockReturnValue(selectedPaths);
      storeAdapter.getExpandedPaths = vi.fn().mockReturnValue(expandedPaths);
      storeAdapter.getExcludedPaths = vi.fn().mockReturnValue(new Set());
      storeAdapter.getExtensions = vi.fn().mockReturnValue(extensions);
      storeAdapter.getGitignorePatterns = vi.fn().mockReturnValue(['node_modules']);
      storeAdapter.getProviderType = vi.fn().mockReturnValue('github');
      storeAdapter.getRepoUrl = vi.fn().mockReturnValue('https://github.com/test/repo');

      const session = new RepoSession(callbacks, storeAdapter);
      session.snapshotCurrentState();

      expect(storeAdapter.snapshotRepoState).toHaveBeenCalledWith(
        'https://github.com/test/repo',
        expect.objectContaining({
          data: nodes,
          selectedPaths: ['file.ts'],
          expandedPaths: ['src'],
          gitignorePatterns: ['node_modules'],
          providerType: 'github',
          repoUrl: 'https://github.com/test/repo',
        })
      );
    });

    it('should skip snapshot if no repo URL is set', () => {
      storeAdapter.getRepoUrl = vi.fn().mockReturnValue('');

      const session = new RepoSession(callbacks, storeAdapter);
      session.snapshotCurrentState();

      expect(storeAdapter.snapshotRepoState).not.toHaveBeenCalled();
    });

    it('should skip snapshot if no nodes loaded', () => {
      storeAdapter.getRepoUrl = vi.fn().mockReturnValue('https://github.com/test/repo');
      storeAdapter.getNodes = vi.fn().mockReturnValue([]);

      const session = new RepoSession(callbacks, storeAdapter);
      session.snapshotCurrentState();

      expect(storeAdapter.snapshotRepoState).not.toHaveBeenCalled();
    });
  });

  describe('restoreCachedRepo', () => {
    it('should restore state from snapshot and return true', () => {
      const snapshot: RepoSnapshot = {
        data: [{ path: 'file.ts', type: 'blob' as const }],
        fileTree: [{ name: 'file.ts', path: 'file.ts', type: 'file' as const }],
        selectedPaths: ['file.ts'],
        expandedPaths: [],
        excludedPaths: [],
        extensions: [],
        gitignorePatterns: [],
        providerType: 'github',
        repoUrl: 'https://github.com/test/repo',
        repoName: 'test-repo',
      };

      storeAdapter.restoreRepoState = vi.fn().mockReturnValue(snapshot);

      const session = new RepoSession(callbacks, storeAdapter);
      const result = session.restoreCachedRepo('https://github.com/test/repo');

      expect(result).toBe(true);
      expect(storeAdapter.setNodes).toHaveBeenCalledWith(snapshot.data);
      expect(storeAdapter.setTree).toHaveBeenCalledWith(snapshot.fileTree);
      expect(storeAdapter.setGitignorePatterns).toHaveBeenCalledWith(snapshot.gitignorePatterns);
      expect(storeAdapter.setProviderType).toHaveBeenCalledWith(snapshot.providerType);
      expect(storeAdapter.setRepoUrl).toHaveBeenCalledWith(snapshot.repoUrl);
      expect(storeAdapter.addRecentRepo).toHaveBeenCalledWith(
        'https://github.com/test/repo',
        'test-repo'
      );
    });

    it('should return false when no cached state exists', () => {
      storeAdapter.restoreRepoState = vi.fn().mockReturnValue(null);

      const session = new RepoSession(callbacks, storeAdapter);
      const result = session.restoreCachedRepo('https://github.com/test/repo');

      expect(result).toBe(false);
      expect(storeAdapter.setNodes).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should clear all session state', async () => {
      const session = new RepoSession(callbacks, storeAdapter);
      const provider = createMockProvider({
        fetchTree: vi
          .fn()
          .mockResolvedValue([{ path: 'file.ts', type: 'blob' as const, url: 'test' }]),
      });

      await session.loadFiles(provider, 'https://github.com/test/repo');
      expect(session.getState().provider).not.toBeNull();

      session.reset();

      const state = session.getState();
      expect(state.provider).toBeNull();
      expect(state.repoName).toBe('repo-export');
      expect(state.isLoading).toBe(false);

      expect(storeAdapter.setNodes).toHaveBeenCalledWith([]);
      expect(storeAdapter.setTree).toHaveBeenCalledWith([]);
      expect(storeAdapter.setGitignorePatterns).toHaveBeenCalledWith([]);
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      const session = new RepoSession(callbacks, storeAdapter);
      const state = session.getState();

      expect(state).toEqual({
        provider: null,
        repoName: 'repo-export',
        isLoading: false,
      });
    });
  });
});
