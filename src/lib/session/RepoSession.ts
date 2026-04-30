/**
 * RepoSession — Plain TS class that owns the provider lifecycle.
 *
 * Extracted from useProviderLoader to enable independent unit testing
 * and decouple business logic from React state management.
 */

import { GitHubProvider } from '@/features/github';
import { ChromeBridge } from '@/lib/chrome';
import { ProviderError } from '@/lib/providers/types';
import type { IProvider, CacheAdapter } from '@/lib/providers/types';
import type { FileNode, ProviderType, TreeNode } from '@/types';
import type { RepoSnapshot } from '@/store/slices/cacheSlice';

// ============================================================================
// Interfaces
// ============================================================================

export interface RepoSessionState {
  provider: IProvider | null;
  repoName: string;
  isLoading: boolean;
}

export interface RepoSessionCallbacks {
  onStateChange: (state: RepoSessionState) => void;
  onError: (error: { message: string; recovery?: () => void; recoveryLabel?: string }) => void;
  onOutputClear: () => void;
}

export interface StoreAdapter {
  // Getters
  getNodes(): FileNode[];
  getTree(): TreeNode[];
  getSelectedPaths(): Set<string>;
  getExpandedPaths(): Set<string>;
  getExcludedPaths(): Set<string>;
  getExtensions(): Map<string, { count: number; selected: boolean }>;
  getGitignorePatterns(): string[];
  getProviderType(): ProviderType | null;
  getRepoUrl(): string;
  getPat(): string;

  // Setters
  setNodes(nodes: FileNode[]): void;
  setTree(tree: TreeNode[]): void;
  setGitignorePatterns(patterns: string[]): void;
  setProviderType(type: ProviderType): void;
  setRepoUrl(url: string): void;
  batchSetState(state: Record<string, unknown>): void;

  // Cache operations
  snapshotRepoState(url: string, snapshot: RepoSnapshot): void;
  restoreRepoState(url: string): RepoSnapshot | null;
  addRecentRepo(url: string, name: string): void;
}

// ============================================================================
// RepoSession
// ============================================================================

export class RepoSession {
  private provider: IProvider | null = null;
  private repoName: string = 'repo-export';
  private loading: boolean = false;
  private abortController: AbortController | null = null;
  private callbacks: RepoSessionCallbacks;
  private store: StoreAdapter;

  constructor(callbacks: RepoSessionCallbacks, storeAdapter: StoreAdapter) {
    this.callbacks = callbacks;
    this.store = storeAdapter;
  }

  /**
   * Create a CacheAdapter backed by the store.
   */
  createStoreCacheAdapter(): CacheAdapter {
    return {
      getCachedRepo: (key: string) => {
        const cached = this.store.restoreRepoState(key);
        return cached ? { data: cached.data } : null;
      },
      setCachedRepo: (key: string, data: FileNode[]) => {
        this.store.snapshotRepoState(key, {
          data,
          fileTree: this.store.getTree(),
          selectedPaths: [],
          expandedPaths: [],
          excludedPaths: [],
          extensions: [],
          gitignorePatterns: [],
          providerType: this.store.getProviderType(),
          repoUrl: key,
          repoName: this.repoName,
        });
      },
    };
  }

  /**
   * Create a GitHub provider with optional PAT credentials.
   */
  createGitHubProvider(pat?: string): IProvider {
    const provider = new GitHubProvider();
    if (pat) {
      provider.setCredentials({ token: pat });
    }
    provider.setCacheAdapter(this.createStoreCacheAdapter());
    return provider;
  }

  /**
   * Create a local provider for directory or zip input.
   */
  async createLocalProvider(
    source: 'directory' | 'zip',
    input: FileSystemDirectoryHandle | FileList | File
  ): Promise<IProvider> {
    const { LocalProvider } = await import('@/features/local');
    const provider = new LocalProvider();

    if (source === 'directory') {
      const isHandle =
        input &&
        'values' in input &&
        typeof (input as FileSystemDirectoryHandle).values === 'function';
      if (isHandle) {
        await provider.initialize({
          source: 'directory',
          directoryHandle: input as FileSystemDirectoryHandle,
        });
      } else {
        await provider.initialize({ source: 'directory', files: input as FileList });
      }
    } else {
      await provider.initialize({ source: 'zip', zipFile: input as File });
    }

    return provider;
  }

