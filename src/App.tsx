import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useChromeTab } from '@/hooks/useChromeTab';
import { useGeneration } from '@/hooks/useGeneration';
import { useProviderLoader } from '@/hooks/useProviderLoader';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { SettingsMenu } from '@/components/ui/SettingsMenu';
import { ErrorDialog } from '@/components/ui/ErrorDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { ProviderSelector } from '@/components/ProviderSelector';
import { AdvancedFilters } from '@/components/AdvancedFilters';
import { FileTree } from '@/components/file-tree';
import { OutputPanel } from '@/components/OutputPanel';
import { buildTree, extractDirectories } from '@/lib/tree-builder';
import { useStore } from '@/store';
import type { ExtensionFilter as ExtensionFilterType, FileNode } from '@/types';
function App() {
  // Get file tree state from store
  const {
    nodes,
    selectedPaths,
    excludedPaths,
    expandedPaths,
    extensions,
    gitignorePatterns,
    showExcludedFiles,
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
    setShowExcludedFiles,
    showTokenCount,
    showLineCount,
    autoExpandDirectories,
  } = useStore((state) => state);

  // Ref to hold output clear callback (set later after useGeneration provides setOutput)
  const clearOutputRef = useRef<() => void>(() => {});
  const {
    currentProvider,
    repoName,
    error,
    isLoading,
    cancelLoad,
    handleGitHubSubmit,
    handleLocalDirectorySubmit,
    handleLocalZipSubmit,
    setError,
    shouldAutoExpandRootRef,
    pendingAction,
    confirmPendingAction,
    cancelPendingAction,
  } = useProviderLoader({
    onOutputClear: () => clearOutputRef.current(),
  });
  // Chrome tab detection
  const { initialUrl, autoSubmitUrl } = useChromeTab(isLoading, () => clearOutputRef.current());

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

  // Auto-expand root directories when tree first loads
  useEffect(() => {
    if (tree.length > 0 && tree.length === nodes.length) {
      const shouldExpand = autoExpandDirectories || shouldAutoExpandRootRef.current;
      if (shouldExpand) {
        shouldAutoExpandRootRef.current = false;
        tree.forEach((node) => {
          if (node.type === 'directory') {
            toggleExpanded(node.path);
          }
        });
      }
    }
  }, [tree, toggleExpanded, shouldAutoExpandRootRef, autoExpandDirectories, nodes.length]);

  // Auto-expand root directories when tree first loads
  useEffect(() => {
    if (tree.length > 0 && tree.length === nodes.length) {
      const shouldExpand = autoExpandDirectories || shouldAutoExpandRootRef.current;
      if (shouldExpand) {
        shouldAutoExpandRootRef.current = false;
        tree.forEach((node) => {
          if (node.type === 'directory') {
            toggleExpanded(node.path);
          }
        });
      }
    }
  }, [tree, toggleExpanded, shouldAutoExpandRootRef, autoExpandDirectories, nodes.length]);

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

  // Generation
  const {
    output,
    isGenerating,
    generateOutput: handleGenerateOutput,
    outputRef,
    setOutput,
  } = useGeneration({
    currentProvider,
    getSelectedNodes,
    nodes,
    selectedPaths,
    excludedPaths,
    showExcluded: showExcludedFiles,
    getDirectorySelectionState,
    onError: (err) => setError(err),
  });
  // Wire up output clear ref after setOutput is available
  useEffect(() => {
    clearOutputRef.current = () => setOutput(null);
  });
  return (
    <div className="min-h-[500px] w-[600px] mx-auto flex flex-col bg-gray-50 dark:bg-gray-900 shadow-xl">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex h-12 items-center justify-between px-3">
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-bold text-gray-900 dark:text-gray-100">repo2txt</h1>
            <span className="rounded-full bg-primary-100 dark:bg-primary-900 px-1.5 py-0.5 text-[11px] font-semibold text-primary-700 dark:text-primary-300">
              v2.0 Beta
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SettingsMenu />
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
                showExcluded={showExcludedFiles}
                onToggleExcluded={setShowExcludedFiles}
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
                  <div className="flex items-center gap-2">
                    {isLoading && (
                      <Button variant="secondary" size="sm" onClick={cancelLoad}>
                        Cancel
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleGenerateOutput}
                      disabled={isLoading || isGenerating}
                      data-testid="generate-output-button"
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-3.5 h-3.5 mr-1.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <FileTree
                  nodes={tree}
                  onToggle={toggleExpanded}
                  onSelect={toggleSelection}
                  showExcluded={showExcludedFiles}
                  maxHeight={300}
                />
              </div>
            </section>
          )}
          {/* Output */}
          {(output || isGenerating) && (
            <section ref={outputRef}>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Output
              </h2>
              <OutputPanel
                output={output}
                isLoading={isGenerating}
                repoName={repoName}
                showTokenCount={showTokenCount}
                showLineCount={showLineCount}
              />
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

      {/* Confirm Dialog */}
      {pendingAction && (
        <ConfirmDialog
          title="Replace existing tree?"
          message={pendingAction.message}
          onConfirm={confirmPendingAction}
          onCancel={cancelPendingAction}
        />
      )}
    </div>
  );
}

export default App;
