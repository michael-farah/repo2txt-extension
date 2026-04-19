/**
 * Background service worker for repo2txt extension
 * Manages processing state and badge notifications
 */

interface ProcessingState {
  repoUrl: string;
  status: 'loading' | 'loaded' | 'generating';
  timestamp: number;
}

// Track pending requests for cancellation
const pendingRequests = new Map<string, AbortController>();
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Handle OPEN_POPUP_WITH_REPO - store processing state and set badge
  if (message.type === 'OPEN_POPUP_WITH_REPO' && message.repoUrl) {
    const processingState: ProcessingState = {
      repoUrl: message.repoUrl,
      status: 'loading',
      timestamp: Date.now(),
    };

    chrome.storage.session
      .set({ processingState })
      .then(() => {
        chrome.action.setBadgeText({ text: '1' });
        chrome.action.setBadgeBackgroundColor({ color: '#4F46E5' });
        sendResponse({ success: true });
      })
      .catch((error: Error) => {
        console.error('repo2txt: Failed to store processing state:', error);
        sendResponse({ success: false, error: error.message });
      });

    // Return true required for async sendResponse in MV3
    return true;
  }

  // Handle UPDATE_PROCESSING_STATUS - update the status field
  if (message.type === 'UPDATE_PROCESSING_STATUS' && message.status) {
    chrome.storage.session
      .get('processingState')
      .then((result) => {
        const currentState = result.processingState as ProcessingState | undefined;
        if (currentState) {
          const updatedState: ProcessingState = {
            ...currentState,
            status: message.status,
          };
          return chrome.storage.session.set({ processingState: updatedState });
        }
        return Promise.resolve();
      })
      .then(() => {
        // Clear badge when status is 'loaded'
        if (message.status === 'loaded') {
          chrome.action.setBadgeText({ text: '' });
        }
        sendResponse({ success: true });
      })
      .catch((error: Error) => {
        console.error('repo2txt: Failed to update processing status:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }

  // Handle CLEAR_PROCESSING_STATE - remove processing state and clear badge
  if (message.type === 'CLEAR_PROCESSING_STATE') {
    chrome.storage.session
      .remove('processingState')
      .then(() => {
        chrome.action.setBadgeText({ text: '' });
        sendResponse({ success: true });
      })
      .catch((error: Error) => {
        console.error('repo2txt: Failed to clear processing state:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }

  // Handle GET_PROCESSING_STATE - return current processing state
  if (message.type === 'GET_PROCESSING_STATE') {
    chrome.storage.session
      .get('processingState')
      .then((result) => {
        sendResponse({
          success: true,
          state: result.processingState as ProcessingState | undefined,
        });
      })
      .catch((error: Error) => {
        console.error('repo2txt: Failed to get processing state:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }

/**
 * Handle GITHUB_WEB_FETCH - fetch github.com pages from the service worker.
 * Chrome MV3 service workers can use fetch() with credentials: 'include' when
 * the extension has host_permissions for the target domain. This allows
 * fetching GitHub pages with the user's _gh_sess cookie included.
 */
if (message.type === 'GITHUB_WEB_FETCH' && message.url) {
  const { url, requestId } = message as { url: string; requestId?: string };

  // Security: validate URL targets github.com or raw.githubusercontent.com (prevent SSRF)
  // Using URL parsing to prevent bypasses like github.com.evil.com or github.com@evil.com
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    sendResponse({
      success: false,
      status: 0,
      html: '',
      error: 'Invalid URL: must be a github.com or raw.githubusercontent.com URL',
    });
    return true;
  }

  const allowedHosts = ['github.com', 'raw.githubusercontent.com'];
  if (parsedUrl.protocol !== 'https:' || !allowedHosts.includes(parsedUrl.hostname)) {
    sendResponse({
      success: false,
      status: 0,
      html: '',
      error: 'Invalid URL: must be a github.com or raw.githubusercontent.com URL',
    });
    return true;
  }

  console.debug(`[repo2txt] GITHUB_WEB_FETCH: ${url}`);

  // Create AbortController for this request
  const controller = new AbortController();
  if (requestId) {
    pendingRequests.set(requestId, controller);
  }

  fetch(url, { credentials: 'include', signal: controller.signal })
    .then(async (response) => {
      const html = await response.text();
      console.debug(`[repo2txt] GITHUB_WEB_FETCH: ${url} → ${response.status} (${html.length} bytes)`);
      sendResponse({
        success: response.ok,
        status: response.status,
        html,
      });
    })
    .catch((error: Error) => {
      if (error.name === 'AbortError') {
        console.debug(`[repo2txt] GITHUB_WEB_FETCH: ${url} → aborted`);
        sendResponse({
          success: false,
          status: 0,
          html: '',
          error: 'Request aborted',
        });
      } else {
        console.error('repo2txt: Failed to fetch GitHub page:', error);
        sendResponse({
          success: false,
          status: 0,
          html: '',
          error: error.message,
        });
      }
    })
    .finally(() => {
      // Clean up the pending request
      if (requestId) {
        pendingRequests.delete(requestId);
      }
    });

  return true;
}

// Handle ABORT_GITHUB_FETCH - cancel a pending request
if (message.type === 'ABORT_GITHUB_FETCH' && message.requestId) {
  const controller = pendingRequests.get(message.requestId);
  if (controller) {
    controller.abort();
    pendingRequests.delete(message.requestId);
    sendResponse({ success: true });
  } else {
    sendResponse({ success: false, error: 'Request not found' });
  }
  return true;
}
});

// Listen for session storage changes to manage badge
chrome.storage.session.onChanged.addListener((changes) => {
  if (!changes.processingState) return;

  const { oldValue, newValue } = changes.processingState;

  // Processing state removed — clear badge
  if (oldValue && !newValue) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  // Processing state added — set badge
  if (newValue && !oldValue) {
    chrome.action.setBadgeText({ text: '1' });
    chrome.action.setBadgeBackgroundColor({ color: '#4F46E5' });
    return;
  }

  // Status updated — clear badge when loading is done
  const newState = newValue as ProcessingState | undefined;
  if (newState?.status === 'loaded') {
    chrome.action.setBadgeText({ text: '' });
  } else if (newState?.status === 'generating') {
    chrome.action.setBadgeText({ text: '1' });
    chrome.action.setBadgeBackgroundColor({ color: '#4F46E5' });
  }
});

// Keep the legacy pendingRepoUrl listener for backward compatibility
chrome.storage.session.onChanged.addListener((changes) => {
  if (changes.pendingRepoUrl && changes.pendingRepoUrl.newValue === undefined) {
    // Only clear badge if there's no processingState either
    chrome.storage.session.get('processingState').then((result) => {
      if (!result.processingState) {
        chrome.action.setBadgeText({ text: '' });
      }
    });
  }
});
