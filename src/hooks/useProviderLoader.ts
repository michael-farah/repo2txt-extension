import { useState, useCallback, useRef } from 'react';
import { GitHubProvider } from '@/features/github';
import { ProviderError } from '@/lib/providers/types';
import { extractGitHubRepoName, extractLocalName } from '@/lib/utils/repoName';
import { useStore } from '@/store';
import { useLoadQueue } from '@/hooks/useLoadQueue';
import type { FileNode, FormattedOutput, FileSystemDirectoryHandle } from '@/types';
import type { IProvider } from '@/lib/providers/types';

interface ProcessingState {
  repoUrl: string;
  status: 'loading' | 'loaded' | 'generating';
  timestamp: number;
}

interface UseProviderLoaderOpts {
  onOutputClear: () => void;
  toggleExpanded: (path: string) => void;
}

export function useProviderLoader(opts: UseProviderLoaderOpts) {
  const { onOutputClear, toggleExpanded } = opts;
  const { setProviderType, setRepoUrl, setNodes, setTree, setGitignorePatterns } = useStore();

  const [currentProvider, setCurrentProvider] = useState<IProvider | null>(null);
  const [repoName, setRepoName] = useState<string>('repo-export');
  const [error, setError] = useState<{
    message: string;
    recovery?: () => void;
    recoveryLabel?: string;
  } | null>(null);
  const shouldAutoExpandRoot = useRef(false);

  const { loading: isLoading, start: startLoad, cancel: cancelLoad } = useLoadQueue();

  // Load files from provider
  const loadFiles = useCallback(
    async (provider: IProvider, url: string) => {
      try {
        setCurrentProvider(provider);
        onOutputClear();

        if (typeof chrome !== 'undefined' && chrome.storage?.session) {
          chrome.storage.session.set({
            processingState: { repoUrl: url, status: 'loading', timestamp: Date.now() },
          });
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
    [setNodes, startLoad, onOutputClear]
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
      } else {
        provider.setSessionMode(true);
      }

      await loadFiles(provider, url);
    },
    [loadFiles, setProviderType, setRepoUrl]
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
          : extractLocalName(filesOrHandle as FileList)
      );

      const { LocalProvider } = await import('@/features/local');
      const provider = new LocalProvider();

      if (isHandle) {
        await provider.initialize({ source: 'directory', directoryHandle: filesOrHandle });
      } else {
        await provider.initialize({ source: 'directory', files: filesOrHandle as FileList });
      }

      shouldAutoExpandRoot.current = true;

      await loadFiles(provider, 'local://directory');
    },
    [loadFiles, setProviderType]
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
    [loadFiles, setProviderType]
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
    setError,
    shouldAutoExpandRoot,
    resetProviderState,
  };
}
