import { useState, useCallback, useRef } from 'react';
import { Formatter } from '@/lib/formatter';
import { buildTree, extractDirectories } from '@/lib/tree-builder';
import { ProviderError } from '@/lib/providers/types';
import type { FileNode, FileContent, FormattedOutput } from '@/types';
import type { IProvider } from '@/lib/providers/types';

interface ProcessingState {
  repoUrl: string;
  status: 'loading' | 'loaded' | 'generating';
  timestamp: number;
}

type SelectionState = 'checked' | 'unchecked' | 'indeterminate';

interface UseGenerationOpts {
  currentProvider: IProvider | null;
  getSelectedNodes: () => FileNode[];
  nodes: FileNode[];
  selectedPaths: Set<string>;
  excludedPaths: Set<string>;
  showExcluded: boolean;
  getDirectorySelectionState: (path: string) => SelectionState;
  onError: (error: { message: string; recovery?: () => void; recoveryLabel?: string }) => void;
}

export function useGeneration(opts: UseGenerationOpts) {
  const {
    currentProvider,
    getSelectedNodes,
    nodes,
    selectedPaths,
    excludedPaths,
    showExcluded,
    getDirectorySelectionState,
    onError,
  } = opts;

  const [output, setOutput] = useState<FormattedOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const generateOutput = useCallback(async () => {
    if (!currentProvider) return;

    // Create an AbortController for the generation
    const abortController = new AbortController();

    try {
      setIsGenerating(true);

      const selectedNodes = getSelectedNodes();

      if (selectedNodes.length === 0) {
        onError({
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

      // Fetch file contents with abort support
      const fileContents: FileContent[] = [];
      for await (const content of currentProvider.fetchMultiple(selectedNodes, abortController.signal)) {
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

      // Don't show error dialog for aborted requests
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      if (err instanceof ProviderError) {
        onError({
          message: err.userMessage,
          recovery: err.recovery,
          recoveryLabel: err.recovery ? 'Create GitHub Token' : undefined,
        });
      } else {
        onError({
          message: err instanceof Error ? err.message : 'Failed to generate output. Please try again.',
        });
      }
    } finally {
      setIsGenerating(false);

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
    onError,
  ]);

  return { output, isGenerating, generateOutput, outputRef, setOutput };
}
