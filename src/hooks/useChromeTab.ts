import { useState, useEffect, useRef } from 'react';
import { GitHubProvider } from '@/features/github';
import { useStore } from '@/store';
import { ChromeBridge } from '@/lib/chrome/ChromeBridge';
import type { ProcessingState } from '@/lib/chrome/ProcessingState';
export function useChromeTab(isLoading: boolean, onNewRepoDetected?: () => void) {
  const [initialUrl, setInitialUrl] = useState<string | undefined>(undefined);
  const [autoSubmitUrl, setAutoSubmitUrl] = useState<string | undefined>(undefined);
  const [githubTabId, setGithubTabId] = useState<number | null>(null);
  const hasInitialized = useRef(false);

  // Initialization: check processing state, pending URL, and auto-detect current tab
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initialize = async () => {
      // Skip if not in Chrome extension context
      if (typeof chrome === 'undefined' || !chrome.tabs) return;

      try {
        const provider = new GitHubProvider();
        let currentTabUrl: string | undefined;

        // Get current tab URL first
        if (chrome.tabs) {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab?.url && provider.validateUrl(tab.url)) {
            currentTabUrl = tab.url;
            if (tab.id !== undefined) {
              setGithubTabId(tab.id);
            }
          }
        }

        // 1. Check for existing processing state
        const processingState = await ChromeBridge.getProcessingState();

        if (processingState?.repoUrl) {
          // If we're on a NEW GitHub page and previous processing finished, discard old state
          if (
            currentTabUrl &&
            currentTabUrl !== processingState.repoUrl &&
            processingState.status === 'loaded'
          ) {
            setInitialUrl(currentTabUrl);
            // We don't auto-submit the new URL, let the user click Generate
            onNewRepoDetected?.();
            return;
          }

          setInitialUrl(processingState.repoUrl);
          if (useStore.getState().nodes.length === 0) {
            setAutoSubmitUrl(processingState.repoUrl);
          }
          return;
        }

        // 2. Check for legacy pendingRepoUrl (content script clicked "Convert to Text")
        if (typeof chrome !== 'undefined' && chrome.storage?.session) {
          const pendingResult = await chrome.storage.session.get('pendingRepoUrl');
          if (pendingResult.pendingRepoUrl) {
            const url = pendingResult.pendingRepoUrl as string;
            setInitialUrl(url);
            setAutoSubmitUrl(url);
            chrome.storage.session.remove('pendingRepoUrl');
            return;
          }
        }

        // 3. Auto-detect current tab URL (if it's a GitHub repo page)
        if (currentTabUrl) {
          setInitialUrl(currentTabUrl);
        }
      } catch {
        // Session storage or tabs API unavailable — user can paste URL manually
      }
    };

    initialize();
  }, [onNewRepoDetected]);

  // Listen for tab URL changes and active tab switches to auto-update the URL input
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.tabs) return;

    const provider = new GitHubProvider();

    const handleTabUpdate = async (
      tabId: number,
      changeInfo: { url?: string },
      tab: chrome.tabs.Tab
    ) => {
      if (changeInfo.url && provider.validateUrl(changeInfo.url) && !isLoading) {
        // Only update if the tab is the active tab in the current window
        if (tab.active) {
          try {
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (activeTab && activeTab.id === tabId) {
              setInitialUrl(changeInfo.url);
              setGithubTabId(tabId);
            }
          } catch {
            // Ignore errors
          }
        }
      }
    };

    const handleTabActivated = async (activeInfo: { tabId: number; windowId: number }) => {
      try {
        // Only update if the activated tab is in the current window
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (
          activeTab &&
          activeTab.id === activeInfo.tabId &&
          activeTab.url &&
          provider.validateUrl(activeTab.url) &&
          !isLoading
        ) {
          setInitialUrl(activeTab.url);
          if (activeTab.id !== undefined) {
            setGithubTabId(activeTab.id);
          }
        }
      } catch {
        // Tab may have been closed
      }
    };

    chrome.tabs.onUpdated.addListener(handleTabUpdate);
    chrome.tabs.onActivated.addListener(handleTabActivated);

    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdate);
      chrome.tabs.onActivated.removeListener(handleTabActivated);
    };
  }, [isLoading]);

  const resetTabState = () => {
    setInitialUrl(undefined);
    setAutoSubmitUrl(undefined);
    setGithubTabId(null);

    ChromeBridge.clearProcessingState();
  };

  return { initialUrl, autoSubmitUrl, githubTabId, resetTabState };
}
