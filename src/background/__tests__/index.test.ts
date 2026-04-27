/**
 * Tests for background service worker message handlers
 * Specifically FETCH_DIFF and ABORT_FETCH_DIFF
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

// ---- Capture the message listener callback ----
let messageListener:
  | ((
      message: unknown,
      sender: unknown,
      sendResponse: (response: unknown) => void
    ) => boolean | void)
  | undefined;

// ---- Chrome API Mocks ----
const mockChrome = {
  runtime: {
    onMessage: {
      addListener: vi.fn((callback: typeof messageListener) => {
        messageListener = callback;
      }),
    },
  },
  storage: {
    session: {
      set: vi.fn(() => Promise.resolve()),
      get: vi.fn(() => Promise.resolve({})),
      remove: vi.fn(() => Promise.resolve()),
      onChanged: {
        addListener: vi.fn(),
      },
    },
  },
  action: {
    setBadgeText: vi.fn(() => Promise.resolve()),
    setBadgeBackgroundColor: vi.fn(() => Promise.resolve()),
  },
};

// Set up global chrome mock BEFORE importing the background module
(globalThis as unknown as { chrome: typeof mockChrome }).chrome = mockChrome;

// Mock fetch globally
vi.stubGlobal('fetch', vi.fn());

// Import the module ONCE so the pendingRequests Map is consistent
// across all tests. vi.resetModules() would create a new Map per test,
// breaking tests that verify abort/cleanup behavior.
beforeAll(async () => {
  await import('../index');
});

// ---- Helpers ----

/**
 * Send a message to the captured listener and return a promise
 * that resolves with the sendResponse argument.
 * Handles the async pattern where the handler returns `true`
 * and calls sendResponse later via .then/.catch/.finally.
 */
function sendMessage(message: Record<string, unknown>): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const sendResponse = vi.fn((response: Record<string, unknown>) => {
      resolve(response);
    });
    if (!messageListener) {
      throw new Error('Message listener not registered');
    }
    messageListener(message, {}, sendResponse);
  });
}

// ---- Tests ----

