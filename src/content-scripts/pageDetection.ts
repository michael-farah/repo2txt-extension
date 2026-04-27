/**
 * GitHub page type detection utilities
 * Extracted from content script for testability
 */
export type GitHubPageType = 'commit' | 'pull' | 'compare' | 'repo' | null;

const SKIP_PATTERNS = [
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
] as const;

/**
 * Determine the type of GitHub page from a pathname
 * @param pathname - The URL pathname (e.g., /owner/repo/commit/abc123)
 * @returns The page type, or null for non-repo pages
 */
export function getGitHubPageType(pathname: string): GitHubPageType {
  const pathParts = pathname.split('/').filter(Boolean);

  // Minimum: /owner/repo
  if (pathParts.length < 2) {
    return null;
  }

  const pageType = pathParts[2];

  // No third segment - basic repo page
  if (!pageType) {
    return 'repo';
  }

  // Diff page types
  if (pageType === 'commit') return 'commit';
  if (pageType === 'pull') return 'pull';
  if (pageType === 'compare') return 'compare';

  // Repo sub-pages (tree, blob, tags, etc.)
  if (pageType === 'tree' || pageType === 'blob' || pageType === 'tags') {
    return 'repo';
  }

  // Skip non-repo pages
  if (SKIP_PATTERNS.includes(pageType as (typeof SKIP_PATTERNS)[number])) {
    return null;
  }

  // Unknown third segment - treat as repo page (e.g., /owner/repo/some-new-github-feature)
  return 'repo';
}

/**
 * Check if a GitHub pathname represents a diff page (commit, PR, or compare)
 * @param pathname - The URL pathname
 * @returns true if the page shows a diff
 */
export function isDiffPage(pathname: string): boolean {
  const pageType = getGitHubPageType(pathname);
  return pageType === 'commit' || pageType === 'pull' || pageType === 'compare';
}
