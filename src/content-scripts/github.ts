import { getGitHubPageType, isDiffPage } from './pageDetection';

interface GitHubRepoInfo {
  owner: string;
  repo: string;
  branch?: string;
  path?: string;
}

async function shouldShowGitHubButton(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get('repo2txt-content-settings');
    const settings = result['repo2txt-content-settings'];
    if (settings && typeof settings === 'object') {
      return (settings as { showGitHubButton?: boolean }).showGitHubButton ?? true;
    }
    return true;
  } catch {
    return true;
  }
}

/**
 * Extract repository information from current GitHub page
 */
function extractRepoInfo(): GitHubRepoInfo | null {
  const pathParts = window.location.pathname.split('/').filter(Boolean);

  // Minimum: /owner/repo
  if (pathParts.length < 2) {
    return null;
  }

  const owner = pathParts[0];
  const repo = pathParts[1];
  let branch: string | undefined;
  let path: string | undefined;

  // Check if we're on a specific branch/path
  // Patterns:
  // /owner/repo (default branch)
  // /owner/repo/tree/branch
  // /owner/repo/tree/branch/path/to/file
  // /owner/repo/blob/branch/path/to/file
  if (pathParts.length >= 4 && (pathParts[2] === 'tree' || pathParts[2] === 'blob')) {
    branch = pathParts[3];
    if (pathParts.length > 4) {
      path = pathParts.slice(4).join('/');
    }
  }

  return { owner, repo, branch, path };
}

/**
 * Check if current page is a valid GitHub repository page
 * Now includes diff pages (commit, PR, compare) for the Copy Diff button
 */
function isValidRepoPage(): boolean {
  const pageType = getGitHubPageType(window.location.pathname);
  // Valid for repo pages and diff pages (commit, pull, compare)
  return pageType !== null;
}

/**
 * Create "Convert to Text" button matching GitHub's design
 * Uses createElement/textContent instead of innerHTML to prevent XSS
 */
function createConvertButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'repo2txt-convert-btn';
  button.type = 'button';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'repo2txt-icon');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('fill', 'currentColor');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute(
    'd',
    'M4 1.5H3a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2v-14a2 2 0 00-2-2h-1v1h1a1 1 0 011 1v14a1 1 0 01-1 1H3a1 1 0 01-1-1v-14a1 1 0 011-1h1v-1zm2 0v1h4v-1H6zm0 2.5v1h4v-1H6zm0 2.5v1h4v-1H6zm0 2.5v1h4v-1H6z'
  );
  svg.appendChild(path);

  const span = document.createElement('span');
  span.textContent = 'Convert to Text';

  button.appendChild(svg);
  button.appendChild(span);

  return button;
}

/**
 * Create "Copy Diff" button matching GitHub's design
 * Uses createElement/textContent instead of innerHTML to prevent XSS
 */
function createCopyDiffButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'repo2txt-copy-diff-btn';
  button.type = 'button';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'repo2txt-icon');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('fill', 'currentColor');

  // Clipboard icon path
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute(
    'd',
    'M3.5 2a2.5 2.5 0 0 1 5 0v1h1a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h1V2Zm2 1V2a1.5 1.5 0 0 0-3 0v1h3Zm-3 2.5v7a1 1 0 0 0 1 1h6.5a1 1 0 0 0 1-1V5.5H2.5Z'
  );
  svg.appendChild(path);

  const span = document.createElement('span');
  span.textContent = 'Copy Diff';

  button.appendChild(svg);
  button.appendChild(span);

  return button;
}

/**
 * Inject styles for the buttons
 */
