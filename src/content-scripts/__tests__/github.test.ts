import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getGitHubPageType } from '../pageDetection';

// Mock chrome APIs before importing the module
const mockSendMessage = vi.fn();
const mockStorageLocalGet = vi.fn();
const mockStorageOnChanged = {
  addListener: vi.fn(),
};

Object.defineProperty(global, 'chrome', {
  value: {
    runtime: {
      sendMessage: mockSendMessage,
    },
    storage: {
      local: {
        get: mockStorageLocalGet,
      },
      onChanged: mockStorageOnChanged,
    },
  },
  writable: true,
  configurable: true,
});

// Mock clipboard
Object.defineProperty(global, 'navigator', {
  value: {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  },
  writable: true,
  configurable: true,
});

// Mock alert
global.alert = vi.fn();

describe('GitHub Content Script', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset document
    document.body.innerHTML = '';
    document.head.innerHTML = '';

    // Reset location
    delete (window as unknown as { location: Location }).location;
    (window as unknown as { location: { href: string; pathname: string } }).location = {
      href: 'https://github.com/owner/repo',
      pathname: '/owner/repo',
    };

    // Reset modules
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('Button injection', () => {
    beforeEach(() => {
      mockStorageLocalGet.mockResolvedValue({});
      mockSendMessage.mockResolvedValue({ success: true });
    });

    it('should inject button on valid repo page', async () => {
      window.location.pathname = '/owner/repo';
      document.body.innerHTML = `
        <div class="file-navigation">
          <button>Code</button>
        </div>
      `;

      // Import and wait for init
      await import('../github');

      // Wait for setTimeout
      await new Promise((resolve) => setTimeout(resolve, 600));

      const button = document.querySelector('.repo2txt-convert-btn');
      expect(button).not.toBeNull();
    });

    it('should not inject button on invalid page', async () => {
      window.location.pathname = '/owner/repo/pull/123';
      document.body.innerHTML = `
        <div class="file-navigation">
          <button>Code</button>
        </div>
      `;

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const button = document.querySelector('.repo2txt-convert-btn');
      expect(button).toBeNull();
    });

    it('should not inject duplicate buttons', async () => {
      window.location.pathname = '/owner/repo';
      document.body.innerHTML = `
        <div class="file-navigation">
          <button class="repo2txt-convert-btn">Already exists</button>
        </div>
      `;

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const buttons = document.querySelectorAll('.repo2txt-convert-btn');
      expect(buttons.length).toBe(1);
    });

    it('should send message when button is clicked', async () => {
      window.location.pathname = '/owner/repo';
      window.location.href = 'https://github.com/owner/repo';
      document.body.innerHTML = `
        <div class="file-navigation">
          <button>Code</button>
        </div>
      `;

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const button = document.querySelector('.repo2txt-convert-btn') as HTMLButtonElement;
      button?.click();

      expect(mockSendMessage).toHaveBeenCalledWith({
        type: 'OPEN_POPUP_WITH_REPO',
        repoUrl: 'https://github.com/owner/repo',
      });
    });

    it('should fallback to clipboard when sendMessage fails', async () => {
      window.location.pathname = '/owner/repo';
      window.location.href = 'https://github.com/owner/repo';
      document.body.innerHTML = `
        <div class="file-navigation">
          <button>Code</button>
        </div>
      `;

      mockSendMessage.mockRejectedValue(new Error('Extension not available'));

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const button = document.querySelector('.repo2txt-convert-btn') as HTMLButtonElement;
      await button?.click();

      // Wait for async clipboard operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://github.com/owner/repo');
      expect(global.alert).toHaveBeenCalled();
    });

    it('should fallback to clipboard when runtime is unavailable', async () => {
      window.location.pathname = '/owner/repo';
      window.location.href = 'https://github.com/owner/repo';
      document.body.innerHTML = `
        <div class="file-navigation">
          <button>Code</button>
        </div>
      `;

      // Remove runtime
      (chrome as unknown as { runtime: unknown }).runtime = undefined as unknown as typeof chrome.runtime;

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const button = document.querySelector('.repo2txt-convert-btn') as HTMLButtonElement;
      await button?.click();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://github.com/owner/repo');
    });

    it('should inject styles into document head', async () => {
      window.location.pathname = '/owner/repo';
      document.body.innerHTML = `
        <div class="file-navigation">
          <button>Code</button>
        </div>
      `;

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const style = document.getElementById('repo2txt-styles');
      expect(style).not.toBeNull();
      expect(style?.tagName).toBe('STYLE');
    });

    it('should create button with correct class and type', async () => {
      window.location.pathname = '/owner/repo';
      document.body.innerHTML = `
        <div class="file-navigation">
          <button>Code</button>
        </div>
      `;

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const button = document.querySelector('.repo2txt-convert-btn') as HTMLButtonElement;
      expect(button).not.toBeNull();
      expect(button?.tagName).toBe('BUTTON');
      expect(button?.type).toBe('button');
    });

    it('should contain SVG icon in button', async () => {
      window.location.pathname = '/owner/repo';
      document.body.innerHTML = `
        <div class="file-navigation">
          <button>Code</button>
        </div>
      `;

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const button = document.querySelector('.repo2txt-convert-btn') as HTMLButtonElement;
      const svg = button?.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute('class')).toBe('repo2txt-icon');
    });

    it('should contain text label in button', async () => {
      window.location.pathname = '/owner/repo';
      document.body.innerHTML = `
        <div class="file-navigation">
          <button>Code</button>
        </div>
      `;

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const button = document.querySelector('.repo2txt-convert-btn') as HTMLButtonElement;
      const span = button?.querySelector('span');
      expect(span?.textContent).toBe('Convert to Text');
    });

    it('should not inject button when showGitHubButton is false', async () => {
      mockStorageLocalGet.mockResolvedValue({
        'repo2txt-content-settings': { showGitHubButton: false },
      });

      window.location.pathname = '/owner/repo';
      document.body.innerHTML = `
        <div class="file-navigation">
          <button>Code</button>
        </div>
      `;

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const button = document.querySelector('.repo2txt-convert-btn');
      expect(button).toBeNull();
    });

    it('should remove existing button when showGitHubButton is false', async () => {
      mockStorageLocalGet.mockResolvedValue({
        'repo2txt-content-settings': { showGitHubButton: false },
      });

      window.location.pathname = '/owner/repo';
      document.body.innerHTML = `
        <div class="file-navigation">
          <button class="repo2txt-convert-btn">Convert to Text</button>
        </div>
      `;

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const button = document.querySelector('.repo2txt-convert-btn');
      expect(button).toBeNull();
    });
  });

  describe('Settings change listener', () => {
    let settingsChangeHandler: ((changes: unknown, areaName: string) => void) | null = null;

    beforeEach(() => {
      mockStorageOnChanged.addListener.mockImplementation((handler) => {
        settingsChangeHandler = handler;
      });
    });

    it('should re-init when content settings change', async () => {
      window.location.pathname = '/owner/repo';
      document.body.innerHTML = '<div class="file-navigation"></div>';
      mockStorageLocalGet.mockResolvedValue({});

      await import('../github');

      const changes = {
        'repo2txt-content-settings': {
          oldValue: { showGitHubButton: true },
          newValue: { showGitHubButton: false },
        },
      };

      if (settingsChangeHandler) {
        settingsChangeHandler(changes, 'local');
      }

      // Should trigger re-init
      expect(mockStorageLocalGet).toHaveBeenCalled();
    });

    it('should ignore non-local area changes', async () => {
      await import('../github');

      const changes = {
        'repo2txt-content-settings': {
          oldValue: { showGitHubButton: true },
          newValue: { showGitHubButton: false },
        },
      };

      if (settingsChangeHandler) {
        settingsChangeHandler(changes, 'sync');
      }

      // Should not trigger re-init
      expect(mockStorageLocalGet).toHaveBeenCalledTimes(1); // Only from initial import
    });
  });

  describe('URL validation', () => {
    beforeEach(() => {
      mockStorageLocalGet.mockResolvedValue({});
    });

    it('should inject button on basic repo page', async () => {
      window.location.pathname = '/owner/repo';
      document.body.innerHTML = `
        <div class="file-navigation">
          <button>Code</button>
        </div>
      `;

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const button = document.querySelector('.repo2txt-convert-btn');
      expect(button).not.toBeNull();
    });

    it('should inject button on repo tree page', async () => {
      window.location.pathname = '/owner/repo/tree/main';
      document.body.innerHTML = `
        <div class="file-navigation">
          <button>Code</button>
        </div>
      `;

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const button = document.querySelector('.repo2txt-convert-btn');
      expect(button).not.toBeNull();
    });

    it('should not inject button on pull requests page', async () => {
      window.location.pathname = '/owner/repo/pull/123';
      document.body.innerHTML = `
        <div class="file-navigation">
          <button>Code</button>
        </div>
      `;

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const button = document.querySelector('.repo2txt-convert-btn');
      expect(button).toBeNull();
    });

    it('should not inject button on issues page', async () => {
      window.location.pathname = '/owner/repo/issues';
      document.body.innerHTML = `
        <div class="file-navigation">
          <button>Code</button>
        </div>
      `;

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const button = document.querySelector('.repo2txt-convert-btn');
      expect(button).toBeNull();
    });

    it('should not inject button on wiki page', async () => {
      window.location.pathname = '/owner/repo/wiki';
      document.body.innerHTML = `
        <div class="file-navigation">
          <button>Code</button>
        </div>
      `;

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const button = document.querySelector('.repo2txt-convert-btn');
      expect(button).toBeNull();
    });

    it('should not inject button on actions page', async () => {
      window.location.pathname = '/owner/repo/actions';
      document.body.innerHTML = `
        <div class="file-navigation">
          <button>Code</button>
        </div>
      `;

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const button = document.querySelector('.repo2txt-convert-btn');
      expect(button).toBeNull();
    });

    it('should not inject button on settings page', async () => {
      window.location.pathname = '/owner/repo/settings';
      document.body.innerHTML = `
        <div class="file-navigation">
          <button>Code</button>
        </div>
      `;

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const button = document.querySelector('.repo2txt-convert-btn');
      expect(button).toBeNull();
    });

    it('should not inject button on stargazers page', async () => {
      window.location.pathname = '/owner/repo/stargazers';
      document.body.innerHTML = `
        <div class="file-navigation">
          <button>Code</button>
        </div>
      `;

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const button = document.querySelector('.repo2txt-convert-btn');
      expect(button).toBeNull();
    });

    it('should not inject button on forks page', async () => {
      window.location.pathname = '/owner/repo/forks';
      document.body.innerHTML = `
        <div class="file-navigation">
          <button>Code</button>
        </div>
      `;

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const button = document.querySelector('.repo2txt-convert-btn');
      expect(button).toBeNull();
    });
  });

  describe('Container detection', () => {
    beforeEach(() => {
      mockStorageLocalGet.mockResolvedValue({});
    });

    it('should find file-navigation container', async () => {
      window.location.pathname = '/owner/repo';
      document.body.innerHTML = `
        <div class="file-navigation">
          <button>Code</button>
        </div>
      `;

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const button = document.querySelector('.repo2txt-convert-btn');
      expect(button).not.toBeNull();
    });

    it('should find repo-actions container', async () => {
      window.location.pathname = '/owner/repo';
      document.body.innerHTML = `
        <div class="repo-actions">
          <button>Star</button>
        </div>
      `;

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const button = document.querySelector('.repo2txt-convert-btn');
      expect(button).not.toBeNull();
    });

    it('should find repository-content flex-auto container', async () => {
      window.location.pathname = '/owner/repo';
      document.body.innerHTML = `
        <div class="repository-content">
          <div class="flex-auto">
            <h1>Repo Name</h1>
          </div>
        </div>
      `;

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const button = document.querySelector('.repo2txt-convert-btn');
      expect(button).not.toBeNull();
    });

    it('should not inject button when no container found', async () => {
      window.location.pathname = '/owner/repo';
      document.body.innerHTML = '<div>Some other content</div>';

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const button = document.querySelector('.repo2txt-convert-btn');
      expect(button).toBeNull();
    });
  });

  describe('Button styles', () => {
    beforeEach(() => {
      mockStorageLocalGet.mockResolvedValue({});
    });

    it('should inject styles into document head', async () => {
      window.location.pathname = '/owner/repo';
      document.body.innerHTML = `
        <div class="file-navigation">
          <button>Code</button>
        </div>
      `;

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const style = document.getElementById('repo2txt-styles');
      expect(style).not.toBeNull();
      expect(style?.tagName).toBe('STYLE');
    });

    it('should not inject styles twice', async () => {
      window.location.pathname = '/owner/repo';
      document.body.innerHTML = `
        <div class="file-navigation">
          <button>Code</button>
        </div>
      `;

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Import again
      vi.resetModules();
      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const styles = document.querySelectorAll('#repo2txt-styles');
      expect(styles.length).toBe(1);
    });

    it('should include button styles', async () => {
      window.location.pathname = '/owner/repo';
      document.body.innerHTML = `
        <div class="file-navigation">
          <button>Code</button>
        </div>
      `;

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const style = document.getElementById('repo2txt-styles');
      expect(style?.textContent).toContain('.repo2txt-convert-btn');
    });

    it('should include dark mode styles', async () => {
      window.location.pathname = '/owner/repo';
      document.body.innerHTML = `
        <div class="file-navigation">
          <button>Code</button>
        </div>
      `;

      await import('../github');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const style = document.getElementById('repo2txt-styles');
      expect(style?.textContent).toContain('prefers-color-scheme: dark');
      expect(style?.textContent).toContain('[data-color-mode="dark"]');
    });
  });
});

  describe('pageDetection module', () => {
  it('should detect commit pages', () => {
    expect(getGitHubPageType('/owner/repo/commit/abc123def456')).toBe('commit');
  });

  it('should detect pull request pages', () => {
    expect(getGitHubPageType('/owner/repo/pull/123')).toBe('pull');
  });

  it('should detect compare pages', () => {
    expect(getGitHubPageType('/owner/repo/compare/main...dev')).toBe('compare');
  });

  it('should detect repo pages', () => {
    expect(getGitHubPageType('/owner/repo')).toBe('repo');
    expect(getGitHubPageType('/owner/repo/tree/main')).toBe('repo');
  });

  it('should return null for non-repo pages', () => {
    expect(getGitHubPageType('/')).toBeNull();
    expect(getGitHubPageType('/owner/repo/issues')).toBeNull();
    expect(getGitHubPageType('/owner/repo/settings')).toBeNull();
  });
});
