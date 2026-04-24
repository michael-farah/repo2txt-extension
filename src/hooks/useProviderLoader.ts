import { useState, useCallback, useRef } from 'react';
import { GitHubProvider } from '@/features/github';
import { ProviderError } from '@/lib/providers/types';
import { extractGitHubRepoName, extractLocalName } from '@/lib/utils/repoName';
import { useStore } from '@/store';
import { useLoadQueue } from '@/hooks/useLoadQueue';
import type { FileSystemDirectoryHandle, ProviderType } from '@/types';
import type { IProvider } from '@/lib/providers/types';
import type { RepoSnapshot } from '@/store/slices/cacheSlice';


interface UseProviderLoaderOpts {
  onOutputClear: () => void;
}

export function useProviderLoader(opts: UseProviderLoaderOpts) {
  const { onOutputClear } = opts;
  const {
    setProviderType,
    setRepoUrl,
    setNodes,
    setTree,
    setGitignorePatterns,
    snapshotRepoState,
    restoreRepoState,
    addRecentRepo,
    // Direct state setters for restore
    selectedPaths,
    expandedPaths,
    excludedPaths,
    extensions,
    gitignorePatterns: currentGitignorePatterns,
    nodes: currentNodes,
    tree: currentTree,
    providerType: currentProviderType,
    repoUrl: currentRepoUrl,
  } = useStore((state) => state);

  const [currentProvider, setCurrentProvider] = useState<IProvider | null>(null);
  const [repoName, setRepoName] = useState<string>('repo-export');
  const [error, setError] = useState<{
    message: string;
    recovery?: () => void;
    recoveryLabel?: string;
  } | null>(null);
  const shouldAutoExpandRootRef = useRef(false);

  const { loading: isLoading, start: startLoad, cancel: cancelLoad } = useLoadQueue();

  /**
   * Snapshot current repo state before switching to a new one.
   * Saves selection, expansion, exclusion state to the cache.
   */
  const snapshotCurrentState = useCallback(() => {
    if (!currentRepoUrl || currentNodes.length === 0) return;

    const snapshot: RepoSnapshot = {
      data: currentNodes,
      fileTree: currentTree,
      selectedPaths: Array.from(selectedPaths),
      expandedPaths: Array.from(expandedPaths),
      excludedPaths: Array.from(excludedPaths),
      extensions: Array.from(extensions.entries()),
      gitignorePatterns: currentGitignorePatterns,
      providerType: currentProviderType,
      repoUrl: currentRepoUrl,
      repoName,
    };

    snapshotRepoState(currentRepoUrl, snapshot);
  }, [
    currentRepoUrl, currentNodes, currentTree, selectedPaths,
    expandedPaths, excludedPaths, extensions, currentGitignorePatterns,
    currentProviderType, repoName, snapshotRepoState,
  ]);

  /**
   * Restore a previously cached repo state without re-fetching.
   * Returns true if restore succeeded, false if no cached state.
   */
  const restoreCachedRepo = useCallback(
    (url: string): boolean => {
      const snapshot = restoreRepoState(url);
      if (!snapshot) return false;

      // Restore all state from snapshot
      setNodes(snapshot.data);
      setTree(snapshot.fileTree);
      setGitignorePatterns(snapshot.gitignorePatterns);
      setProviderType(snapshot.providerType);
      setRepoUrl(snapshot.repoUrl);
      setRepoName(snapshot.repoName);

      // Set/restore the provider instance for file fetching
      if (snapshot.providerType === 'github') {
        const provider = new GitHubProvider();
        const { pat } = useStore.getState();
        if (pat) {
          provider.setCredentials({ token: pat });
        }
        setCurrentProvider(provider);
      }
      // Local providers can't be restored (directory handles are lost)
      // The user would need to re-select the directory

      // Restore selection/expansion/exclusion state via store batch update
      useStore.setState({
        selectedPaths: new Set(snapshot.selectedPaths),
        expandedPaths: new Set(snapshot.expandedPaths),
        excludedPaths: new Set(snapshot.excludedPaths),
        extensions: new Map(snapshot.extensions),
      });

      // Add back to recent repos
      addRecentRepo(url, snapshot.repoName);

      return true;
    },
    [restoreRepoState, setNodes, setTree, setGitignorePatterns, setProviderType, setRepoUrl, addRecentRepo],
  );

  // Load files from provider
  const loadFiles = useCallback(
    async (provider: IProvider, url: string) => {
      // Snapshot current state before loading new repo
      snapshotCurrentState();

      try {
        setCurrentProvider(provider);
        onOutputClear();

        if (typeof chrome !== 'undefined' && chrome.storage?.session) {
          chrome.storage.session.set({
            processingState: { repoUrl: url, status: 'loading', timestamp: Date.now() },
          });
        }

        // Check if we have a fresh cached version
        const cached = restoreRepoState(url);
        if (cached) {
          // Use cached data — skip fetch
          setNodes(cached.data);
          setTree(cached.fileTree);
          setGitignorePatterns(cached.gitignorePatterns);

          useStore.setState({
            selectedPaths: new Set(cached.selectedPaths),
            expandedPaths: new Set(cached.expandedPaths),
            excludedPaths: new Set(cached.excludedPaths),
            extensions: new Map(cached.extensions),
          });

          if (typeof chrome !== 'undefined' && chrome.storage?.session) {
            chrome.storage.session.set({
              processingState: { repoUrl: url, status: 'loaded', timestamp: Date.now() },
            });
          }

          addRecentRepo(url, repoName);
          return;
        }

        const fetchedNodes = await startLoad(provider, url);

        if (fetchedNodes === null) {
          if (typeof chrome !== 'undefined' && chrome.storage?.session) {
            chrome.storage.session.remove('processingState');
          }
          return;
        }

        if (typeof chrome !== 'undefined' && chrome.storage?.session) {
          chrome.storage.session.set({
            processingState: { repoUrl: url, status: 'loaded', timestamp: Date.now() },
          });
        }

        setNodes(fetchedNodes);
        addRecentRepo(url, repoName);
      } catch (err) {
        console.error('Failed to load files:', err);

        if (err instanceof Error && err.name === 'AbortError') {
          if (typeof chrome !== 'undefined' && chrome.storage?.session) {
            chrome.storage.session.remove('processingState');
          }
          return;
        }

        if (typeof chrome !== 'undefined' && chrome.storage?.session) {
          chrome.storage.session.remove('processingState');
        }

        if (err instanceof ProviderError) {
          setError({
            message: err.userMessage,
            recovery: err.recovery,
            recoveryLabel: err.recovery ? 'Create GitHub Token' : undefined,
          });
        } else {
          setError({
            message: err instanceof Error ? err.message : 'Failed to load files. Please try again.',
          });
        }
      }
    },
    [setNodes, startLoad, onOutputClear, snapshotCurrentState, restoreRepoState, addRecentRepo, repoName],
  );

  // Handle GitHub submission
  const handleGitHubSubmit = useCallback(
    async (url: string) => {
      setProviderType('github');
      setRepoUrl(url);
      setRepoName(extractGitHubRepoName(url));

      const provider = new GitHubProvider();
      const { pat } = useStore.getState();
      if (pat) {
        provider.setCredentials({ token: pat });
      }

      await loadFiles(provider, url);
    },
    [loadFiles, setProviderType, setRepoUrl],
  );

  // Handle local directory submission
  const handleLocalDirectorySubmit = useCallback(
    async (filesOrHandle: FileList | FileSystemDirectoryHandle) => {
      setProviderType('local');

      const isHandle =
        filesOrHandle && 'values' in filesOrHandle && typeof filesOrHandle.values === 'function';
      setRepoName(
        isHandle
          ? (filesOrHandle as FileSystemDirectoryHandle).name
          : extractLocalName(filesOrHandle as FileList),
      );

      const { LocalProvider } = await import('@/features/local');
      const provider = new LocalProvider();

      if (isHandle) {
        await provider.initialize({ source: 'directory', directoryHandle: filesOrHandle });
      } else {
        await provider.initialize({ source: 'directory', files: filesOrHandle as FileList });
      }

      shouldAutoExpandRootRef.current = true;

      await loadFiles(provider, 'local://directory');
    },
    [loadFiles, setProviderType],
  );

  // Handle local zip submission
  const handleLocalZipSubmit = useCallback(
    async (file: File) => {
      setProviderType('local');
      setRepoName(extractLocalName(file));

      const { LocalProvider } = await import('@/features/local');
      const provider = new LocalProvider();
      await provider.initialize({ source: 'zip', zipFile: file });

      await loadFiles(provider, 'local://zip');
    },
    [loadFiles, setProviderType],
  );

  /**
   * Switch to a previously loaded repo from recent history.
   * Attempts to restore from cache first; falls back to re-fetch for GitHub.
   */
  const switchToRepo = useCallback(
    async (url: string) => {
      // Snapshot current before switching
      snapshotCurrentState();

      // Try cache restore (only works for GitHub repos with fresh cache)
      const restored = restoreCachedRepo(url);
      if (restored) return;

      // Fallback: re-fetch for GitHub URLs
      if (url.startsWith('https://github.com/')) {
        await handleGitHubSubmit(url);
      }
      // Local repos can't be auto-restored
    },
    [snapshotCurrentState, restoreCachedRepo, handleGitHubSubmit],
  );

  // Reset provider state
  const resetProviderState = useCallback(() => {
    setCurrentProvider(null);
    setError(null);
    setNodes([]);
    setTree([]);
    setGitignorePatterns([]);
    onOutputClear();
  }, [setNodes, setTree, setGitignorePatterns, onOutputClear]);

  return {
    currentProvider,
    repoName,
    error,
    isLoading,
    cancelLoad,
    loadFiles,
    handleGitHubSubmit,
    handleLocalDirectorySubmit,
    handleLocalZipSubmit,
    switchToRepo,
    snapshotCurrentState,
    setError,
    shouldAutoExpandRootRef,
    resetProviderState,
  };
}
