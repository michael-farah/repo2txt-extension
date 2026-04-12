chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'OPEN_POPUP_WITH_REPO' && message.repoUrl) {
    chrome.storage.session
      .set({ pendingRepoUrl: message.repoUrl })
      .then(() => {
        chrome.action.setBadgeText({ text: '1' });
        chrome.action.setBadgeBackgroundColor({ color: '#4F46E5' });
        sendResponse({ success: true });
      })
      .catch((error: Error) => {
        console.error('repo2txt: Failed to store repo URL:', error);
        sendResponse({ success: false, error: error.message });
      });
    // return true required for async sendResponse in MV3
    return true;
  }
});

chrome.storage.session.onChanged.addListener((changes) => {
  if (changes.pendingRepoUrl?.newValue === undefined) {
    chrome.action.setBadgeText({ text: '' });
  }
});