  /**
   * Load files from a provider. Snapshots current state first,
   * checks cache, then fetches if needed.
   */
  async loadFiles(provider: IProvider, url: string): Promise<FileNode[] | null> {
    // Snapshot current state before loading new repo
    this.snapshotCurrentState();

    // Cancel any in-progress load
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    try {
      this.provider = provider;
      this.loading = true;
      this.callbacks.onStateChange(this.getState());
      this.callbacks.onOutputClear();

      ChromeBridge.setProcessingState({ repoUrl: url, status: 'loading', timestamp: Date.now() });

      // Check if we have a fresh cached version
      const cached = this.store.restoreRepoState(url);
      if (cached) {
        this.store.setNodes(cached.data);
        this.store.setTree(cached.fileTree);
        this.store.setGitignorePatterns(cached.gitignorePatterns);

        this.store.batchSetState({
          selectedPaths: new Set(cached.selectedPaths),
          expandedPaths: new Set(cached.expandedPaths),
          excludedPaths: new Set(cached.excludedPaths),
          extensions: new Map(cached.extensions),
        });

        ChromeBridge.setProcessingState({
          repoUrl: url,
          status: 'loaded',
          timestamp: Date.now(),
        });

        this.store.addRecentRepo(url, this.repoName);

        this.loading = false;
        this.callbacks.onStateChange(this.getState());
        return cached.data;
      }

      // Fetch from provider
      const fetchedNodes = await provider.fetchTree(url, {
        signal: this.abortController.signal,
      });

      // Check if aborted after fetch
      if (this.abortController.signal.aborted) {
        ChromeBridge.clearProcessingState();
        this.loading = false;
        this.callbacks.onStateChange(this.getState());
        return null;
      }

      ChromeBridge.setProcessingState({
        repoUrl: url,
        status: 'loaded',
        timestamp: Date.now(),
      });

      this.store.setNodes(fetchedNodes);
      this.store.addRecentRepo(url, this.repoName);

      this.loading = false;
      this.callbacks.onStateChange(this.getState());
      return fetchedNodes;
    } catch (err) {
      this.loading = false;
      this.callbacks.onStateChange(this.getState());

      if (err instanceof Error && err.name === 'AbortError') {
        ChromeBridge.clearProcessingState();
        return null;
      }

      ChromeBridge.clearProcessingState();

      if (err instanceof ProviderError) {
        this.callbacks.onError({
          message: err.userMessage,
          recovery: err.recovery,
          recoveryLabel: err.recovery ? 'Create GitHub Token' : undefined,
        });
      } else {
        this.callbacks.onError({
          message: err instanceof Error ? err.message : 'Failed to load files. Please try again.',
        });
      }

      return null;
    }
  }

  /**
   * Cancel the current in-progress load.
   */
  cancelLoad(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.loading) {
      this.loading = false;
      this.callbacks.onStateChange(this.getState());
    }
  }

  /**
   * Snapshot current repo state before switching to a new one.
   */
  snapshotCurrentState(): void {
    const currentRepoUrl = this.store.getRepoUrl();
    const currentNodes = this.store.getNodes();

    if (!currentRepoUrl || currentNodes.length === 0) return;

    const snapshot: RepoSnapshot = {
      data: currentNodes,
      fileTree: this.store.getTree(),
      selectedPaths: Array.from(this.store.getSelectedPaths()),
      expandedPaths: Array.from(this.store.getExpandedPaths()),
      excludedPaths: Array.from(this.store.getExcludedPaths()),
      extensions: Array.from(this.store.getExtensions().entries()),
      gitignorePatterns: this.store.getGitignorePatterns(),
      providerType: this.store.getProviderType(),
      repoUrl: currentRepoUrl,
      repoName: this.repoName,
    };

    this.store.snapshotRepoState(currentRepoUrl, snapshot);
  }

  /**
   * Restore a previously cached repo state without re-fetching.
   */
  restoreCachedRepo(url: string): boolean {
    const snapshot = this.store.restoreRepoState(url);
    if (!snapshot) return false;

    // Restore all state from snapshot
    this.store.setNodes(snapshot.data);
    this.store.setTree(snapshot.fileTree);
    this.store.setGitignorePatterns(snapshot.gitignorePatterns);
    this.store.setProviderType(snapshot.providerType);
    this.store.setRepoUrl(snapshot.repoUrl);
    this.repoName = snapshot.repoName;

    // Set/restore the provider instance for file fetching
    if (snapshot.providerType === 'github') {
      this.provider = this.createGitHubProvider(this.store.getPat());
    }

    // Restore selection/expansion/exclusion state
    this.store.batchSetState({
      selectedPaths: new Set(snapshot.selectedPaths),
      expandedPaths: new Set(snapshot.expandedPaths),
      excludedPaths: new Set(snapshot.excludedPaths),
      extensions: new Map(snapshot.extensions),
    });

    // Add back to recent repos
    this.store.addRecentRepo(url, snapshot.repoName);

    this.callbacks.onStateChange(this.getState());
    return true;
  }

  /**
   * Set the repo name (called by the hook when user submits).
   */
  setRepoName(name: string): void {
    this.repoName = name;
  }

  /**
   * Get the current repo name.
   */
  getRepoName(): string {
    return this.repoName;
  }

  /**
   * Get the current state snapshot.
   */
  getState(): RepoSessionState {
    return {
      provider: this.provider,
      repoName: this.repoName,
      isLoading: this.loading,
    };
  }

  /**
   * Reset all session state.
   */
  reset(): void {
    this.provider = null;
    this.repoName = 'repo-export';
    this.loading = false;

    this.store.setNodes([]);
    this.store.setTree([]);
    this.store.setGitignorePatterns([]);

    this.callbacks.onStateChange(this.getState());
  }
}
