import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ErrorDialog } from '@/components/ui/ErrorDialog';
import { ProviderSelector } from '@/components/ProviderSelector';
import { AdvancedFilters } from '@/components/AdvancedFilters';
import { FileTree } from '@/components/file-tree';
import { OutputPanel } from '@/components/OutputPanel';
import { ProviderError } from '@/lib/providers/types';
import { GitHubProvider } from '@/features/github';
import { Formatter } from '@/lib/formatter';
import { buildTree, extractDirectories } from '@/lib/tree-builder';
import { extractGitHubRepoName, extractLocalName } from '@/lib/utils/repoName';
import { useStore } from '@/store';
import type {
  FileNode,
  FileContent,
  ExtensionFilter as ExtensionFilterType,
  FormattedOutput,
  FileSystemDirectoryHandle,
} from '@/types';
import type { IProvider } from '@/lib/providers/types';

interface ProcessingState {
  repoUrl: string;
  status: 'loading' | 'loaded' | 'generating';
  timestamp: number;
}

function App() {
  const { setProviderType, setRepoUrl } = useStore();

  // Get file tree state from store
  const {
    nodes,
    selectedPaths,
    excludedPaths,
    expandedPaths,
    extensions,
    gitignorePatterns,
    setNodes,
    setTree,
    toggleSelection,
    toggleExpanded,
    toggleExtension,
    setGitignorePatterns,
    getSelectedNodes,
    getDirectorySelectionState,
    getExtensionSelectionState,
    getGlobalSelectionState,
    selectAll,
    deselectAll,
  } = useStore((state) => state);

  // Local state
  const [isLoading, setIsLoading] = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);
  const [output, setOutput] = useState<FormattedOutput | null>(null);
  const [currentProvider, setCurrentProvider] = useState<IProvider | null>(null);
  const [repoName, setRepoName] = useState<string>('repo-export');
  const [error, setError] = useState<{
    message: string;
    recovery?: () => void;
    recoveryLabel?: string;
  } | null>(null);
  const [initialUrl, setInitialUrl] = useState<string | undefined>(undefined);
  const [autoSubmitUrl, setAutoSubmitUrl] = useState<string | undefined>(undefined);
  const shouldAutoExpandRoot = useRef(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  // Initialization: check processing state, pending URL, and auto-detect current tab
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initialize = async () => {
      // Skip if not in Chrome extension context
      if (typeof chrome === 'undefined' || !chrome.storage?.session) return;

      try {
        const provider = new GitHubProvider();
        let currentTabUrl: string | undefined;

        // Get current tab URL first
        if (chrome.tabs) {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab?.url && provider.validateUrl(tab.url)) {
            currentTabUrl = tab.url;
          }
        }

        // 1. Check for existing processing state
        const stateResult = await chrome.storage.session.get('processingState');
        const processingState = stateResult.processingState as ProcessingState | undefined;
        
        if (processingState?.repoUrl) {
          // If we're on a NEW GitHub page and previous processing finished, discard old state
          if (currentTabUrl && currentTabUrl !== processingState.repoUrl && processingState.status === 'loaded') {
            await chrome.storage.session.remove('processingState');
            
            // Clear store state for the new repo
            useStore.getState().setNodes([]);
            useStore.getState().setTree([]);
            useStore.getState().setGitignorePatterns([]);
            setOutput(null);
            
            setInitialUrl(currentTabUrl);
            // We don't auto-submit the new URL, let the user click Generate
            return;
          }

          setInitialUrl(processingState.repoUrl);
          setAutoSubmitUrl(processingState.repoUrl);
          return;
        }

        // 2. Check for legacy pendingRepoUrl (content script clicked "Convert to Text")
        const pendingResult = await chrome.storage.session.get('pendingRepoUrl');
        if (pendingResult.pendingRepoUrl) {
          const url = pendingResult.pendingRepoUrl as string;
          setInitialUrl(url);
          setAutoSubmitUrl(url);
          chrome.storage.session.remove('pendingRepoUrl');
          return;
        }

        // 3. Auto-detect current tab URL (if it's a GitHub repo page)
        if (currentTabUrl) {
          setInitialUrl(currentTabUrl);
        }
      } catch {
        // Session storage or tabs API unavailable — user can paste URL manually
      }
    };

    initialize();
  }, []);

  // Listen for tab URL changes and active tab switches to auto-update the URL input
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.tabs) return;

    const provider = new GitHubProvider();

    const handleTabUpdate = async (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      if (changeInfo.url && provider.validateUrl(changeInfo.url) && !isLoading) {
        // Only update if the tab is the active tab in the current window
        if (tab.active) {
          try {
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (activeTab && activeTab.id === tabId) {
              setInitialUrl(changeInfo.url);
            }
          } catch {
            // Ignore errors
          }
        }
      }
    };

    const handleTabActivated = async (activeInfo: chrome.tabs.TabActiveInfo) => {
      try {
        // Only update if the activated tab is in the current window
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab && activeTab.id === activeInfo.tabId && activeTab.url && provider.validateUrl(activeTab.url) && !isLoading) {
          setInitialUrl(activeTab.url);
        }
      } catch {
        // Tab may have been closed
      }
    };

    chrome.tabs.onUpdated.addListener(handleTabUpdate);
    chrome.tabs.onActivated.addListener(handleTabActivated);

    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdate);
      chrome.tabs.onActivated.removeListener(handleTabActivated);
    };
  }, [isLoading]);

  // Build tree from nodes with current selection/expansion state
  const tree = useMemo(() => {
    if (nodes.length === 0) return [];

    // Extract directory paths that don't already exist as nodes
    const existingPaths = new Set(nodes.map((n) => n.path));
    const dirPaths = extractDirectories(nodes);
    const newDirNodes = dirPaths
      .filter((path) => !existingPaths.has(path))
      .map((path) => ({
        path,
        type: 'tree' as const,
      }));

    const allNodes: FileNode[] = [...nodes, ...newDirNodes];

    return buildTree(allNodes, {
      selectedPaths,
      excludedPaths,
      expandedPaths,
      getDirectorySelectionState,
    });
  }, [nodes, selectedPaths, excludedPaths, expandedPaths, getDirectorySelectionState]);

  // Convert extensions map to array for ExtensionFilter component
  const extensionList: ExtensionFilterType[] = useMemo(() => {
    return Array.from(extensions.entries()).map(([ext, data]) => {
      const state = getExtensionSelectionState(ext);
      return {
        extension: ext,
        count: data.count,
        selected: state === 'checked',
        indeterminate: state === 'indeterminate',
      };
    });
  }, [extensions, getExtensionSelectionState]);

  // Reset all state (store + local)
  const resetAll = useCallback(() => {
    setNodes([]);
    setTree([]);
    setGitignorePatterns([]);

    setOutput(null);
    setCurrentProvider(null);
    setShowExcluded(false);
    setInitialUrl(undefined);
    setAutoSubmitUrl(undefined);

    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
      chrome.storage.session.remove('processingState');
    }
  }, [
    setNodes,
    setTree,
    setGitignorePatterns,
    setOutput,
    setCurrentProvider,
    setShowExcluded,
    setInitialUrl,
    setAutoSubmitUrl,
  ]);

  // Auto-expand root directories for local directory uploads
  useEffect(() => {
    if (shouldAutoExpandRoot.current && tree.length > 0) {
      shouldAutoExpandRoot.current = false;
      // Expand all root-level directories
      tree.forEach((node) => {
        if (node.type === 'directory') {
          toggleExpanded(node.path);
        }
      });
    }
  }, [tree, toggleExpanded]);

  // Load files from provider
  const loadFiles = useCallback(
    async (provider: IProvider, url: string) => {
      try {
        setIsLoading(true);
        setCurrentProvider(provider);
        setOutput(null);

        if (typeof chrome !== 'undefined' && chrome.storage?.session) {
          chrome.storage.session.set({
            processingState: { repoUrl: url, status: 'loading', timestamp: Date.now() },
          });
        }

        // Fetch file tree
        const fetchedNodes = await provider.fetchTree(url);

        if (typeof chrome !== 'undefined' && chrome.storage?.session) {
          chrome.storage.session.set({
            processingState: { repoUrl: url, status: 'loaded', timestamp: Date.now() },
          });
        }

        // Update store with nodes (this will auto-select code files)
        setNodes(fetchedNodes);
      } catch (err) {
        console.error('Failed to load files:', err);

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
      } finally {
        setIsLoading(false);
      }
    },
    [setNodes]
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

      // Dynamically import Local provider (code splitting)
      const { LocalProvider } = await import('@/features/local');
      const provider = new LocalProvider();

      if (isHandle) {
        await provider.initialize({ source: 'directory', directoryHandle: filesOrHandle });
      } else {
        await provider.initialize({ source: 'directory', files: filesOrHandle as FileList });
      }

      // Set flag to auto-expand root after tree is built
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

      // Dynamically import Local provider (code splitting)
      const { LocalProvider } = await import('@/features/local');
      const provider = new LocalProvider();
      await provider.initialize({ source: 'zip', zipFile: file });

      await loadFiles(provider, 'local://zip');
    },
    [loadFiles, setProviderType]
  );

  // Handle extension filter toggle
  const handleExtensionToggle = useCallback(
    (extension: string) => {
      toggleExtension(extension);
    },
    [toggleExtension]
  );

  // Handle select/deselect all extensions
  const handleSelectAllExtensions = useCallback(() => {
    extensionList.forEach((ext) => {
      if (!ext.selected) {
        toggleExtension(ext.extension);
      }
    });
  }, [extensionList, toggleExtension]);

  const handleDeselectAllExtensions = useCallback(() => {
    extensionList.forEach((ext) => {
      if (ext.selected) {
        toggleExtension(ext.extension);
      }
    });
  }, [extensionList, toggleExtension]);

  // Handle gitignore pattern application
  const handleApplyGitignore = useCallback(
    (patterns: string[]) => {
      setGitignorePatterns(patterns);
    },
    [setGitignorePatterns]
  );

  // Handle global checkbox toggle
  const handleGlobalToggle = useCallback(() => {
    const state = getGlobalSelectionState();
    if (state === 'checked') {
      deselectAll();
    } else {
      selectAll();
    }
  }, [getGlobalSelectionState, selectAll, deselectAll]);

  // Get global checkbox state
  const globalCheckboxState = useMemo(() => {
    return getGlobalSelectionState();
  }, [getGlobalSelectionState]);

  // Handle generate output
  const handleGenerateOutput = useCallback(async () => {
    if (!currentProvider) return;

    try {
      setIsLoading(true);

      const selectedNodes = getSelectedNodes();

      if (selectedNodes.length === 0) {
        setError({
          message:
            'No files selected.\n\nPlease select at least one file to generate output. You can:\n• Click the checkbox next to "File Tree" to select all files\n• Expand directories and select individual files\n• Use the Extension Filter to select files by type',
        });
        return;
      }

      if (typeof chrome !== 'undefined' && chrome.storage?.session) {
        chrome.storage.session.get('processingState').then((result) => {
          const existing = result.processingState as ProcessingState | undefined;
          if (existing) {
            chrome.storage.session.set({
              processingState: { ...existing, status: 'generating', timestamp: Date.now() },
            });
          }
        });
      }

      // Fetch file contents
      const fileContents: FileContent[] = [];
      for await (const content of currentProvider.fetchMultiple(selectedNodes)) {
        fileContents.push(content);
      }

      // Build a fully expanded tree for output (ignore UI expansion state)
      const existingPaths = new Set(nodes.map((n) => n.path));
      const dirPaths = extractDirectories(nodes);
      const newDirNodes = dirPaths
        .filter((path) => !existingPaths.has(path))
        .map((path) => ({
          path,
          type: 'tree' as const,
        }));
      let allNodes: FileNode[] = [...nodes, ...newDirNodes];

      // Filter out excluded files and directories if showExcluded is false
      if (!showExcluded) {
        allNodes = allNodes.filter((n) => !excludedPaths.has(n.path));
      }

      // Build tree with all directories expanded (pass all paths as expanded)
      const allDirPaths = new Set(allNodes.filter((n) => n.type === 'tree').map((n) => n.path));
      const fullTree = buildTree(allNodes, {
        selectedPaths,
        excludedPaths: showExcluded ? excludedPaths : new Set(), // Clear excluded paths if not showing them
        expandedPaths: allDirPaths, // All directories expanded for output
        getDirectorySelectionState,
      });

      // Format output with full tree (using async Web Worker for better performance)
      const formattedOutput = await Formatter.formatAsync(
        fullTree,
        fileContents,
        (progress, current, total) => {
          // Progress callback - could show progress UI here
          console.log(`Tokenizing: ${current}/${total} files (${progress.toFixed(1)}%)`);
        }
      );

      setOutput(formattedOutput);

      setTimeout(() => {
        outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      console.error('Failed to generate output:', err);

      if (err instanceof ProviderError) {
        setError({
          message: err.userMessage,
          recovery: err.recovery,
          recoveryLabel: err.recovery ? 'Create GitHub Token' : undefined,
        });
      } else {
        setError({
          message:
            err instanceof Error ? err.message : 'Failed to generate output. Please try again.',
        });
      }
    } finally {
      setIsLoading(false);

      if (typeof chrome !== 'undefined' && chrome.storage?.session) {
        chrome.storage.session.get('processingState').then((result) => {
          const existing = result.processingState as ProcessingState | undefined;
          if (existing?.status === 'generating') {
            chrome.storage.session.set({
              processingState: { ...existing, status: 'loaded', timestamp: Date.now() },
            });
          }
        });
      }
    }
  }, [
    currentProvider,
    getSelectedNodes,
    nodes,
    selectedPaths,
    excludedPaths,
    getDirectorySelectionState,
    showExcluded,
  ]);

  return (
    <div className="min-h-[500px] w-[600px] mx-auto flex flex-col bg-gray-50 dark:bg-gray-900 shadow-xl">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex h-12 items-center justify-between px-3">
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-bold text-gray-900 dark:text-gray-100">repo2txt</h1>
            <span className="rounded-full bg-primary-100 dark:bg-primary-900 px-1.5 py-0.5 text-[9px] font-semibold text-primary-700 dark:text-primary-300">
              v2.0 Beta
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a
              href="https://github.com/michael-farah/repo2txt-extension"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
              title="View on GitHub"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-3 py-3 overflow-y-auto">
        <div className="space-y-4">
          {/* Provider Selection */}
          <section>
            <ProviderSelector
              onGitHubSubmit={handleGitHubSubmit}
              onLocalDirectorySubmit={handleLocalDirectorySubmit}
              onLocalZipSubmit={handleLocalZipSubmit}
              onProviderChange={resetAll}
              disabled={isLoading}
              initialUrl={initialUrl}
              autoSubmitUrl={autoSubmitUrl}
            />
          </section>

          {/* Filters and File Tree */}
          {tree.length > 0 && (
            <section className="space-y-3">
              {/* Advanced Filters - Collapsed by default */}
              <AdvancedFilters
                extensions={extensionList}
                onExtensionToggle={handleExtensionToggle}
                onSelectAllExtensions={handleSelectAllExtensions}
                onDeselectAllExtensions={handleDeselectAllExtensions}
                gitignorePatterns={gitignorePatterns}
                onApplyGitignore={handleApplyGitignore}
                onResetGitignore={() => setGitignorePatterns([])}
                showExcluded={showExcluded}
                onToggleExcluded={setShowExcluded}
              />

              {/* File Tree */}
              <div className="space-y-2" data-testid="file-tree-section">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={globalCheckboxState === 'checked'}
                        ref={(input) => {
                          if (input) {
                            input.indeterminate = globalCheckboxState === 'indeterminate';
                          }
                        }}
                        onChange={handleGlobalToggle}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800"
                        aria-label="Select all files"
                      />
                      <h2
                        className="text-sm font-semibold text-gray-900 dark:text-gray-100"
                        data-testid="file-tree-heading"
                      >
                        File Tree
                      </h2>
                    </label>
                  </div>
                  <button
                    onClick={handleGenerateOutput}
                    disabled={isLoading}
                    data-testid="generate-output-button"
                    className="inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 h-8 px-3 text-xs touch-manipulation"
                  >
                    <svg
                      className="w-3.5 h-3.5 mr-1.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <span>Generate</span>
                  </button>
                </div>

                <FileTree
                  nodes={tree}
                  onToggle={toggleExpanded}
                  onSelect={toggleSelection}
                  showExcluded={showExcluded}
                  maxHeight={300}
                />
              </div>
            </section>
          )}

          {/* Output */}
          {(output || isLoading) && (
            <section ref={outputRef}>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Output
              </h2>
              <OutputPanel output={output} isLoading={isLoading} repoName={repoName} />
            </section>
          )}
        </div>
      </main>

      {/* Error Dialog */}
      {error && (
        <ErrorDialog
          title="Unable to Complete Request"
          message={error.message}
          onClose={() => setError(null)}
          onAction={error.recovery}
          actionLabel={error.recoveryLabel}
        />
      )}
    </div>
  );
}

export default App;
