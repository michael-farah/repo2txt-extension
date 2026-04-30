/**
 * Tests for typed Chrome message protocol
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MessageTypes,
  sendMessage,
  isMessageType,
  isOpenPopupWithRepoRequest,
  isUpdateProcessingStatusRequest,
  isClearProcessingStateRequest,
  isGetProcessingStateRequest,
  isGithubWebFetchRequest,
  isAbortGithubFetchRequest,
  isFetchDiffRequest,
  isAbortFetchDiffRequest,
  type OpenPopupWithRepoRequest,
  type UpdateProcessingStatusRequest,
  type ClearProcessingStateRequest,
  type GetProcessingStateRequest,
  type GithubWebFetchRequest,
  type AbortGithubFetchRequest,
  type FetchDiffRequest,
  type AbortFetchDiffRequest,
} from '../messages';

describe('MessageTypes Constants', () => {
  it('should have correct message type constants', () => {
    expect(MessageTypes.OPEN_POPUP_WITH_REPO).toBe('OPEN_POPUP_WITH_REPO');
    expect(MessageTypes.UPDATE_PROCESSING_STATUS).toBe('UPDATE_PROCESSING_STATUS');
    expect(MessageTypes.CLEAR_PROCESSING_STATE).toBe('CLEAR_PROCESSING_STATE');
    expect(MessageTypes.GET_PROCESSING_STATE).toBe('GET_PROCESSING_STATE');
    expect(MessageTypes.GITHUB_WEB_FETCH).toBe('GITHUB_WEB_FETCH');
    expect(MessageTypes.ABORT_GITHUB_FETCH).toBe('ABORT_GITHUB_FETCH');
    expect(MessageTypes.FETCH_DIFF).toBe('FETCH_DIFF');
    expect(MessageTypes.ABORT_FETCH_DIFF).toBe('ABORT_FETCH_DIFF');
  });

  it('should have exactly 8 message types', () => {
    const keys = Object.keys(MessageTypes);
    expect(keys).toHaveLength(8);
  });
});

describe('isMessageType type guard', () => {
  it('should return true for valid message objects with matching type', () => {
    const message = {
      type: MessageTypes.OPEN_POPUP_WITH_REPO,
      repoUrl: 'https://github.com/owner/repo',
    };
    expect(isMessageType(message, MessageTypes.OPEN_POPUP_WITH_REPO)).toBe(true);
  });

  it('should return false for message with non-matching type', () => {
    const message = { type: MessageTypes.UPDATE_PROCESSING_STATUS, status: 'loading' };
    expect(isMessageType(message, MessageTypes.OPEN_POPUP_WITH_REPO)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isMessageType(null, MessageTypes.OPEN_POPUP_WITH_REPO)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isMessageType(undefined, MessageTypes.OPEN_POPUP_WITH_REPO)).toBe(false);
  });

  it('should return false for non-object values', () => {
    expect(isMessageType('string', MessageTypes.OPEN_POPUP_WITH_REPO)).toBe(false);
    expect(isMessageType(123, MessageTypes.OPEN_POPUP_WITH_REPO)).toBe(false);
    expect(isMessageType(true, MessageTypes.OPEN_POPUP_WITH_REPO)).toBe(false);
  });

  it('should return false for object without type property', () => {
    expect(isMessageType({}, MessageTypes.OPEN_POPUP_WITH_REPO)).toBe(false);
    expect(isMessageType({ repoUrl: 'test' }, MessageTypes.OPEN_POPUP_WITH_REPO)).toBe(false);
  });
});

describe('isOpenPopupWithRepoRequest type guard', () => {
  it('should return true for valid OpenPopupWithRepoRequest', () => {
    const message: OpenPopupWithRepoRequest = {
      type: MessageTypes.OPEN_POPUP_WITH_REPO,
      repoUrl: 'https://github.com/owner/repo',
    };
    expect(isOpenPopupWithRepoRequest(message)).toBe(true);
  });

  it('should return false for message with wrong type', () => {
    const message = { type: MessageTypes.FETCH_DIFF, url: 'https://github.com/owner/repo' };
    expect(isOpenPopupWithRepoRequest(message)).toBe(false);
  });

  it('should return false for message without repoUrl', () => {
    const message = { type: MessageTypes.OPEN_POPUP_WITH_REPO };
    expect(isOpenPopupWithRepoRequest(message)).toBe(false);
  });

  it('should return false for message with non-string repoUrl', () => {
    const message = { type: MessageTypes.OPEN_POPUP_WITH_REPO, repoUrl: 123 };
    expect(isOpenPopupWithRepoRequest(message)).toBe(false);
  });
});

describe('isUpdateProcessingStatusRequest type guard', () => {
  it('should return true for valid UpdateProcessingStatusRequest with loading status', () => {
    const message: UpdateProcessingStatusRequest = {
      type: MessageTypes.UPDATE_PROCESSING_STATUS,
      status: 'loading',
    };
    expect(isUpdateProcessingStatusRequest(message)).toBe(true);
  });

  it('should return true for valid UpdateProcessingStatusRequest with loaded status', () => {
    const message: UpdateProcessingStatusRequest = {
      type: MessageTypes.UPDATE_PROCESSING_STATUS,
      status: 'loaded',
    };
    expect(isUpdateProcessingStatusRequest(message)).toBe(true);
  });

  it('should return true for valid UpdateProcessingStatusRequest with generating status', () => {
    const message: UpdateProcessingStatusRequest = {
      type: MessageTypes.UPDATE_PROCESSING_STATUS,
      status: 'generating',
    };
    expect(isUpdateProcessingStatusRequest(message)).toBe(true);
  });

  it('should return false for message with invalid status', () => {
    const message = { type: MessageTypes.UPDATE_PROCESSING_STATUS, status: 'invalid' };
    expect(isUpdateProcessingStatusRequest(message)).toBe(false);
  });

  it('should return false for message without status', () => {
    const message = { type: MessageTypes.UPDATE_PROCESSING_STATUS };
    expect(isUpdateProcessingStatusRequest(message)).toBe(false);
  });
});

describe('isClearProcessingStateRequest type guard', () => {
  it('should return true for valid ClearProcessingStateRequest', () => {
    const message: ClearProcessingStateRequest = {
      type: MessageTypes.CLEAR_PROCESSING_STATE,
    };
    expect(isClearProcessingStateRequest(message)).toBe(true);
  });

  it('should return false for message with wrong type', () => {
    const message = { type: MessageTypes.GET_PROCESSING_STATE };
    expect(isClearProcessingStateRequest(message)).toBe(false);
  });
});

describe('isGetProcessingStateRequest type guard', () => {
  it('should return true for valid GetProcessingStateRequest', () => {
    const message: GetProcessingStateRequest = {
      type: MessageTypes.GET_PROCESSING_STATE,
    };
    expect(isGetProcessingStateRequest(message)).toBe(true);
  });

  it('should return false for message with wrong type', () => {
    const message = { type: MessageTypes.CLEAR_PROCESSING_STATE };
    expect(isGetProcessingStateRequest(message)).toBe(false);
  });
});

describe('isGithubWebFetchRequest type guard', () => {
  it('should return true for valid GithubWebFetchRequest', () => {
    const message: GithubWebFetchRequest = {
      type: MessageTypes.GITHUB_WEB_FETCH,
      url: 'https://github.com/owner/repo',
    };
    expect(isGithubWebFetchRequest(message)).toBe(true);
  });

  it('should return true for GithubWebFetchRequest with requestId', () => {
    const message: GithubWebFetchRequest = {
      type: MessageTypes.GITHUB_WEB_FETCH,
      url: 'https://github.com/owner/repo',
      requestId: 'test-request-id',
    };
    expect(isGithubWebFetchRequest(message)).toBe(true);
  });

  it('should return false for message without url', () => {
    const message = { type: MessageTypes.GITHUB_WEB_FETCH };
    expect(isGithubWebFetchRequest(message)).toBe(false);
  });

  it('should return false for message with non-string url', () => {
    const message = { type: MessageTypes.GITHUB_WEB_FETCH, url: 123 };
    expect(isGithubWebFetchRequest(message)).toBe(false);
  });
});

describe('isAbortGithubFetchRequest type guard', () => {
  it('should return true for valid AbortGithubFetchRequest', () => {
    const message: AbortGithubFetchRequest = {
      type: MessageTypes.ABORT_GITHUB_FETCH,
      requestId: 'test-request-id',
    };
    expect(isAbortGithubFetchRequest(message)).toBe(true);
  });

  it('should return false for message without requestId', () => {
    const message = { type: MessageTypes.ABORT_GITHUB_FETCH };
    expect(isAbortGithubFetchRequest(message)).toBe(false);
  });

  it('should return false for message with non-string requestId', () => {
    const message = { type: MessageTypes.ABORT_GITHUB_FETCH, requestId: 123 };
    expect(isAbortGithubFetchRequest(message)).toBe(false);
  });
});

describe('isFetchDiffRequest type guard', () => {
  it('should return true for valid FetchDiffRequest', () => {
    const message: FetchDiffRequest = {
      type: MessageTypes.FETCH_DIFF,
      url: 'https://github.com/owner/repo/commit/abc123.diff',
    };
    expect(isFetchDiffRequest(message)).toBe(true);
  });

  it('should return true for FetchDiffRequest with requestId', () => {
    const message: FetchDiffRequest = {
      type: MessageTypes.FETCH_DIFF,
      url: 'https://github.com/owner/repo/commit/abc123.diff',
      requestId: 'test-request-id',
    };
    expect(isFetchDiffRequest(message)).toBe(true);
  });

  it('should return false for message without url', () => {
    const message = { type: MessageTypes.FETCH_DIFF };
    expect(isFetchDiffRequest(message)).toBe(false);
  });
});

describe('isAbortFetchDiffRequest type guard', () => {
  it('should return true for valid AbortFetchDiffRequest', () => {
    const message: AbortFetchDiffRequest = {
      type: MessageTypes.ABORT_FETCH_DIFF,
      requestId: 'test-request-id',
    };
    expect(isAbortFetchDiffRequest(message)).toBe(true);
  });

  it('should return false for message without requestId', () => {
    const message = { type: MessageTypes.ABORT_FETCH_DIFF };
    expect(isAbortFetchDiffRequest(message)).toBe(false);
  });
});

describe('sendMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call chrome.runtime.sendMessage with the message', async () => {
    const mockSendMessage = vi.fn().mockResolvedValue({ success: true });
    const mockChrome = {
      runtime: {
        sendMessage: mockSendMessage,
      },
    };

    // Set up global chrome
    (globalThis as unknown as { chrome: typeof mockChrome }).chrome = mockChrome;

    const message: OpenPopupWithRepoRequest = {
      type: MessageTypes.OPEN_POPUP_WITH_REPO,
      repoUrl: 'https://github.com/owner/repo',
    };

    await sendMessage(message);

    expect(mockSendMessage).toHaveBeenCalledWith(message);
  });

  it('should return the response from chrome.runtime.sendMessage', async () => {
    const mockResponse = { success: true, html: '<html></html>' };
    const mockSendMessage = vi.fn().mockResolvedValue(mockResponse);
    const mockChrome = {
      runtime: {
        sendMessage: mockSendMessage,
      },
    };

    (globalThis as unknown as { chrome: typeof mockChrome }).chrome = mockChrome;

    const message: GithubWebFetchRequest = {
      type: MessageTypes.GITHUB_WEB_FETCH,
      url: 'https://github.com/owner/repo',
    };

    const result = await sendMessage(message);

    expect(result).toEqual(mockResponse);
  });

  it('should throw error when chrome.runtime is undefined', async () => {
    // Remove chrome from global
    (globalThis as unknown as { chrome?: unknown }).chrome = undefined;

    const message: OpenPopupWithRepoRequest = {
      type: MessageTypes.OPEN_POPUP_WITH_REPO,
      repoUrl: 'https://github.com/owner/repo',
    };

    await expect(sendMessage(message)).rejects.toThrow('Extension context unavailable');
  });

  it('should throw error when chrome.runtime.sendMessage is undefined', async () => {
    const mockChrome = {
      runtime: {},
    };

    (globalThis as unknown as { chrome: typeof mockChrome }).chrome = mockChrome;

    const message: OpenPopupWithRepoRequest = {
      type: MessageTypes.OPEN_POPUP_WITH_REPO,
      repoUrl: 'https://github.com/owner/repo',
    };

    await expect(sendMessage(message)).rejects.toThrow('Extension context unavailable');
  });
});

describe('Message interface type safety', () => {
  it('OpenPopupWithRepoRequest should require type and repoUrl', () => {
    // This is a compile-time test - if it compiles, the types are correct
    const validMessage: OpenPopupWithRepoRequest = {
      type: MessageTypes.OPEN_POPUP_WITH_REPO,
      repoUrl: 'https://github.com/owner/repo',
    };

    expect(validMessage.type).toBe(MessageTypes.OPEN_POPUP_WITH_REPO);
    expect(validMessage.repoUrl).toBe('https://github.com/owner/repo');
  });

  it('UpdateProcessingStatusRequest should require type and status', () => {
    const validMessage: UpdateProcessingStatusRequest = {
      type: MessageTypes.UPDATE_PROCESSING_STATUS,
      status: 'loading',
    };

    expect(validMessage.type).toBe(MessageTypes.UPDATE_PROCESSING_STATUS);
    expect(validMessage.status).toBe('loading');
  });

  it('GithubWebFetchRequest should require type and url', () => {
    const validMessage: GithubWebFetchRequest = {
      type: MessageTypes.GITHUB_WEB_FETCH,
      url: 'https://github.com/owner/repo',
      requestId: 'optional-id',
    };

    expect(validMessage.type).toBe(MessageTypes.GITHUB_WEB_FETCH);
    expect(validMessage.url).toBe('https://github.com/owner/repo');
    expect(validMessage.requestId).toBe('optional-id');
  });

  it('FetchDiffRequest should require type and url', () => {
    const validMessage: FetchDiffRequest = {
      type: MessageTypes.FETCH_DIFF,
      url: 'https://github.com/owner/repo/commit/abc123.diff',
    };

    expect(validMessage.type).toBe(MessageTypes.FETCH_DIFF);
    expect(validMessage.url).toBe('https://github.com/owner/repo/commit/abc123.diff');
  });

  it('AbortFetchDiffRequest should require type and requestId', () => {
    const validMessage: AbortFetchDiffRequest = {
      type: MessageTypes.ABORT_FETCH_DIFF,
      requestId: 'test-request-id',
    };

    expect(validMessage.type).toBe(MessageTypes.ABORT_FETCH_DIFF);
    expect(validMessage.requestId).toBe('test-request-id');
  });
});
