import { describe, it, expect } from 'vitest';
import { getGitHubPageType, isDiffPage } from '../pageDetection';

describe('getGitHubPageType', () => {
  describe('commit pages', () => {
    it('should detect commit page with short SHA', () => {
      expect(getGitHubPageType('/owner/repo/commit/abc1234')).toBe('commit');
    });
    it('should detect commit page with full SHA', () => {
      expect(
        getGitHubPageType(
          '/vercel-labs/agent-browser/commit/32870e552d0121787f11224a789a0e84d58b51ff'
        )
      ).toBe('commit');
    });
  });

  describe('pull request pages', () => {
    it('should detect PR page', () => {
      expect(getGitHubPageType('/owner/repo/pull/123')).toBe('pull');
    });
    it('should detect PR page with files tab', () => {
      expect(getGitHubPageType('/owner/repo/pull/123/files')).toBe('pull');
    });
    it('should detect PR page with commits tab', () => {
      expect(getGitHubPageType('/owner/repo/pull/123/commits')).toBe('pull');
    });
  });

  describe('compare pages', () => {
    it('should detect compare page', () => {
      expect(getGitHubPageType('/owner/repo/compare/main...feature')).toBe('compare');
    });
    it('should detect compare page with complex branch names', () => {
      expect(getGitHubPageType('/owner/repo/compare/main...feature/auth-login')).toBe('compare');
    });
  });

  describe('repo pages', () => {
    it('should detect basic repo page', () => {
      expect(getGitHubPageType('/owner/repo')).toBe('repo');
    });
    it('should detect repo page with trailing slash', () => {
      expect(getGitHubPageType('/owner/repo/')).toBe('repo');
    });
    it('should detect tree (directory) page', () => {
      expect(getGitHubPageType('/owner/repo/tree/main/src')).toBe('repo');
    });
    it('should detect blob (file) page', () => {
      expect(getGitHubPageType('/owner/repo/blob/main/README.md')).toBe('repo');
    });
  });

  describe('non-repo pages', () => {
    it('should return null for GitHub home', () => {
      expect(getGitHubPageType('/')).toBeNull();
    });
    it('should return null for single-segment paths', () => {
      expect(getGitHubPageType('/michael-farah')).toBeNull();
    });
    it('should return null for settings page', () => {
      expect(getGitHubPageType('/owner/repo/settings')).toBeNull();
    });
    it('should return null for issues page', () => {
      expect(getGitHubPageType('/owner/repo/issues')).toBeNull();
    });
    it('should return null for actions page', () => {
      expect(getGitHubPageType('/owner/repo/actions')).toBeNull();
    });
    it('should return null for wiki page', () => {
      expect(getGitHubPageType('/owner/repo/wiki')).toBeNull();
    });
    it('should return null for security page', () => {
      expect(getGitHubPageType('/owner/repo/security')).toBeNull();
    });
    it('should return null for releases page', () => {
      expect(getGitHubPageType('/owner/repo/releases')).toBeNull();
    });
  });
});

describe('isDiffPage', () => {
  it('should return true for commit pages', () => {
    expect(isDiffPage('/owner/repo/commit/abc123')).toBe(true);
  });
  it('should return true for PR pages', () => {
    expect(isDiffPage('/owner/repo/pull/123')).toBe(true);
  });
  it('should return true for compare pages', () => {
    expect(isDiffPage('/owner/repo/compare/main...feature')).toBe(true);
  });
  it('should return false for repo pages', () => {
    expect(isDiffPage('/owner/repo')).toBe(false);
  });
  it('should return false for tree pages', () => {
    expect(isDiffPage('/owner/repo/tree/main')).toBe(false);
  });
  it('should return false for null page types', () => {
    expect(isDiffPage('/owner/repo/issues')).toBe(false);
  });
});
