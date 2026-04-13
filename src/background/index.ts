/**
 * Background service worker for repo2txt extension
 * Manages processing state and badge notifications
 */

interface ProcessingState {
  repoUrl: string;
  status: 'loading' | 'loaded' | 'generating';
  timestamp: number;
}

// Message handlers
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
  if (newValue?.status === 'loaded') {
    chrome.action.setBadgeText({ text: '' });
  } else if (newValue?.status === 'generating') {
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