function injectStyles(): void {
  if (document.getElementById('repo2txt-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'repo2txt-styles';
  style.textContent = `
    .repo2txt-convert-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 16px;
      font-size: 14px;
      font-weight: 500;
      line-height: 20px;
      color: #24292f;
      background-color: #f6f8fa;
      border: 1px solid rgba(27, 31, 36, 0.15);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .repo2txt-convert-btn:hover {
      background-color: #f3f4f6;
      border-color: rgba(27, 31, 36, 0.2);
    }

    .repo2txt-convert-btn:active {
      background-color: #eaecef;
    }

    .repo2txt-convert-btn .repo2txt-icon {
      flex-shrink: 0;
    }

    /* Dark mode support for convert button */
    @media (prefers-color-scheme: dark) {
      .repo2txt-convert-btn {
        color: #c9d1d9;
        background-color: #21262d;
        border-color: rgba(240, 246, 252, 0.1);
      }

      .repo2txt-convert-btn:hover {
        background-color: #30363d;
        border-color: rgba(240, 246, 252, 0.15);
      }

      .repo2txt-convert-btn:active {
        background-color: #323942;
      }
    }

    [data-color-mode="dark"] .repo2txt-convert-btn {
      color: #c9d1d9;
      background-color: #21262d;
      border-color: rgba(240, 246, 252, 0.1);
    }

    [data-color-mode="dark"] .repo2txt-convert-btn:hover {
      background-color: #30363d;
      border-color: rgba(240, 246, 252, 0.15);
    }

    /* Copy Diff button styles */
    .repo2txt-copy-diff-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 16px;
      font-size: 14px;
      font-weight: 500;
      line-height: 20px;
      color: #24292f;
      background-color: #f6f8fa;
      border: 1px solid rgba(27, 31, 36, 0.15);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .repo2txt-copy-diff-btn:hover {
      background-color: #f3f4f6;
      border-color: rgba(27, 31, 36, 0.2);
    }

    .repo2txt-copy-diff-btn:active {
      background-color: #eaecef;
    }

    .repo2txt-copy-diff-btn .repo2txt-icon {
      flex-shrink: 0;
    }

    /* Loading spinner */
    .repo2txt-copy-diff-btn .repo2txt-spinner {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid currentColor;
      border-top-color: transparent;
      border-radius: 50%;
      animation: repo2txt-spin 0.6s linear infinite;
    }

    @keyframes repo2txt-spin {
      to { transform: rotate(360deg); }
    }

    /* Dark mode support for copy diff button */
    @media (prefers-color-scheme: dark) {
      .repo2txt-copy-diff-btn {
        color: #c9d1d9;
        background-color: #21262d;
        border-color: rgba(240, 246, 252, 0.1);
      }

      .repo2txt-copy-diff-btn:hover {
        background-color: #30363d;
        border-color: rgba(240, 246, 252, 0.15);
      }

      .repo2txt-copy-diff-btn:active {
        background-color: #323942;
      }
    }

    [data-color-mode="dark"] .repo2txt-copy-diff-btn {
      color: #c9d1d9;
      background-color: #21262d;
      border-color: rgba(240, 246, 252, 0.1);
    }

    [data-color-mode="dark"] .repo2txt-copy-diff-btn:hover {
      background-color: #30363d;
      border-color: rgba(240, 246, 252, 0.15);
    }
  `;

  document.head.appendChild(style);
}

/**
 * Find the appropriate container for the button in GitHub's header
 */
function findButtonContainer(): HTMLElement | null {
  // Try to find the file actions container (near Code button)
  const fileActions = document.querySelector('.file-navigation');
  if (fileActions) {
    return fileActions as HTMLElement;
  }

  // Try repository header actions
  const repoActions = document.querySelector('.repo-actions');
  if (repoActions) {
    return repoActions as HTMLElement;
  }

  // Fallback: try to find the main repo header
  const repoHeader = document.querySelector('.repository-content .flex-auto');
  if (repoHeader) {
    return repoHeader as HTMLElement;
  }

  return null;
}

/**
 * Find the appropriate container for the Copy Diff button on diff pages
 */
function findDiffButtonContainer(): HTMLElement | null {
  // Commit pages: commit actions area
  const commitActions = document.querySelector('.commit-actions');
  if (commitActions) {
    return commitActions as HTMLElement;
  }

  // Commit pages: button group near commit hash
  const btnGroup = document.querySelector('.BtnGroup:not(.ml-2)');
  if (btnGroup) {
    return btnGroup as HTMLElement;
  }

  // PR pages: header actions
  const prHeaderActions = document.querySelector('.gh-header-actions');
  if (prHeaderActions) {
    return prHeaderActions as HTMLElement;
  }

  // PR pages: actions container
  const prActions = document.querySelector('[data-testid="pr-actions"]');
  if (prActions) {
    return prActions as HTMLElement;
  }

  // Compare pages: compare header actions
  const compareHeader = document.querySelector('.compare-header');
  if (compareHeader) {
    return compareHeader as HTMLElement;
  }

  // Fallback: repository content area
  const repoContent = document.querySelector('.repository-content');
  if (repoContent) {
    return repoContent as HTMLElement;
  }

  // Fallback: repo nav area
  const repoNav = document.querySelector('.js-repo-nav');
  if (repoNav) {
    return repoNav as HTMLElement;
  }

  return null;
}

/**
 * Construct the .diff URL from the current page URL
 */
function constructDiffUrl(): string {
  const url = new URL(window.location.href);
  // Use pathname without query params
  const pathname = url.pathname;

  // Ensure the URL ends with .diff
  if (pathname.endsWith('.diff')) {
    return url.origin + pathname;
  }

  return url.origin + pathname + '.diff';
}

/**
 * Show large diff warning if size exceeds threshold
 */
function showLargeDiffWarning(byteSize: number): boolean {
  const DIFF_SIZE_WARNING = 50 * 1024; // 50KB

  if (byteSize > DIFF_SIZE_WARNING) {
    const sizeKB = Math.round(byteSize / 1024);
    const approxTokens = Math.round(byteSize / 4);
    return confirm(
      `This diff is ${sizeKB}KB (~${approxTokens.toLocaleString()} tokens). It may be too large for some LLM contexts. Copy anyway?`
    );
  }

  return true;
}

/**
 * Inject the Copy Diff button into the page
 */
function injectCopyDiffButton(): void {
  // Check if already injected
  if (document.querySelector('.repo2txt-copy-diff-btn')) {
    return;
  }

  // Validate this is a diff page
  if (!isDiffPage(window.location.pathname)) {
    return;
  }

  // Inject styles
  injectStyles();

  // Find container
  const container = findDiffButtonContainer();
  if (!container) {
    return;
  }

  // Create button
  const button = createCopyDiffButton();

  // Handle click
  button.addEventListener('click', async () => {
    // Set loading state
    const originalContent = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="repo2txt-spinner"></span><span>Copying...</span>';

    try {
      const diffUrl = constructDiffUrl();
      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      if (!chrome.runtime || !chrome.runtime.sendMessage) {
        throw new Error('Extension context not available');
      }

      // Send message to background script to fetch diff
      const response = await chrome.runtime.sendMessage({
        type: 'FETCH_DIFF',
        url: diffUrl,
        requestId,
      });

      if (!response || !response.success || response.error) {
        throw new Error(response?.error || 'Failed to fetch diff');
      }

      const diffText = response.diff;
      const byteSize = new TextEncoder().encode(diffText).length;

      // Check size warning
      if (!showLargeDiffWarning(byteSize)) {
        // User cancelled, revert button
        button.innerHTML = originalContent;
        button.disabled = false;
        return;
      }

      // Copy to clipboard
      await navigator.clipboard.writeText(diffText);

      // Show success state
      button.innerHTML = '<span>Copied ✓</span>';
      setTimeout(() => {
        button.innerHTML = originalContent;
        button.disabled = false;
      }, 2000);
    } catch (error) {
      // Show error
      console.error('repo2txt: Failed to copy diff:', error);
      alert(`Failed to copy diff: ${error instanceof Error ? error.message : 'Unknown error'}`);

      // Revert button
      button.innerHTML = originalContent;
      button.disabled = false;
    }
  });

  // Insert button
  container.appendChild(button);
}

/**
 * Inject the Convert to Text button into the page
 */
function injectConvertButton(): void {
  // Check if already injected
  if (document.querySelector('.repo2txt-convert-btn')) {
    return;
  }

  // Validate page
  if (!isValidRepoPage()) {
    return;
  }

  // Don't show on diff pages
  if (isDiffPage(window.location.pathname)) {
    return;
  }

  // Inject styles
  injectStyles();

  // Find container
  const container = findButtonContainer();
  if (!container) {
    return;
  }

  // Create button
  const button = createConvertButton();

  // Handle click
  button.addEventListener('click', () => {
    const repoInfo = extractRepoInfo();
    if (!repoInfo) {
      console.error('repo2txt: Could not extract repo info');
      return;
    }

    // Use the current page URL directly — it already contains the full branch name
    // (including slashes like feature/auth/login) and any subdirectory path.
    // Reconstructing from pathParts would lose segments after the first slash.
    const repoUrl = window.location.href;

    // Send message to background script to open popup
    if (chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime
        .sendMessage({
          type: 'OPEN_POPUP_WITH_REPO',
          repoUrl: repoUrl,
        })
        .catch(() => {
          // Fallback: copy URL to clipboard
          navigator.clipboard.writeText(repoUrl).then(() => {
            alert(
              `Repository URL copied to clipboard: ${repoUrl}\n\nOpen the repo2txt extension and paste the URL.`
            );
          });
        });
    } else {
      // Extension context not available, copy to clipboard
      navigator.clipboard.writeText(repoUrl).then(() => {
        alert(
          `Repository URL copied to clipboard: ${repoUrl}\n\nOpen the repo2txt extension and paste the URL.`
        );
      });
    }
  });

  // Insert button
  container.appendChild(button);
}

/**
 * Main injection function - routes to appropriate button based on page type
 */
function injectButton(): void {
  const pathname = window.location.pathname;

  if (isDiffPage(pathname)) {
    injectCopyDiffButton();
  } else if (isValidRepoPage()) {
    injectConvertButton();
  }
}

let observer: MutationObserver | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function handleNavigationChange(): void {
  // Remove existing buttons
  const existingConvertBtn = document.querySelector('.repo2txt-convert-btn');
  if (existingConvertBtn) {
    existingConvertBtn.remove();
  }

  const existingCopyDiffBtn = document.querySelector('.repo2txt-copy-diff-btn');
  if (existingCopyDiffBtn) {
    existingCopyDiffBtn.remove();
  }

  setTimeout(injectButton, 500);
}

function disconnectObserver(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

async function init(): Promise<void> {
  disconnectObserver();
  const showButton = await shouldShowGitHubButton();
  if (!showButton) {
    // Remove existing buttons if present
    const existingConvertBtn = document.querySelector('.repo2txt-convert-btn');
    if (existingConvertBtn) existingConvertBtn.remove();
    const existingCopyDiffBtn = document.querySelector('.repo2txt-copy-diff-btn');
    if (existingCopyDiffBtn) existingCopyDiffBtn.remove();
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(injectButton, 500);
    });
  } else {
    setTimeout(injectButton, 500);
  }

  let lastUrl = location.href;
  observer = new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(handleNavigationChange, 300);
    }
  });
  observer.observe(document.body, { subtree: true, childList: true });
}

init();

if (chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes['repo2txt-content-settings']) {
      init();
    }
  });
}

// Disconnect on GitHub SPA navigation to prevent observer stacking
window.addEventListener('yt-navigate-start', disconnectObserver);
window.addEventListener('beforeunload', disconnectObserver);
