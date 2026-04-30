/**
 * GenerationPipeline — Plain TS class that owns the output generation pipeline.
 *
 * Extracted from useGeneration to enable independent unit testing
 * and decouple business logic from React state management.
 */

import { Formatter } from '@/lib/formatter';
import { ChromeBridge } from '@/lib/chrome';
import { ProviderError } from '@/lib/providers/types';
import type { IProvider } from '@/lib/providers/types';
import type { FileNode, FileContent, FormattedOutput, TreeNode } from '@/types';
import { logger } from '@/lib/utils/logger';

// ============================================================================
// Interfaces
// ============================================================================

export interface GenerationPipelineState {
  output: FormattedOutput | null;
  isGenerating: boolean;
}

export interface GenerationPipelineCallbacks {
  onStateChange: (state: GenerationPipelineState) => void;
  onError: (error: { message: string; recovery?: () => void; recoveryLabel?: string }) => void;
}

export interface GenerationInput {
  provider: IProvider;
  selectedNodes: FileNode[];
  tree: TreeNode[];
}

// ============================================================================
// GenerationPipeline
// ============================================================================

export class GenerationPipeline {
  private output: FormattedOutput | null = null;
  private generating: boolean = false;
  private abortController: AbortController | null = null;
  private callbacks: GenerationPipelineCallbacks;

  constructor(callbacks: GenerationPipelineCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Run the full generation pipeline:
   * 1. Validate selection
   * 2. Set ChromeBridge status to 'generating'
   * 3. Fetch file contents via provider
   * 4. Format output via Formatter
   * 5. Set output and notify
   * 6. Restore ChromeBridge status to 'loaded'
   */
  async generate(input: GenerationInput): Promise<FormattedOutput | null> {
    const { provider, selectedNodes, tree } = input;

    // Validate selection
    if (selectedNodes.length === 0) {
      this.callbacks.onError({
        message:
          'No files selected.\n\nPlease select at least one file to generate output. You can:\n• Click the checkbox next to "File Tree" to select all files\n• Expand directories and select individual files\n• Use the Extension Filter to select files by type',
      });
      return null;
    }

    // Create abort controller for this generation
    this.abortController = new AbortController();

    try {
      this.generating = true;
      this.callbacks.onStateChange(this.getState());

      ChromeBridge.updateProcessingStatus('generating');

      // Fetch file contents
      const fileContents: FileContent[] = [];
      for await (const content of provider.fetchMultiple(
        selectedNodes,
        this.abortController.signal
      )) {
        fileContents.push(content);
      }

      // Format output
      const formattedOutput = await Formatter.formatAsync(
        tree,
        fileContents,
        (progress, current, total) => {
          logger.info(
            'generation',
            `Tokenizing: ${current}/${total} files (${progress.toFixed(1)}%)`
          );
        }
      );

      this.output = formattedOutput;
      this.callbacks.onStateChange(this.getState());

      return formattedOutput;
    } catch (err) {
      logger.error('generation', 'Failed to generate output:', err);

      // Don't show error dialog for aborted requests
      if (err instanceof Error && err.name === 'AbortError') {
        return null;
      }

      if (err instanceof ProviderError) {
        this.callbacks.onError({
          message: err.userMessage,
          recovery: err.recovery,
          recoveryLabel: err.recovery ? 'Create GitHub Token' : undefined,
        });
      } else {
        this.callbacks.onError({
          message:
            err instanceof Error ? err.message : 'Failed to generate output. Please try again.',
        });
      }

      return null;
    } finally {
      this.generating = false;
      this.abortController = null;
      this.callbacks.onStateChange(this.getState());

      ChromeBridge.updateProcessingStatus('loaded');
    }
  }

  /**
   * Abort the current generation.
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Get current state.
   */
  getState(): GenerationPipelineState {
    return {
      output: this.output,
      isGenerating: this.generating,
    };
  }

  /**
   * Clear the current output.
   */
  clearOutput(): void {
    this.output = null;
    this.callbacks.onStateChange(this.getState());
  }

  /**
   * Reset pipeline to initial state.
   */
  reset(): void {
    this.output = null;
    this.generating = false;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.callbacks.onStateChange(this.getState());
  }
}
