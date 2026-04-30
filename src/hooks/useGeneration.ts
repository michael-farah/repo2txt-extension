import { useState, useCallback, useRef } from 'react';
import { Formatter } from '@/lib/formatter';
import { ProviderError } from '@/lib/providers/types';
import { ChromeBridge } from '@/lib/chrome';
import type { FileNode, FileContent, FormattedOutput, TreeNode } from '@/types';
import type { IProvider } from '@/lib/providers/types';
import { logger } from '@/lib/utils/logger';

type SelectionState = 'checked' | 'unchecked' | 'indeterminate';

interface UseGenerationOpts {
  currentProvider: IProvider | null;
  getSelectedNodes: () => FileNode[];
  nodes: FileNode[];
  selectedPaths: Set<string>;
  excludedPaths: Set<string>;
  showExcluded: boolean;
  getDirectorySelectionState: (path: string) => SelectionState;
  getFullTree: () => TreeNode[];
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
    getFullTree,
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

      ChromeBridge.updateProcessingStatus('generating');

      // Fetch file contents with abort support
      const fileContents: FileContent[] = [];
      for await (const content of currentProvider.fetchMultiple(
        selectedNodes,
        abortController.signal
      )) {
        fileContents.push(content);
      }

      // Get fully expanded tree for output (excluded filtered based on showExcluded)
      const fullTree = getFullTree();

      // Format output with full tree (using async Web Worker for better performance)
      const formattedOutput = await Formatter.formatAsync(
        fullTree,
        fileContents,
        (progress, current, total) => {
          // Progress callback - could show progress UI here
          logger.info(
            'generation',
            `Tokenizing: ${current}/${total} files (${progress.toFixed(1)}%)`
          );
        }
      );

      setOutput(formattedOutput);

      setTimeout(() => {
        outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      logger.error('generation', 'Failed to generate output:', err);

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
          message:
            err instanceof Error ? err.message : 'Failed to generate output. Please try again.',
        });
      }
    } finally {
      setIsGenerating(false);

      ChromeBridge.updateProcessingStatus('loaded');
    }
  }, [
    currentProvider,
    getSelectedNodes,
    nodes,
    selectedPaths,
    excludedPaths,
    getDirectorySelectionState,
    showExcluded,
    getFullTree,
    onError,
  ]);

  return { output, isGenerating, generateOutput, outputRef, setOutput };
}
