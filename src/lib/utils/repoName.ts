/**
 * Utility functions for extracting repository names from various sources
 */

/**
 * Sanitize a filename by removing invalid characters
 */
export function sanitizeFilename(name: string): string {
  return (
    name
      // eslint-disable-next-line no-control-regex
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-') // Replace invalid chars with dash
      .replace(/\s+/g, '-') // Replace whitespace with dash
      .replace(/-+/g, '-') // Replace multiple dashes with single dash
      .replace(/^-|-$/g, '')
  ); // Remove leading/trailing dashes
}

/**
 * Extract repository name from GitHub URL
 * Examples:
 * - https://github.com/facebook/react -> react
 * - https://github.com/facebook/react/tree/main -> react
 * - https://github.com/facebook/react/tree/main/packages -> react
 */
export function extractGitHubRepoName(url: string): string {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/').filter(Boolean);

    if (parts.length >= 2) {
      // parts[0] is owner, parts[1] is repo name
      const repoName = parts[1];
      return sanitizeFilename(repoName);
    }
  } catch {
    // Invalid URL
  }
  return 'github-repo';
}

/**
 * Extract folder name from local upload
 * For directory: use the first directory name
 * For zip: use the zip filename without extension
 */
export function extractLocalName(files: FileList | File): string {
  if (files instanceof File) {
    // Zip file
    const name = files.name.replace(/\.zip$/i, '');
    return sanitizeFilename(name);
  }

  // Directory upload - find the common root directory
  if (files.length > 0) {
    const firstPath = files[0].webkitRelativePath || files[0].name;
    const rootDir = firstPath.split('/')[0];
    if (rootDir) {
      return sanitizeFilename(rootDir);
    }
  }

  return 'local-files';
}

/**
 * Get a safe default filename with timestamp
 */
export function getDefaultFilename(prefix: string = 'repo'): string {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${sanitizeFilename(prefix)}-${timestamp}`;
}

/**
 * Normalize a GitHub URL to its canonical form for use as cache/recent keys.
 *
 * - Strips trailing slashes
 * - Strips query strings and hash fragments
 * - Strips `.git` suffix from the repo segment
 * - Lowercases the owner (GitHub owners are case-insensitive)
 * - Preserves repo name case (GitHub repos are case-sensitive in practice)
 * - Preserves branch/path segments (e.g. /tree/main/path)
 *
 * @example
 * normalizeGitHubUrl('https://github.com/Facebook/React') // 'https://github.com/facebook/React'
 * normalizeGitHubUrl('https://github.com/owner/repo/') // 'https://github.com/owner/repo'
 * normalizeGitHubUrl('https://github.com/owner/repo?tab=readme') // 'https://github.com/owner/repo'
 * normalizeGitHubUrl('https://github.com/owner/repo.git') // 'https://github.com/owner/repo'
 * normalizeGitHubUrl('https://github.com/owner/repo/tree/main') // 'https://github.com/owner/repo/tree/main'
 */
export function normalizeGitHubUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    // Only normalize github.com URLs
    if (urlObj.hostname.toLowerCase() !== 'github.com') {
      return url;
    }

    // Strip query and hash
    urlObj.search = '';
    urlObj.hash = '';

    // Parse pathname segments
    const parts = urlObj.pathname.split('/').filter(Boolean);

    if (parts.length === 0) {
      return urlObj.origin;
    }

    // Lowercase the owner (first segment)
    if (parts.length >= 1) {
      parts[0] = parts[0].toLowerCase();
    }

    // Strip .git suffix from the repo name (second segment)
    if (parts.length >= 2) {
      parts[1] = parts[1].replace(/\.git$/i, '');
    }

    // Rebuild pathname
    urlObj.pathname = '/' + parts.join('/');

    return urlObj.href;
  } catch {
    // Not a valid URL — return as-is
    return url;
  }
}
