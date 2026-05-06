import { useState, useCallback, useRef, useEffect } from 'react';
import { RepoSession } from '@/lib/session';
import type { StoreAdapter } from '@/lib/session';
import { extractGitHubRepoName, extractLocalName } from '@/lib/utils/repoName';
import { useStore } from '@/store';
import type { FileSystemDirectoryHandle } from '@/types';
import type { IProvider } from '@/lib/providers/types';

interface UseProviderLoaderOpts {
  onOutputClear: () => void;
}

/**
 * Create a StoreAdapter that bridges RepoSession to the Zustand store.
 * This keeps the store dependency in the hook layer, not in the domain class.
 */
function createStoreAdapter(): StoreAdapter {
  const store = useStore.getState;
  return {
    getNodes: () => store().nodes,
    getTree: () => store().getTree(),
    getSelectedPaths: () => store().selectedPaths,
    getExpandedPaths: () => store().expandedPaths,
    getExcludedPaths: () => store().excludedPaths,
    getExtensions: () => store().extensions,
    getGitignorePatterns: () => store().gitignorePatterns,
    getProviderType: () => store().providerType,
    getRepoUrl: () => store().repoUrl,
    getPat: () => store().pat,

    setNodes: (nodes) => store().setNodes(nodes),
    setTree: (tree) => store().setTree(tree),
    setGitignorePatterns: (patterns) => store().setGitignorePatterns(patterns),
    setProviderType: (type) => store().setProviderType(type),
    setRepoUrl: (url) => store().setRepoUrl(url),
    batchSetState: (state) => useStore.setState(state as Parameters<typeof useStore.setState>[0]),

    snapshotRepoState: (url, snapshot) => store().snapshotRepoState(url, snapshot),
    restoreRepoState: (url) => store().restoreRepoState(url),
    addRecentRepo: (url, name) => store().addRecentRepo(url, name),
  };
}

export function useProviderLoader(opts: UseProviderLoaderOpts) {
  const { onOutputClear } = opts;

  const [currentProvider, setCurrentProvider] = useState<IProvider | null>(null);
  const [repoName, setRepoNameState] = useState<string>('repo-export');
  const [error, setError] = useState<{
    message: string;
    recovery?: () => void;
    recoveryLabel?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const shouldAutoExpandRootRef = useRef(false);

  // Stable ref for onOutputClear to avoid re-creating session
  const onOutputClearRef = useRef(onOutputClear);
  useEffect(() => {
    onOutputClearRef.current = onOutputClear;
  });
  // Create a single RepoSession instance (lazy init via useEffect to avoid render-time ref access)
  const sessionRef = useRef<RepoSession | null>(null);
  useEffect(() => {
    if (sessionRef.current === null) {
      sessionRef.current = new RepoSession(
        {
          onStateChange: (state) => {
            setCurrentProvider(state.provider);
            setRepoNameState(state.repoName);
            setIsLoading(state.isLoading);
          },
          onError: (err) => {
            setError(err);
          },
          onOutputClear: () => {
            onOutputClearRef.current();
          },
        },
        createStoreAdapter()
      );
    }
  }, []);
  const session = sessionRef.current!;

  // Handle GitHub submission
  const handleGitHubSubmit = useCallback(
    async (url: string) => {
      const name = extractGitHubRepoName(url);
      session.setRepoName(name);
      setRepoNameState(name);

      const provider = session.createGitHubProvider(useStore.getState().pat);
      try {
        await session.loadFiles(provider, url, { providerType: 'github', repoName: name });
      } catch {
        // loadFiles already called onError — nothing else to do
      }
    },
    [session]
  );

  // Handle local directory submission
  const handleLocalDirectorySubmit = useCallback(
    async (filesOrHandle: FileList | FileSystemDirectoryHandle) => {
      useStore.getState().setProviderType('local');

      const isHandle =
        filesOrHandle && 'values' in filesOrHandle && typeof filesOrHandle.values === 'function';
      const name = isHandle
        ? (filesOrHandle as FileSystemDirectoryHandle).name
        : extractLocalName(filesOrHandle as FileList);
      session.setRepoName(name);
      setRepoNameState(name);

      const provider = await session.createLocalProvider('directory', filesOrHandle);

      shouldAutoExpandRootRef.current = true;

      await session.loadFiles(provider, 'local://directory');
    },
    [session]
  );

  // Handle local zip submission
  const handleLocalZipSubmit = useCallback(
    async (file: File) => {
      useStore.getState().setProviderType('local');
      const name = extractLocalName(file);
      session.setRepoName(name);
      setRepoNameState(name);

      const provider = await session.createLocalProvider('zip', file);

      await session.loadFiles(provider, 'local://zip');
    },
    [session]
  );

  /**
   * Switch to a previously loaded repo from recent history.
   * Attempts to restore from cache first; falls back to re-fetch for GitHub.
   */
  const switchToRepo = useCallback(
    async (url: string) => {
      // Snapshot current before switching
      session.snapshotCurrentState();

      // Try cache restore (only works for GitHub repos with fresh cache)
      const restored = session.restoreCachedRepo(url);
      if (restored) return;

      // Fallback: re-fetch for GitHub URLs
      if (url.startsWith('https://github.com/')) {
        await handleGitHubSubmit(url);
      }
      // Local repos can't be auto-restored
    },
    [session, handleGitHubSubmit]
  );

  // Reset provider state
  const resetProviderState = useCallback(() => {
    session.reset();
    setError(null);
    onOutputClear();
  }, [session, onOutputClear]);

  // Cancel load
  const cancelLoad = useCallback(() => {
    session.cancelLoad();
  }, [session]);

  const loadFiles = useCallback(() => session.loadFiles(), [session]);
  const snapshotCurrentState = useCallback(() => session.snapshotCurrentState(), [session]);

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
