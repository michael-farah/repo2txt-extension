/**
 * Typed Chrome Message Protocol
 *
 * This module provides type-safe message handling for Chrome extension
 * runtime messaging between content scripts, background service worker,
 * and popup/extension pages.
 */

// ============================================================================
// Message Type Constants
// ============================================================================

export const MessageTypes = {
  OPEN_POPUP_WITH_REPO: 'OPEN_POPUP_WITH_REPO',
  UPDATE_PROCESSING_STATUS: 'UPDATE_PROCESSING_STATUS',
  CLEAR_PROCESSING_STATE: 'CLEAR_PROCESSING_STATE',
  GET_PROCESSING_STATE: 'GET_PROCESSING_STATE',
  GITHUB_WEB_FETCH: 'GITHUB_WEB_FETCH',
  ABORT_GITHUB_FETCH: 'ABORT_GITHUB_FETCH',
  FETCH_DIFF: 'FETCH_DIFF',
  ABORT_FETCH_DIFF: 'ABORT_FETCH_DIFF',
} as const;

export type MessageType = (typeof MessageTypes)[keyof typeof MessageTypes];

// ============================================================================
// Request/Response Interfaces
// ============================================================================

// OPEN_POPUP_WITH_REPO
export interface OpenPopupWithRepoRequest {
  type: typeof MessageTypes.OPEN_POPUP_WITH_REPO;
  repoUrl: string;
}

export interface OpenPopupWithRepoResponse {
  success: boolean;
  error?: string;
}

// UPDATE_PROCESSING_STATUS
export interface UpdateProcessingStatusRequest {
  type: typeof MessageTypes.UPDATE_PROCESSING_STATUS;
  status: 'loading' | 'loaded' | 'generating';
}

export interface UpdateProcessingStatusResponse {
  success: boolean;
  error?: string;
}

// CLEAR_PROCESSING_STATE
export interface ClearProcessingStateRequest {
  type: typeof MessageTypes.CLEAR_PROCESSING_STATE;
}

export interface ClearProcessingStateResponse {
  success: boolean;
  error?: string;
}

// GET_PROCESSING_STATE
export interface GetProcessingStateRequest {
  type: typeof MessageTypes.GET_PROCESSING_STATE;
}

export interface ProcessingStateData {
  repoUrl: string;
  status: 'loading' | 'loaded' | 'generating';
  timestamp: number;
}

export interface GetProcessingStateResponse {
  success: boolean;
  state?: ProcessingStateData;
  error?: string;
}

// GITHUB_WEB_FETCH
export interface GithubWebFetchRequest {
  type: typeof MessageTypes.GITHUB_WEB_FETCH;
  url: string;
  requestId?: string;
}

export interface GithubWebFetchResponse {
  success: boolean;
  status: number;
  html: string;
  error?: string;
}

// ABORT_GITHUB_FETCH
export interface AbortGithubFetchRequest {
  type: typeof MessageTypes.ABORT_GITHUB_FETCH;
  requestId: string;
}

export interface AbortGithubFetchResponse {
  success: boolean;
  error?: string;
}

// FETCH_DIFF
export interface FetchDiffRequest {
  type: typeof MessageTypes.FETCH_DIFF;
  url: string;
  requestId?: string;
}

export interface FetchDiffResponse {
  success: boolean;
  status: number;
  diff: string;
  error?: string;
}

// ABORT_FETCH_DIFF
export interface AbortFetchDiffRequest {
  type: typeof MessageTypes.ABORT_FETCH_DIFF;
  requestId: string;
}

export interface AbortFetchDiffResponse {
  success: boolean;
  error?: string;
}

// ============================================================================
// Union Types
// ============================================================================

export type ChromeMessageRequest =
  | OpenPopupWithRepoRequest
  | UpdateProcessingStatusRequest
  | ClearProcessingStateRequest
  | GetProcessingStateRequest
  | GithubWebFetchRequest
  | AbortGithubFetchRequest
  | FetchDiffRequest
  | AbortFetchDiffRequest;

export type ChromeMessageResponse =
  | OpenPopupWithRepoResponse
  | UpdateProcessingStatusResponse
  | ClearProcessingStateResponse
  | GetProcessingStateResponse
  | GithubWebFetchResponse
  | AbortGithubFetchResponse
  | FetchDiffResponse
  | AbortFetchDiffResponse;

