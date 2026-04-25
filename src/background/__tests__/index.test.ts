import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';

// Store the message handler
let messageHandler: (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
) => boolean | undefined;

// Mock chrome APIs before importing
vi.stubGlobal('chrome', {
  runtime: {
    onMessage: {
      addListener: (handler: typeof messageHandler) => {
        messageHandler = handler;
      },
    },
    sendMessage: vi.fn(),
  },
  storage: {
    session: {
      set: vi.fn(),
      get: vi.fn(),
      remove: vi.fn(),
      onChanged: {
        addListener: vi.fn(),
      },
    },
    local: {
      onChanged: {
        addListener: vi.fn(),
      },
    },
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
});

// Mock fetch
global.fetch = vi.fn();

describe('Background Script', () => {
  beforeAll(async () => {
    // Import the background script after mocking chrome
    await import('../index');
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('FETCH_DIFF', () => {
    it('should return diff text for valid github.com .diff URL', async () => {
      const mockDiffText = 'diff --git a/file.txt b/file.txt\n--- a/file.txt\n+++ b/file.txt\n@@ -1 +1 @@\n-old\n+new';

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValueOnce(mockDiffText),
      });

      const sendResponse = vi.fn();
      const message = {
        type: 'FETCH_DIFF',
        url: 'https://github.com/owner/repo/commit/abc123.diff',
      };

      const result = messageHandler!(message, {}, sendResponse);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://github.com/owner/repo/commit/abc123.diff',
        expect.objectContaining({
          credentials: 'include',
        })
      );
      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        status: 200,
        diffText: mockDiffText,
      });
    });

    it('should reject non-github.com URLs', async () => {
      const sendResponse = vi.fn();
      const message = {
        type: 'FETCH_DIFF',
        url: 'https://evil.com/owner/repo/commit/abc123.diff',
      };

      const result = messageHandler!(message, {}, sendResponse);

      expect(result).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        status: 0,
        diffText: '',
        error: 'Invalid URL: must be a github.com .diff URL',
      });
    });

    it('should reject URLs without .diff extension', async () => {
      const sendResponse = vi.fn();
      const message = {
        type: 'FETCH_DIFF',
        url: 'https://github.com/owner/repo/commit/abc123',
      };

      const result = messageHandler!(message, {}, sendResponse);

      expect(result).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        status: 0,
        diffText: '',
        error: 'Invalid URL: must end with .diff extension',
      });
    });

    it('should reject non-https URLs', async () => {
      const sendResponse = vi.fn();
      const message = {
        type: 'FETCH_DIFF',
        url: 'http://github.com/owner/repo/commit/abc123.diff',
      };

      const result = messageHandler!(message, {}, sendResponse);

      expect(result).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        status: 0,
        diffText: '',
        error: 'Invalid URL: must be a github.com .diff URL',
      });
    });

    it('should handle 404 errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: vi.fn().mockResolvedValueOnce('Not Found'),
      });

      const sendResponse = vi.fn();
      const message = {
        type: 'FETCH_DIFF',
        url: 'https://github.com/owner/repo/commit/nonexistent.diff',
      };

      messageHandler!(message, {}, sendResponse);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        status: 404,
        diffText: 'Not Found',
        error: 'HTTP 404',
      });
    });

    it('should handle network failures', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const sendResponse = vi.fn();
      const message = {
        type: 'FETCH_DIFF',
        url: 'https://github.com/owner/repo/commit/abc123.diff',
      };

      messageHandler!(message, {}, sendResponse);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        status: 0,
        diffText: '',
        error: 'Network error',
      });
    });

    it('should support abort via requestId', async () => {
      const mockDiffText = 'diff content';
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValueOnce(mockDiffText),
      });

      const sendResponse = vi.fn();
      const message = {
        type: 'FETCH_DIFF',
        url: 'https://github.com/owner/repo/commit/abc123.diff',
        requestId: 'test-request-123',
      };

      messageHandler!(message, {}, sendResponse);

      // Now send abort message
      const abortSendResponse = vi.fn();
      const abortMessage = {
        type: 'ABORT_GITHUB_FETCH',
        requestId: 'test-request-123',
      };

      messageHandler!(abortMessage, {}, abortSendResponse);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Abort should succeed
      expect(abortSendResponse).toHaveBeenCalledWith({ success: true });
    });
  });
});
