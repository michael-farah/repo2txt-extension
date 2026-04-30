import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerationPipeline } from '../GenerationPipeline';
import type { GenerationPipelineCallbacks, GenerationInput } from '../GenerationPipeline';
import type { IProvider } from '@/lib/providers/types';
import type { FileNode, FileContent, TreeNode } from '@/types';

// Mock Formatter
vi.mock('@/lib/formatter', () => ({
  Formatter: {
    formatAsync: vi.fn().mockResolvedValue({
      directoryTree: 'tree',
      fileContents: 'contents',
      tokenCount: 100,
      lineCount: 10,
    }),
  },
}));

// Mock ChromeBridge
vi.mock('@/lib/chrome', () => ({
  ChromeBridge: {
    updateProcessingStatus: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

function createMockProvider(overrides?: Partial<IProvider>): IProvider {
  return {
    getType: vi.fn().mockReturnValue('github'),
    getName: vi.fn().mockReturnValue('MockProvider'),
    setCredentials: vi.fn(),
    fetchTree: vi.fn().mockResolvedValue([]),
    fetchFile: vi.fn().mockResolvedValue({ path: 'test.ts', text: 'hello' }),
    fetchMultiple: vi.fn(),
    getRepoInfo: vi.fn().mockReturnValue(null),
    validateUrl: vi.fn().mockReturnValue(true),
    parseUrl: vi.fn(),
    reset: vi.fn(),
    requiresAuth: vi.fn().mockReturnValue(false),
    ...overrides,
  } as IProvider;
}

async function* asyncGeneratorFromContents(
  contents: FileContent[]
): AsyncGenerator<FileContent, void, unknown> {
  for (const content of contents) {
    yield content;
  }
}

describe('GenerationPipeline', () => {
  let onStateChange: (state: import('../GenerationPipeline').GenerationPipelineState) => void;
  let onError: (error: { message: string; recovery?: () => void; recoveryLabel?: string }) => void;
  let callbacks: GenerationPipelineCallbacks;

  beforeEach(() => {
    vi.clearAllMocks();
    onStateChange = vi.fn();
    onError = vi.fn();
    callbacks = { onStateChange, onError };
  });

  describe('constructor', () => {
    it('should initialize with default state', () => {
      const pipeline = new GenerationPipeline(callbacks);
      const state = pipeline.getState();
      expect(state.output).toBeNull();
      expect(state.isGenerating).toBe(false);
    });
  });

  describe('generate', () => {
    it('should call onError when no files selected', async () => {
      const pipeline = new GenerationPipeline(callbacks);
      const provider = createMockProvider();

      const input: GenerationInput = {
        provider,
        selectedNodes: [],
        tree: [],
      };

      const result = await pipeline.generate(input);

      expect(result).toBeNull();
      expect(onError).toHaveBeenCalledWith({
        message: expect.stringContaining('No files selected'),
      });
    });

    it('should generate output from selected files', async () => {
      const fileContents: FileContent[] = [
        { path: 'src/index.ts', text: 'console.log("hi")', lineCount: 1 },
      ];

      const provider = createMockProvider({
        fetchMultiple: vi.fn().mockReturnValue(asyncGeneratorFromContents(fileContents)),
      });

      const selectedNodes: FileNode[] = [
        { path: 'src/index.ts', type: 'blob', url: 'https://example.com/file' },
      ];

      const tree: TreeNode[] = [{ name: 'src', path: 'src', type: 'directory', children: [] }];

      const pipeline = new GenerationPipeline(callbacks);
      const input: GenerationInput = { provider, selectedNodes, tree };

      const result = await pipeline.generate(input);

      expect(result).not.toBeNull();
      expect(result?.tokenCount).toBe(100);
      expect(provider.fetchMultiple).toHaveBeenCalledWith(selectedNodes, expect.any(AbortSignal));
    });

    it('should update ChromeBridge processing status during generation', async () => {
      const { ChromeBridge } = await import('@/lib/chrome');

      const fileContents: FileContent[] = [{ path: 'src/index.ts', text: 'code', lineCount: 1 }];

      const provider = createMockProvider({
        fetchMultiple: vi.fn().mockReturnValue(asyncGeneratorFromContents(fileContents)),
      });

      const pipeline = new GenerationPipeline(callbacks);
      await pipeline.generate({
        provider,
        selectedNodes: [{ path: 'src/index.ts', type: 'blob', url: 'test' }],
        tree: [],
      });

      expect(ChromeBridge.updateProcessingStatus).toHaveBeenCalledWith('generating');
      expect(ChromeBridge.updateProcessingStatus).toHaveBeenCalledWith('loaded');
    });

    it('should set isGenerating during generation and clear after', async () => {
      const fileContents: FileContent[] = [{ path: 'src/index.ts', text: 'code', lineCount: 1 }];

      const provider = createMockProvider({
        fetchMultiple: vi.fn().mockReturnValue(asyncGeneratorFromContents(fileContents)),
      });

      const pipeline = new GenerationPipeline(callbacks);
      const generatePromise = pipeline.generate({
        provider,
        selectedNodes: [{ path: 'src/index.ts', type: 'blob', url: 'test' }],
        tree: [],
      });

      // Should have notified generating state
      expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({ isGenerating: true }));

      await generatePromise;

      // Should have notified done state
      expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({ isGenerating: false }));
    });

    it('should handle abort error silently', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      const provider = createMockProvider({
        fetchMultiple: vi.fn().mockImplementation(() => {
          throw abortError;
        }),
      });

      const pipeline = new GenerationPipeline(callbacks);
      const result = await pipeline.generate({
        provider,
        selectedNodes: [{ path: 'src/index.ts', type: 'blob', url: 'test' }],
        tree: [],
      });

      expect(result).toBeNull();
      expect(onError).not.toHaveBeenCalled();
    });

    it('should handle ProviderError with userMessage and recovery', async () => {
      const { ProviderError, ErrorCode } = await import('@/lib/providers/types');
      const recovery = vi.fn();
      const providerError = new ProviderError(
        'Auth failed',
        ErrorCode.AUTH_FAILED,
        'Please provide a valid token.',
        recovery
      );

      const provider = createMockProvider({
        fetchMultiple: vi.fn().mockImplementation(() => {
          throw providerError;
        }),
      });

      const pipeline = new GenerationPipeline(callbacks);
      await pipeline.generate({
        provider,
        selectedNodes: [{ path: 'src/index.ts', type: 'blob', url: 'test' }],
        tree: [],
      });

      expect(onError).toHaveBeenCalledWith({
        message: 'Please provide a valid token.',
        recovery,
        recoveryLabel: 'Create GitHub Token',
      });
    });

    it('should handle generic error with error message', async () => {
      const provider = createMockProvider({
        fetchMultiple: vi.fn().mockImplementation(() => {
          throw new Error('Something went wrong');
        }),
      });

      const pipeline = new GenerationPipeline(callbacks);
      await pipeline.generate({
        provider,
        selectedNodes: [{ path: 'src/index.ts', type: 'blob', url: 'test' }],
        tree: [],
      });

      expect(onError).toHaveBeenCalledWith({
        message: 'Something went wrong',
      });
    });

    it('should handle non-Error thrown values', async () => {
      const provider = createMockProvider({
        fetchMultiple: vi.fn().mockImplementation(() => {
          throw 'string error';
        }),
      });

      const pipeline = new GenerationPipeline(callbacks);
      await pipeline.generate({
        provider,
        selectedNodes: [{ path: 'src/index.ts', type: 'blob', url: 'test' }],
        tree: [],
      });

      expect(onError).toHaveBeenCalledWith({
        message: 'Failed to generate output. Please try again.',
      });
    });

    it('should always clear isGenerating in finally block', async () => {
      const provider = createMockProvider({
        fetchMultiple: vi.fn().mockImplementation(() => {
          throw new Error('fail');
        }),
      });

      const pipeline = new GenerationPipeline(callbacks);
      await pipeline.generate({
        provider,
        selectedNodes: [{ path: 'src/index.ts', type: 'blob', url: 'test' }],
        tree: [],
      });

      expect(pipeline.getState().isGenerating).toBe(false);
    });
  });

  describe('abort', () => {
    it('should be safe to call when no generation is running', () => {
      const pipeline = new GenerationPipeline(callbacks);
      expect(() => pipeline.abort()).not.toThrow();
    });
  });

  describe('clearOutput', () => {
    it('should clear the output and notify', async () => {
      const fileContents: FileContent[] = [{ path: 'src/index.ts', text: 'code', lineCount: 1 }];

      const provider = createMockProvider({
        fetchMultiple: vi.fn().mockReturnValue(asyncGeneratorFromContents(fileContents)),
      });

      const pipeline = new GenerationPipeline(callbacks);
      await pipeline.generate({
        provider,
        selectedNodes: [{ path: 'src/index.ts', type: 'blob', url: 'test' }],
        tree: [],
      });

      expect(pipeline.getState().output).not.toBeNull();

      pipeline.clearOutput();

      expect(pipeline.getState().output).toBeNull();
      expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({ output: null }));
    });
  });

  describe('reset', () => {
    it('should reset all pipeline state', async () => {
      const fileContents: FileContent[] = [{ path: 'src/index.ts', text: 'code', lineCount: 1 }];

      const provider = createMockProvider({
        fetchMultiple: vi.fn().mockReturnValue(asyncGeneratorFromContents(fileContents)),
      });

      const pipeline = new GenerationPipeline(callbacks);
      await pipeline.generate({
        provider,
        selectedNodes: [{ path: 'src/index.ts', type: 'blob', url: 'test' }],
        tree: [],
      });

      pipeline.reset();

      const state = pipeline.getState();
      expect(state.output).toBeNull();
      expect(state.isGenerating).toBe(false);
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      const pipeline = new GenerationPipeline(callbacks);
      const state = pipeline.getState();

      expect(state).toEqual({
        output: null,
        isGenerating: false,
      });
    });
  });
});