// ============================================================================
// Type-Safe Message Sender
// ============================================================================

/**
 * Send a typed message to the Chrome runtime.
 *
 * @param message - The message to send (must include a valid `type` field)
 * @returns Promise resolving to the typed response
 * @throws Error if chrome.runtime is unavailable (non-extension context)
 */
export async function sendMessage<TRequest extends ChromeMessageRequest, TResponse>(
  message: TRequest
): Promise<TResponse> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    throw new Error('Extension context unavailable');
  }
  return chrome.runtime.sendMessage(message);
}

// ============================================================================
// Type-Safe Message Handler Types
// ============================================================================

/**
 * Type for message handler functions.
 *
 * Handlers receive the typed message and sender, and return either
 * the response directly or a Promise for async handling.
 */
export type MessageHandler<TRequest extends ChromeMessageRequest, TResponse> = (
  message: TRequest,
  sender: chrome.runtime.MessageSender
) => TResponse | Promise<TResponse>;

// ============================================================================
// Type Guard Helpers
// ============================================================================

/**
 * Check if a message is of a specific type.
 *
 * @param message - The message to check
 * @param type - The expected message type constant
 * @returns Type predicate indicating if message matches the expected type
 */
export function isMessageType<T extends ChromeMessageRequest>(
  message: unknown,
  type: MessageType
): message is T {
  return (
    typeof message === 'object' && message !== null && (message as { type: string }).type === type
  );
}

/**
 * Type guard for OpenPopupWithRepoRequest
 */
export function isOpenPopupWithRepoRequest(message: unknown): message is OpenPopupWithRepoRequest {
  return (
    isMessageType<OpenPopupWithRepoRequest>(message, MessageTypes.OPEN_POPUP_WITH_REPO) &&
    typeof (message as OpenPopupWithRepoRequest).repoUrl === 'string'
  );
}

/**
 * Type guard for UpdateProcessingStatusRequest
 */
export function isUpdateProcessingStatusRequest(
  message: unknown
): message is UpdateProcessingStatusRequest {
  return (
    isMessageType<UpdateProcessingStatusRequest>(message, MessageTypes.UPDATE_PROCESSING_STATUS) &&
    typeof (message as UpdateProcessingStatusRequest).status === 'string' &&
    ['loading', 'loaded', 'generating'].includes((message as UpdateProcessingStatusRequest).status)
  );
}

/**
 * Type guard for ClearProcessingStateRequest
 */
export function isClearProcessingStateRequest(
  message: unknown
): message is ClearProcessingStateRequest {
  return isMessageType<ClearProcessingStateRequest>(message, MessageTypes.CLEAR_PROCESSING_STATE);
}

/**
 * Type guard for GetProcessingStateRequest
 */
export function isGetProcessingStateRequest(
  message: unknown
): message is GetProcessingStateRequest {
  return isMessageType<GetProcessingStateRequest>(message, MessageTypes.GET_PROCESSING_STATE);
}

/**
 * Type guard for GithubWebFetchRequest
 */
export function isGithubWebFetchRequest(message: unknown): message is GithubWebFetchRequest {
  return (
    isMessageType<GithubWebFetchRequest>(message, MessageTypes.GITHUB_WEB_FETCH) &&
    typeof (message as GithubWebFetchRequest).url === 'string'
  );
}

/**
 * Type guard for AbortGithubFetchRequest
 */
export function isAbortGithubFetchRequest(message: unknown): message is AbortGithubFetchRequest {
  return (
    isMessageType<AbortGithubFetchRequest>(message, MessageTypes.ABORT_GITHUB_FETCH) &&
    typeof (message as AbortGithubFetchRequest).requestId === 'string'
  );
}

/**
 * Type guard for FetchDiffRequest
 */
export function isFetchDiffRequest(message: unknown): message is FetchDiffRequest {
  return (
    isMessageType<FetchDiffRequest>(message, MessageTypes.FETCH_DIFF) &&
    typeof (message as FetchDiffRequest).url === 'string'
  );
}

/**
 * Type guard for AbortFetchDiffRequest
 */
export function isAbortFetchDiffRequest(message: unknown): message is AbortFetchDiffRequest {
  return (
    isMessageType<AbortFetchDiffRequest>(message, MessageTypes.ABORT_FETCH_DIFF) &&
    typeof (message as AbortFetchDiffRequest).requestId === 'string'
  );
}
