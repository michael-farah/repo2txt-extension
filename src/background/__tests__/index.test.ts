import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Store message handlers for testing
const messageHandlers: Array<(
  message: unknown,
  sender: unknown,
  sendResponse: (response: unknown) => void
) => boolean | void> = [];

const storageChangeHandlers: Array<(changes: unknown) => void> = [];

// Mock chrome APIs
const mockStorageSession = {
  set: vi.fn(),
  get: vi.fn(),
  remove: vi.fn(),
  onChanged: {
    addListener: vi.fn((handler: (changes: unknown) => void) => {
      storageChangeHandlers.push(handler);
    }),
  },
};

const mockStorageLocal = {
  get: vi.fn(),
};

const mockAction = {
  setBadgeText: vi.fn(),
  setBadgeBackgroundColor: vi.fn(),
};

const mockOnMessage = {
  addListener: vi.fn((handler) => {
    messageHandlers.push(handler);
  }),
};

// Mock global chrome before any imports
Object.defineProperty(global, 'chrome', {
  value: {
    runtime: {
      onMessage: mockOnMessage,
    },
    storage: {
      session: mockStorageSession,
      local: mockStorageLocal,
      onChanged: {
        addListener: vi.fn((handler) => {
          storageChangeHandlers.push(handler);
        }),
      },
    },
    action: mockAction,
  },
  writable: true,
  configurable: true,
});

// Mock fetch
const mockFetch = vi.fn();
Object.defineProperty(global, 'fetch', {
  value: mockFetch,
  writable: true,
  configurable: true,
});

