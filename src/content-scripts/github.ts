interface GitHubRepoInfo {
  owner: string;
  repo: string;
  branch?: string;
  path?: string;
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
 */
function isValidRepoPage(): boolean {
  const pathParts = window.location.pathname.split('/').filter(Boolean);

  // Must have at least owner/repo
  if (pathParts.length < 2) {
    return false;
  }

  // Skip non-repo pages
  const skipPatterns = [
    'pull',
    'issues',
    'wiki',
    'actions',
    'security',
    'pulse',
    'graphs',
    'network',
    'settings',
    'projects',
    'discussions',
    'forks',
    'stargazers',
    'watchers',
    'releases',
  ];

  if (pathParts.length >= 3 && skipPatterns.includes(pathParts[2])) {
    return false;
  }

  return true;
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
 * Inject styles for the button
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
    
    /* Dark mode support */
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
 * Inject the button into the page
 */
function injectButton(): void {
  // Check if already injected
  if (document.querySelector('.repo2txt-convert-btn')) {
    return;
  }

  // Validate page
  if (!isValidRepoPage()) {
    return;
  }

  // Inject styles
  injectStyles();

  // Find container
  const container = findButtonContainer();
  if (!container) {
    console.log('repo2txt: Could not find button container');
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
  console.log('repo2txt: Button injected successfully');
}

let observer: MutationObserver | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function handleNavigationChange(): void {
  const existingBtn = document.querySelector('.repo2txt-convert-btn');
  if (existingBtn) {
    existingBtn.remove();
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

function init(): void {
  disconnectObserver();

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

// Disconnect on GitHub SPA navigation to prevent observer stacking
window.addEventListener('yt-navigate-start', disconnectObserver);
window.addEventListener('beforeunload', disconnectObserver);