describe('Background Script - FETCH_DIFF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. FETCH_DIFF with valid github.com URL
  it('should fetch diff with credentials:include for valid github.com URL', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue('diff --git a/file.ts b/file.ts'),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    const response = await sendMessage({
      type: 'FETCH_DIFF',
      url: 'https://github.com/owner/repo/commit/abc123.diff',
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://github.com/owner/repo/commit/abc123.diff',
      expect.objectContaining({ credentials: 'include' })
    );
    expect(response).toEqual({
      success: true,
      status: 200,
      diff: 'diff --git a/file.ts b/file.ts',
    });
  });

  // 2. FETCH_DIFF validates URL is github.com
  it('should reject non-github.com URLs', async () => {
    const response = await sendMessage({
      type: 'FETCH_DIFF',
      url: 'https://gitlab.com/owner/repo/commit/abc123.diff',
    });

    expect(response).toEqual({
      success: false,
      status: 0,
      diff: '',
      error: 'Invalid URL: must be a github.com URL',
    });
  });

  // 3. FETCH_DIFF validates URL is https
  it('should reject http:// URLs', async () => {
    const response = await sendMessage({
      type: 'FETCH_DIFF',
      url: 'http://github.com/owner/repo/commit/abc123.diff',
    });

    expect(response).toEqual({
      success: false,
      status: 0,
      diff: '',
      error: 'Invalid URL: must be a github.com URL',
    });
  });

  // 4. FETCH_DIFF handles malformed URL
  it('should handle malformed URLs', async () => {
    const response = await sendMessage({
      type: 'FETCH_DIFF',
      url: 'not-a-valid-url',
    });

    expect(response).toEqual({
      success: false,
      status: 0,
      diff: '',
      error: 'Invalid URL: must be a github.com URL',
    });
  });

  // 5. FETCH_DIFF handles 404 response
  it('should handle 404 response', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      text: vi.fn().mockResolvedValue('Not Found'),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    const response = await sendMessage({
      type: 'FETCH_DIFF',
      url: 'https://github.com/owner/repo/commit/nonexistent.diff',
    });

    expect(response).toEqual({
      success: false,
      status: 404,
      diff: 'Not Found',
    });
  });

  // 6. FETCH_DIFF handles 429 rate limit
  it('should handle 429 rate limit response', async () => {
    const mockResponse = {
      ok: false,
      status: 429,
      text: vi.fn().mockResolvedValue('rate limit exceeded'),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    const response = await sendMessage({
      type: 'FETCH_DIFF',
      url: 'https://github.com/owner/repo/commit/abc123.diff',
    });

    expect(response).toEqual({
      success: false,
      status: 429,
      diff: 'rate limit exceeded',
    });
  });

  // 7. FETCH_DIFF handles network errors
  it('should handle network errors', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    const response = await sendMessage({
      type: 'FETCH_DIFF',
      url: 'https://github.com/owner/repo/commit/abc123.diff',
    });

    expect(response).toEqual({
      success: false,
      status: 0,
      diff: '',
      error: 'Network error',
    });
  });

  // 8. FETCH_DIFF supports requestId with AbortController
  it('should store AbortController in pendingRequests when requestId is provided', async () => {
    // Use a mock fetch that responds to AbortController.signal
    const mockFetch = vi.fn().mockImplementation(
      (_url: string, options: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          if (options.signal) {
            options.signal.addEventListener('abort', () => {
              reject(new DOMException('The operation was aborted.', 'AbortError'));
            });
          }
        })
    );
    vi.stubGlobal('fetch', mockFetch);

    // Start the fetch (don't await — we want to check pending state mid-flight)
    const responsePromise = sendMessage({
      type: 'FETCH_DIFF',
      url: 'https://github.com/owner/repo/commit/abc123.diff',
      requestId: 'test-request-1',
    });

    // While the fetch is in-flight, ABORT_FETCH_DIFF should find the request
    const abortResponse = await sendMessage({
      type: 'ABORT_FETCH_DIFF',
      requestId: 'test-request-1',
    });

    expect(abortResponse).toEqual({ success: true });

    // Wait for the original fetch to settle (it will be aborted)
    const fetchResponse = await responsePromise;
    expect(fetchResponse.success).toBe(false);
  });

  // 9. FETCH_DIFF cleans up pending requests after completion
  it('should clean up pending requests after completion', async () => {
    // Use a mock fetch that responds to AbortController.signal
    // so we can test cleanup via abort-after-completion
    const mockFetch = vi.fn().mockImplementation(
      (_url: string, options: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          if (options.signal) {
            options.signal.addEventListener('abort', () => {
              reject(new DOMException('The operation was aborted.', 'AbortError'));
            });
          }
        })
    );
    vi.stubGlobal('fetch', mockFetch);

    // Start the fetch
    const responsePromise = sendMessage({
      type: 'FETCH_DIFF',
      url: 'https://github.com/owner/repo/commit/abc123.diff',
      requestId: 'cleanup-test-1',
    });

    // Abort it
    await sendMessage({
      type: 'ABORT_FETCH_DIFF',
      requestId: 'cleanup-test-1',
    });

    // Wait for the fetch to settle
    await responsePromise;

    // After completion, trying to abort again should return "not found"
    const secondAbort = await sendMessage({
      type: 'ABORT_FETCH_DIFF',
      requestId: 'cleanup-test-1',
    });

    expect(secondAbort).toEqual({
      success: false,
      error: 'Request not found',
    });
  });
});

describe('Background Script - ABORT_FETCH_DIFF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should abort a pending FETCH_DIFF request', async () => {
    // Create a mock fetch that properly responds to AbortController
    const mockFetch = vi.fn().mockImplementation(
      (_url: string, options: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          if (options.signal) {
            options.signal.addEventListener('abort', () => {
              reject(new DOMException('The operation was aborted.', 'AbortError'));
            });
          }
        })
    );
    vi.stubGlobal('fetch', mockFetch);

    // Start the fetch (don't await — we want to abort mid-flight)
    const responsePromise = sendMessage({
      type: 'FETCH_DIFF',
      url: 'https://github.com/owner/repo/commit/abc123.diff',
      requestId: 'abort-test-1',
    });

    // Abort it
    const abortResponse = await sendMessage({
      type: 'ABORT_FETCH_DIFF',
      requestId: 'abort-test-1',
    });

    expect(abortResponse).toEqual({ success: true });

    // The original fetch should resolve with abort error
    const fetchResponse = await responsePromise;
    expect(fetchResponse).toEqual({
      success: false,
      status: 0,
      diff: '',
      error: 'Request aborted',
    });
  });

  it('should return error for unknown requestId', async () => {
    const response = await sendMessage({
      type: 'ABORT_FETCH_DIFF',
      requestId: 'nonexistent-id',
    });

    expect(response).toEqual({
      success: false,
      error: 'Request not found',
    });
  });
});