describe('Background Service Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    messageHandlers.length = 0;
    storageChangeHandlers.length = 0;

    // Reset mocks
    mockStorageSession.set.mockResolvedValue(undefined);
    mockStorageSession.get.mockResolvedValue({});
    mockStorageSession.remove.mockResolvedValue(undefined);
    mockStorageLocal.get.mockResolvedValue({});
    mockAction.setBadgeText.mockResolvedValue(undefined);
    mockAction.setBadgeBackgroundColor.mockResolvedValue(undefined);
    mockFetch.mockReset();

    // Import the module to register listeners
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
  });

  const triggerMessage = async (
    message: unknown,
    sender: unknown = {}
  ): Promise<{ response: unknown | null; returnedTrue: boolean }> => {
    let response: unknown | null = null;
    const sendResponse = (r: unknown) => {
      response = r;
    };

    // Import module to register handlers
    await import('../index');

    // Find the handler that returns true (async response)
    let returnedTrue = false;
    for (const handler of messageHandlers) {
      const result = handler(message, sender, sendResponse);
      if (result === true) {
        returnedTrue = true;
        // Wait for async operations
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    return { response, returnedTrue };
  };

  describe('OPEN_POPUP_WITH_REPO message', () => {
    it('should store processing state and set badge', async () => {
      const { response, returnedTrue } = await triggerMessage({
        type: 'OPEN_POPUP_WITH_REPO',
        repoUrl: 'https://github.com/owner/repo',
      });

      expect(returnedTrue).toBe(true);
      expect(mockStorageSession.set).toHaveBeenCalledWith({
        processingState: expect.objectContaining({
          repoUrl: 'https://github.com/owner/repo',
          status: 'loading',
          timestamp: expect.any(Number),
        }),
      });
      expect(mockAction.setBadgeText).toHaveBeenCalledWith({ text: '1' });
      expect(mockAction.setBadgeBackgroundColor).toHaveBeenCalledWith({
        color: '#4F46E5',
      });
      expect(response).toEqual({ success: true });
    });

    it('should handle storage errors gracefully', async () => {
      mockStorageSession.set.mockRejectedValue(new Error('Storage error'));

      const { response, returnedTrue } = await triggerMessage({
        type: 'OPEN_POPUP_WITH_REPO',
        repoUrl: 'https://github.com/owner/repo',
      });

      expect(returnedTrue).toBe(true);
      expect(response).toEqual({
        success: false,
        error: 'Storage error',
      });
    });

    it('should ignore messages without repoUrl', async () => {
      const { returnedTrue } = await triggerMessage({
        type: 'OPEN_POPUP_WITH_REPO',
      });

      expect(returnedTrue).toBe(false);
      expect(mockStorageSession.set).not.toHaveBeenCalled();
    });
  });

  describe('UPDATE_PROCESSING_STATUS message', () => {
    it('should update status and clear badge when loaded', async () => {
      mockStorageSession.get.mockResolvedValue({
        processingState: {
          repoUrl: 'https://github.com/owner/repo',
          status: 'loading',
          timestamp: Date.now(),
        },
      });

      const { response, returnedTrue } = await triggerMessage({
        type: 'UPDATE_PROCESSING_STATUS',
        status: 'loaded',
      });

      expect(returnedTrue).toBe(true);
      expect(mockStorageSession.set).toHaveBeenCalledWith({
        processingState: expect.objectContaining({
          status: 'loaded',
        }),
      });
      expect(mockAction.setBadgeText).toHaveBeenCalledWith({ text: '' });
      expect(response).toEqual({ success: true });
    });

    it('should update status without clearing badge for generating', async () => {
      mockStorageSession.get.mockResolvedValue({
        processingState: {
          repoUrl: 'https://github.com/owner/repo',
          status: 'loading',
          timestamp: Date.now(),
        },
      });

      const { returnedTrue } = await triggerMessage({
        type: 'UPDATE_PROCESSING_STATUS',
        status: 'generating',
      });

      expect(returnedTrue).toBe(true);
      expect(mockAction.setBadgeText).not.toHaveBeenCalledWith({ text: '' });
    });
  });

  describe('CLEAR_PROCESSING_STATE message', () => {
    it('should remove processing state and clear badge', async () => {
      const { response, returnedTrue } = await triggerMessage({
        type: 'CLEAR_PROCESSING_STATE',
      });

      expect(returnedTrue).toBe(true);
      expect(mockStorageSession.remove).toHaveBeenCalledWith('processingState');
      expect(mockAction.setBadgeText).toHaveBeenCalledWith({ text: '' });
      expect(response).toEqual({ success: true });
    });
  });

  describe('GET_PROCESSING_STATE message', () => {
    it('should return current processing state', async () => {
      const mockState = {
        repoUrl: 'https://github.com/owner/repo',
        status: 'loading' as const,
        timestamp: Date.now(),
      };

      mockStorageSession.get.mockResolvedValue({
        processingState: mockState,
      });

      const { response, returnedTrue } = await triggerMessage({
        type: 'GET_PROCESSING_STATE',
      });

      expect(returnedTrue).toBe(true);
      expect(mockStorageSession.get).toHaveBeenCalledWith('processingState');
      expect(response).toEqual({
        success: true,
        state: mockState,
      });
    });

    it('should return undefined state when no state exists', async () => {
      mockStorageSession.get.mockResolvedValue({});

      const { response, returnedTrue } = await triggerMessage({
        type: 'GET_PROCESSING_STATE',
      });

      expect(returnedTrue).toBe(true);
      expect(response).toEqual({
        success: true,
        state: undefined,
      });
    });
  });

  describe('GITHUB_WEB_FETCH message', () => {
    it('should fetch GitHub page with credentials', async () => {
      const mockHtml = '<html>GitHub Page</html>';
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(mockHtml),
      });

      const { returnedTrue } = await triggerMessage({
        type: 'GITHUB_WEB_FETCH',
        url: 'https://github.com/owner/repo',
        requestId: 'req-123',
      });

      expect(returnedTrue).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://github.com/owner/repo',
        expect.objectContaining({
          credentials: 'include',
          signal: expect.any(AbortSignal),
        })
      );

      // Wait for fetch to complete
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should reject invalid URLs', async () => {
      const { response, returnedTrue } = await triggerMessage({
        type: 'GITHUB_WEB_FETCH',
        url: 'https://evil.com/github.com',
        requestId: 'req-123',
      });

      expect(returnedTrue).toBe(true);
      expect(response).toEqual({
        success: false,
        status: 0,
        html: '',
        error: 'Invalid URL: must be a github.com or raw.githubusercontent.com URL',
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should reject non-https URLs', async () => {
      const { response, returnedTrue } = await triggerMessage({
        type: 'GITHUB_WEB_FETCH',
        url: 'http://github.com/owner/repo',
        requestId: 'req-123',
      });

      expect(returnedTrue).toBe(true);
      expect(response).toEqual({
        success: false,
        status: 0,
        html: '',
        error: 'Invalid URL: must be a github.com or raw.githubusercontent.com URL',
      });
    });

    it('should handle fetch errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { returnedTrue } = await triggerMessage({
        type: 'GITHUB_WEB_FETCH',
        url: 'https://github.com/owner/repo',
        requestId: 'req-123',
      });

      expect(returnedTrue).toBe(true);
      // Wait for error handling
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should handle abort errors', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const { returnedTrue } = await triggerMessage({
        type: 'GITHUB_WEB_FETCH',
        url: 'https://github.com/owner/repo',
        requestId: 'req-123',
      });

      expect(returnedTrue).toBe(true);
      // Wait for error handling
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  });

  describe('ABORT_GITHUB_FETCH message', () => {
    it('should return error for non-existent request', async () => {
      const { response, returnedTrue } = await triggerMessage({
        type: 'ABORT_GITHUB_FETCH',
        requestId: 'non-existent',
      });

      expect(returnedTrue).toBe(true);
      expect(response).toEqual({
        success: false,
        error: 'Request not found',
      });
    });
  });

  describe('Unknown message types', () => {
    it('should handle unknown message types gracefully', async () => {
      const { returnedTrue } = await triggerMessage({
        type: 'UNKNOWN_MESSAGE',
        data: 'some data',
      });

      expect(returnedTrue).toBe(false);
    });
  });

  describe('Storage change listener', () => {
    beforeEach(async () => {
      // Import module to register storage listeners
      await import('../index');
    });

    it('should clear badge when processing state is removed', async () => {
      const changes = {
        processingState: {
          oldValue: { repoUrl: 'test', status: 'loading', timestamp: 1 },
          newValue: undefined,
        },
      };

      for (const handler of storageChangeHandlers) {
        handler(changes);
      }

      expect(mockAction.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });

    it('should set badge when processing state is added', async () => {
      const changes = {
        processingState: {
          oldValue: undefined,
          newValue: { repoUrl: 'test', status: 'loading', timestamp: 1 },
        },
      };

      for (const handler of storageChangeHandlers) {
        handler(changes);
      }

      expect(mockAction.setBadgeText).toHaveBeenCalledWith({ text: '1' });
      expect(mockAction.setBadgeBackgroundColor).toHaveBeenCalledWith({
        color: '#4F46E5',
      });
    });

    it('should clear badge when status changes to loaded', async () => {
      const changes = {
        processingState: {
          oldValue: { repoUrl: 'test', status: 'loading', timestamp: 1 },
          newValue: { repoUrl: 'test', status: 'loaded', timestamp: 1 },
        },
      };

      for (const handler of storageChangeHandlers) {
        handler(changes);
      }

      expect(mockAction.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });

    it('should set badge when status changes to generating', async () => {
      const changes = {
        processingState: {
          oldValue: { repoUrl: 'test', status: 'loaded', timestamp: 1 },
          newValue: { repoUrl: 'test', status: 'generating', timestamp: 1 },
        },
      };

      for (const handler of storageChangeHandlers) {
        handler(changes);
      }

      expect(mockAction.setBadgeText).toHaveBeenCalledWith({ text: '1' });
      expect(mockAction.setBadgeBackgroundColor).toHaveBeenCalledWith({
        color: '#4F46E5',
      });
    });

    it('should ignore non-processingState changes', async () => {
      const changes = {
        someOtherKey: {
          oldValue: 'old',
          newValue: 'new',
        },
      };

      for (const handler of storageChangeHandlers) {
        handler(changes);
      }

      expect(mockAction.setBadgeText).not.toHaveBeenCalled();
    });
  });
});
