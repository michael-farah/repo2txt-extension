import { useState, useCallback, useRef, useEffect } from 'react';
import { GenerationPipeline } from '@/lib/pipeline';
import type { FileNode, FormattedOutput, TreeNode } from '@/types';
import type { IProvider } from '@/lib/providers/types';

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
  const { currentProvider, getSelectedNodes, getFullTree, onError } = opts;

  const [output, setOutput] = useState<FormattedOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  // Stable onError ref to avoid re-creating pipeline on callback identity changes
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });

  // Create a single GenerationPipeline instance (lazy init via useEffect to avoid render-time ref access)
  const pipelineRef = useRef<GenerationPipeline | null>(null);
  useEffect(() => {
    if (pipelineRef.current === null) {
      pipelineRef.current = new GenerationPipeline({
        onStateChange: (state) => {
          setOutput(state.output);
          setIsGenerating(state.isGenerating);
        },
        onError: (error) => {
          onErrorRef.current(error);
        },
      });
    }
  }, []);
  const pipeline = pipelineRef.current!;

  const generateOutput = useCallback(async () => {
    if (!currentProvider) return;

    const result = await pipeline.generate({
      provider: currentProvider,
      selectedNodes: getSelectedNodes(),
      tree: getFullTree(),
    });

    if (result) {
      setTimeout(() => {
        outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [currentProvider, getSelectedNodes, getFullTree, pipeline]);

  return { output, isGenerating, generateOutput, outputRef, setOutput };
}
