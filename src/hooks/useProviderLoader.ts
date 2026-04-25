import { useState, useCallback, useRef } from 'react';
import { GitHubProvider } from '@/features/github';
import { ProviderError } from '@/lib/providers/types';
import { extractGitHubRepoName, extractLocalName } from '@/lib/utils/repoName';
import { useStore } from '@/store';
import { useLoadQueue } from '@/hooks/useLoadQueue';
import type { FileSystemDirectoryHandle } from '@/types';
import type { IProvider } from '@/lib/providers/types';
import { logger } from '@/lib/utils/logger';

interface UseProviderLoaderOpts {
  onOutputClear: () => void;
}

export function useProviderLoader(opts: UseProviderLoaderOpts) {
  const { onOutputClear } = opts;
  const { setProviderType, setRepoUrl, setNodes, setTree, setGitignorePatterns, nodes } =
    useStore();

  const [currentProvider, setCurrentProvider] = useState<IProvider | null>(null);
  const [repoName, setRepoName] = useState<string>('repo-export');
  const [error, setError] = useState<{
    message: string;
    recovery?: () => void;
    recoveryLabel?: string;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    action: () => void;
    message: string;
  } | null>(null);
  const shouldAutoExpandRootRef = useRef(false);

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
        logger.error('repo2txt', 'Failed to load files:', err);

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

  // Reset provider state
  const resetProviderState = useCallback(() => {
    setCurrentProvider(null);
    setError(null);
    setNodes([]);
    setTree([]);
    setGitignorePatterns([]);
    onOutputClear();
  }, [setNodes, setTree, setGitignorePatterns, onOutputClear]);

  // Handle GitHub submission
  const handleGitHubSubmit = useCallback(
    async (url: string) => {
      const { repoUrl } = useStore.getState();
      if (url !== repoUrl && nodes.length > 0) {
        setPendingAction({
          action: async () => {
            resetProviderState();
            setProviderType('github');
            setRepoUrl(url);
            setRepoName(extractGitHubRepoName(url));

            const provider = new GitHubProvider();
            const { pat } = useStore.getState();
            if (pat) {
              provider.setCredentials({ token: pat });
            }

            await loadFiles(provider, url);
            setPendingAction(null);
          },
          message:
            'Loading a new repository will replace the current file tree. Any selected files and generated output will be lost.',
        });
        return;
      }

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
    [loadFiles, setProviderType, setRepoUrl, resetProviderState, nodes.length]
  );

  // Handle local directory submission
  const handleLocalDirectorySubmit = useCallback(
    async (filesOrHandle: FileList | FileSystemDirectoryHandle) => {
      if (nodes.length > 0) {
        setPendingAction({
          action: async () => {
            setProviderType('local');
            resetProviderState();

            const isHandle =
              filesOrHandle &&
              'values' in filesOrHandle &&
              typeof filesOrHandle.values === 'function';
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

            shouldAutoExpandRootRef.current = true;

            await loadFiles(provider, 'local://directory');
            setPendingAction(null);
          },
          message:
            'Loading a new directory will replace the current file tree. Any selected files and generated output will be lost.',
        });
        return;
      }

      setProviderType('local');
      resetProviderState();

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

      shouldAutoExpandRootRef.current = true;

      await loadFiles(provider, 'local://directory');
    },
    [loadFiles, setProviderType, resetProviderState, nodes.length]
  );

  // Handle local zip submission
  const handleLocalZipSubmit = useCallback(
    async (file: File) => {
      if (nodes.length > 0) {
        setPendingAction({
          action: async () => {
            setProviderType('local');
            setRepoName(extractLocalName(file));
            resetProviderState();

            const { LocalProvider } = await import('@/features/local');
            const provider = new LocalProvider();
            await provider.initialize({ source: 'zip', zipFile: file });

            await loadFiles(provider, 'local://zip');
            setPendingAction(null);
          },
          message:
            'Loading a new zip file will replace the current file tree. Any selected files and generated output will be lost.',
        });
        return;
      }

      setProviderType('local');
      setRepoName(extractLocalName(file));
      resetProviderState();

      const { LocalProvider } = await import('@/features/local');
      const provider = new LocalProvider();
      await provider.initialize({ source: 'zip', zipFile: file });

      await loadFiles(provider, 'local://zip');
    },
    [loadFiles, setProviderType, resetProviderState, nodes.length]
  );

  // Confirm pending action
  const confirmPendingAction = useCallback(() => {
    if (pendingAction) {
      pendingAction.action();
    }
  }, [pendingAction]);

  // Cancel pending action
  const cancelPendingAction = useCallback(() => {
    setPendingAction(null);
  }, []);

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
    shouldAutoExpandRootRef,
    resetProviderState,
    pendingAction,
    confirmPendingAction,
    cancelPendingAction,
  };
}
