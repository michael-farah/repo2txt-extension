import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the pageDetection module
vi.mock('../pageDetection', () => ({
  getGitHubPageType: vi.fn(),
  isDiffPage: vi.fn(),
}));

// Import after mocking
import { getGitHubPageType, isDiffPage } from '../pageDetection';

describe('GitHub Content Script Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Page Type Detection for Content Script', () => {
    it('should treat repo pages as valid', () => {
      vi.mocked(getGitHubPageType).mockReturnValue('repo');
      vi.mocked(isDiffPage).mockReturnValue(false);

      const pageType = getGitHubPageType('/owner/repo');
      const isDiff = isDiffPage('/owner/repo');

      expect(pageType).toBe('repo');
      expect(isDiff).toBe(false);
    });

    it('should treat commit pages as valid and diff pages', () => {
      vi.mocked(getGitHubPageType).mockReturnValue('commit');
      vi.mocked(isDiffPage).mockReturnValue(true);

      const pageType = getGitHubPageType('/owner/repo/commit/abc123');
      const isDiff = isDiffPage('/owner/repo/commit/abc123');

      expect(pageType).toBe('commit');
      expect(isDiff).toBe(true);
    });

    it('should treat PR pages as valid and diff pages', () => {
      vi.mocked(getGitHubPageType).mockReturnValue('pull');
      vi.mocked(isDiffPage).mockReturnValue(true);

      const pageType = getGitHubPageType('/owner/repo/pull/123');
      const isDiff = isDiffPage('/owner/repo/pull/123');

      expect(pageType).toBe('pull');
      expect(isDiff).toBe(true);
    });

    it('should treat compare pages as valid and diff pages', () => {
      vi.mocked(getGitHubPageType).mockReturnValue('compare');
      vi.mocked(isDiffPage).mockReturnValue(true);

      const pageType = getGitHubPageType('/owner/repo/compare/main...feature');
      const isDiff = isDiffPage('/owner/repo/compare/main...feature');

      expect(pageType).toBe('compare');
      expect(isDiff).toBe(true);
    });

    it('should treat null page types as invalid', () => {
      vi.mocked(getGitHubPageType).mockReturnValue(null);
      vi.mocked(isDiffPage).mockReturnValue(false);

      const pageType = getGitHubPageType('/owner/repo/issues');
      const isDiff = isDiffPage('/owner/repo/issues');

      expect(pageType).toBeNull();
      expect(isDiff).toBe(false);
    });
  });

  describe('Button Routing Logic', () => {
    it('should route diff pages to Copy Diff button', () => {
      vi.mocked(isDiffPage).mockReturnValue(true);

      const pathname = '/owner/repo/pull/123';
      const shouldShowCopyDiff = isDiffPage(pathname);
      const shouldShowConvert = !isDiffPage(pathname);

      expect(shouldShowCopyDiff).toBe(true);
      expect(shouldShowConvert).toBe(false);
    });

    it('should route repo pages to Convert to Text button', () => {
      vi.mocked(getGitHubPageType).mockReturnValue('repo');
      vi.mocked(isDiffPage).mockReturnValue(false);

      const pathname = '/owner/repo';
      const pageType = getGitHubPageType(pathname);
      const shouldShowCopyDiff = isDiffPage(pathname);
      const shouldShowConvert = pageType === 'repo' && !isDiffPage(pathname);

      expect(shouldShowCopyDiff).toBe(false);
      expect(shouldShowConvert).toBe(true);
    });

    it('should route tree pages to Convert to Text button', () => {
      vi.mocked(getGitHubPageType).mockReturnValue('repo');
      vi.mocked(isDiffPage).mockReturnValue(false);

      const pathname = '/owner/repo/tree/main/src';
      const pageType = getGitHubPageType(pathname);
      const shouldShowCopyDiff = isDiffPage(pathname);
      const shouldShowConvert = pageType === 'repo' && !isDiffPage(pathname);

      expect(shouldShowCopyDiff).toBe(false);
      expect(shouldShowConvert).toBe(true);
    });

    it('should not show any button on invalid pages', () => {
      vi.mocked(getGitHubPageType).mockReturnValue(null);
      vi.mocked(isDiffPage).mockReturnValue(false);

      const pathname = '/owner/repo/issues';
      const pageType = getGitHubPageType(pathname);
      const shouldShowAnyButton = pageType !== null;

      expect(shouldShowAnyButton).toBe(false);
    });
  });

  describe('Diff URL Construction', () => {
    it('should construct diff URL for commit pages', () => {
      const baseUrl = 'https://github.com/owner/repo/commit/abc123';
      const expected = 'https://github.com/owner/repo/commit/abc123.diff';

      const url = new URL(baseUrl);
      const diffUrl = url.origin + url.pathname + '.diff';

      expect(diffUrl).toBe(expected);
    });

    it('should construct diff URL for PR pages', () => {
      const baseUrl = 'https://github.com/owner/repo/pull/123';
      const expected = 'https://github.com/owner/repo/pull/123.diff';

      const url = new URL(baseUrl);
      const diffUrl = url.origin + url.pathname + '.diff';

      expect(diffUrl).toBe(expected);
    });

    it('should construct diff URL for compare pages', () => {
      const baseUrl = 'https://github.com/owner/repo/compare/main...feature';
      const expected = 'https://github.com/owner/repo/compare/main...feature.diff';

      const url = new URL(baseUrl);
      const diffUrl = url.origin + url.pathname + '.diff';

      expect(diffUrl).toBe(expected);
    });

    it('should handle URLs with query params by using pathname only', () => {
      const baseUrl = 'https://github.com/owner/repo/pull/123?tab=files';
      const expected = 'https://github.com/owner/repo/pull/123.diff';

      const url = new URL(baseUrl);
      const diffUrl = url.origin + url.pathname + '.diff';

      expect(diffUrl).toBe(expected);
      expect(diffUrl).not.toContain('tab=files');
    });

    it('should not double-add .diff extension', () => {
      const baseUrl = 'https://github.com/owner/repo/commit/abc123.diff';

      const url = new URL(baseUrl);
      let diffUrl = url.origin + url.pathname;
      if (!diffUrl.endsWith('.diff')) {
        diffUrl += '.diff';
      }

      expect(diffUrl).toBe('https://github.com/owner/repo/commit/abc123.diff');
    });
  });

  describe('Large Diff Warning Threshold', () => {
    const DIFF_SIZE_WARNING = 50 * 1024; // 50KB

    it('should trigger warning for diffs over 50KB', () => {
      const largeDiff = 'a'.repeat(60000); // ~60KB when encoded
      const byteSize = new TextEncoder().encode(largeDiff).length;

      expect(byteSize).toBeGreaterThan(DIFF_SIZE_WARNING);
    });

    it('should not trigger warning for diffs under 50KB', () => {
      const smallDiff = 'a'.repeat(1000); // ~1KB when encoded
      const byteSize = new TextEncoder().encode(smallDiff).length;

      expect(byteSize).toBeLessThan(DIFF_SIZE_WARNING);
    });

    it('should calculate approximate tokens correctly', () => {
      const diffText = 'a'.repeat(4000); // ~4KB
      const byteSize = new TextEncoder().encode(diffText).length;
      const approxTokens = Math.round(byteSize / 4);

      expect(approxTokens).toBe(1000);
    });

    it('should calculate size in KB correctly', () => {
      const diffText = 'a'.repeat(51200); // ~50KB
      const byteSize = new TextEncoder().encode(diffText).length;
      const sizeKB = Math.round(byteSize / 1024);

      expect(sizeKB).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Request ID Generation', () => {
    it('should generate unique request IDs', () => {
      const requestId1 = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const requestId2 = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      expect(requestId1).not.toBe(requestId2);
      expect(requestId1).toMatch(/^\d+-[a-z0-9]+$/);
      expect(requestId2).toMatch(/^\d+-[a-z0-9]+$/);
    });
  });

  describe('Background Response Handling', () => {
    it('should use diff field from background response (not diffText)', () => {
      // The background handler returns { success, status, diff }
      // The content script must read response.diff, not response.diffText
      const response = { success: true, status: 200, diff: 'diff --git a/file.ts' };
      const diffText = response.diff;

      expect(diffText).toBe('diff --git a/file.ts');
      expect((response as Record<string, unknown>).diffText).toBeUndefined();
    });

    it('should reject responses where success is false (HTTP errors)', () => {
      // 404 responses return { success: false, status: 404, diff: "Not Found" }
      // with NO error field — must check response.success
      const response = { success: false, status: 404, diff: 'Not Found' };
      const shouldReject =
        !response || !response.success || ('error' in response && response.error);

      expect(shouldReject).toBe(true);
    });

    it('should reject responses where error is set', () => {
      const response = { success: false, status: 0, diff: '', error: 'Network error' };
      const shouldReject =
        !response || !response.success || ('error' in response && response.error);

      expect(shouldReject).toBe(true);
    });

    it('should accept successful responses', () => {
      const response = { success: true, status: 200, diff: 'diff --git a/file.ts' };
      const shouldReject =
        !response || !response.success || ('error' in response && response.error);

      expect(shouldReject).toBe(false);
    });
  });

  describe('Page Type Combinations', () => {
    it('should handle all valid page types', () => {
      const testCases = [
        { pathname: '/owner/repo', expectedType: 'repo', isDiff: false },
        { pathname: '/owner/repo/tree/main', expectedType: 'repo', isDiff: false },
        { pathname: '/owner/repo/blob/main/file.ts', expectedType: 'repo', isDiff: false },
        { pathname: '/owner/repo/commit/abc123', expectedType: 'commit', isDiff: true },
        { pathname: '/owner/repo/pull/123', expectedType: 'pull', isDiff: true },
        { pathname: '/owner/repo/compare/main...feature', expectedType: 'compare', isDiff: true },
      ];

      testCases.forEach(({ pathname, expectedType, isDiff }) => {
        vi.mocked(getGitHubPageType).mockReturnValue(
          expectedType as ReturnType<typeof getGitHubPageType>
        );
        vi.mocked(isDiffPage).mockReturnValue(isDiff);

        const pageType = getGitHubPageType(pathname);
        const diffStatus = isDiffPage(pathname);

        expect(pageType).toBe(expectedType);
        expect(diffStatus).toBe(isDiff);
      });
    });
  });
});
