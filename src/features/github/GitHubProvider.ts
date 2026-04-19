/**
 * GitHub provider implementation
 * Supports public and private repositories with personal access tokens
 * Also supports session mode for authenticated GitHub API calls using browser session cookies
 */

import { BaseProvider } from '@/lib/providers/BaseProvider';
import { ProviderError, ErrorCode } from '@/lib/providers/types';
import type { ParsedRepoInfo } from '@/lib/providers/types';
import type { ProviderType, FileNode, FetchOptions, FileContent } from '@/types';
import { useStore } from '@/store';

interface GitHubReferences {
  branches: string[];
  tags: string[];
}

export class GitHubProvider extends BaseProvider {
  private static readonly API_BASE = 'https://api.github.com';
  private static readonly WEB_BASE = 'https://github.com';
  private static readonly URL_PATTERN =
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/(.+))?$/;

  /** Whether to use browser session cookies for authentication */
  private sessionMode: boolean = false;

  /** Cached default branch for session mode */
  private sessionDefaultBranch: string | null = null;

  /**
   * Enable or disable session mode for authenticated GitHub access
   * When enabled, requests use github.com web endpoints with browser session cookies
   */
  setSessionMode(enabled: boolean): void {
    this.sessionMode = enabled;
    this.sessionDefaultBranch = null;
  }

  /**
   * Fetch a URL using the background script's session-authenticated fetch
   * This sends GITHUB_WEB_FETCH messages that use github.com web endpoints
   */
  /**
 * Fetch a URL using the background script's session-authenticated fetch
 * This sends GITHUB_WEB_FETCH messages that use github.com web endpoints
 */
private async sessionFetch(url: string, signal?: AbortSignal): Promise<string> {
  let response: { success: boolean; status: number; html: string; error?: string } | undefined;

  // Check if aborted before starting
  if (signal?.aborted) {
    throw new Error('AbortError');
  }

  try {
    response = await chrome.runtime.sendMessage({
      type: 'GITHUB_WEB_FETCH',
      url,
      requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });
  } catch {
    throw new ProviderError(
      'Extension context unavailable',
      ErrorCode.PROVIDER_ERROR,
      'Could not communicate with the extension background script. Please reload the extension popup and try again.'
    );
  }

  if (!response) {
    throw new ProviderError(
      'Extension context unavailable',
      ErrorCode.PROVIDER_ERROR,
      'Could not communicate with the extension background script. Please reload the extension popup and try again.'
    );
  }

  // Check if aborted after the call
  if (signal?.aborted) {
    throw new Error('AbortError');
  }

  // Add diagnostic logging for successful responses
  if (response.success) {
    console.debug(`[repo2txt] sessionFetch: ${url} → ${response.status} (${response.html.length} bytes)`);
  }

  if (!response.success) {
    if (response.status === 429) {
      throw new ProviderError(
        'GitHub rate limit reached',
        ErrorCode.RATE_LIMITED,
        'GitHub rate limit reached while using session mode. Large repositories may require a Personal Access Token. Please wait a moment and try again.'
      );
    }

    if (response.status === 401) {
      throw new ProviderError(
        'GitHub authentication required',
        ErrorCode.AUTH_REQUIRED,
        'You need to be logged into GitHub in your browser to access this repository. Please log into GitHub and try again, or add a Personal Access Token.'
      );
    }

    if (response.status === 403) {
      throw new ProviderError(
        'GitHub access denied',
        ErrorCode.AUTH_REQUIRED,
        'Access to this repository was denied. Make sure you are logged into GitHub in your browser and have access to this repository, or add a Personal Access Token with repo scope.'
      );
    }

    if (response.status === 404) {
      throw new ProviderError(
        'Repository not found',
        ErrorCode.NOT_FOUND,
        "Repository not found. It may be private and you don't have access, or the URL may be incorrect. Make sure you are logged into GitHub in your browser, or add a Personal Access Token."
      );
    }

    throw new Error(`HTTP ${response.status}: ${response.error || 'Session fetch failed'}`);
  }

  return response.html;
}

  /**
   * Parse a GitHub repo/directory page to extract file listing and default branch
   * Uses embedded JSON data when available (more reliable), falls back to DOM parsing
   */
  private parseRepoPage(html: string): {
    files: Array<{ name: string; type: 'file' | 'directory'; path: string }>;
    defaultBranch: string;
    currentBranch?: string;
  } {
    const files: Array<{ name: string; type: 'file' | 'directory'; path: string }> = [];
    let defaultBranch = 'main';

    // Try to extract embedded JSON data first (more reliable)
    // GitHub injects MULTIPLE script tags with embeddedData - we need to check all of them
    // The first one is rarely the file tree, so we iterate until we find files
    const embeddedDataRegex =
      /data-target="react-partial\.embeddedData"\s*>\s*(.*?)\s*<\/script>/gs;
    let match;

    // Helper function to extract files from JSON payload
    const extractFiles = (obj: unknown): void => {
      if (!obj || typeof obj !== 'object') return;

      const record = obj as Record<string, unknown>;

      // Look for items array in tree data
      if (Array.isArray(record.items)) {
        for (const item of record.items) {
          if (item && typeof item === 'object' && 'name' in item && 'path' in item) {
            const itemObj = item as Record<string, unknown>;
            files.push({
              name: String(itemObj.name),
              type: itemObj.contentType === 'directory' ? 'directory' : 'file',
              path: String(itemObj.path),
            });
          }
        }
      }

      // Look for entries array
      if (Array.isArray(record.entries)) {
        for (const entry of record.entries) {
          if (entry && typeof entry === 'object' && 'name' in entry && 'path' in entry) {
            const entryObj = entry as Record<string, unknown>;
            files.push({
              name: String(entryObj.name),
              type: entryObj.type === 'tree' ? 'directory' : 'file',
              path: String(entryObj.path),
            });
          }
        }
      }

      // Recursively search nested objects
      for (const value of Object.values(record)) {
        if (typeof value === 'object' && value !== null) {
          extractFiles(value);
        }
      }
    };

    // Helper function to extract default branch from JSON payload
    const extractBranch = (obj: unknown): string | null => {
      if (!obj || typeof obj !== 'object') return null;
      const record = obj as Record<string, unknown>;

      if (typeof record.defaultBranch === 'string') return record.defaultBranch;
      if (typeof record.default_branch === 'string') return record.default_branch;
      // Removed fallback to default_branch to avoid returning the wrong branch

      for (const value of Object.values(record)) {
        if (typeof value === 'object' && value !== null) {
          const found = extractBranch(value);
          if (found) return found;
        }
      }
      return null;
    };

    // Helper function to extract the current branch (the branch being viewed)
    // from JSON payload. This is important for resolving branch names with slashes.
    const extractCurrentBranch = (obj: unknown): string | null => {
      if (!obj || typeof obj !== 'object') return null;
      const record = obj as Record<string, unknown>;

      // GitHub React payloads use various keys for the current branch
      if (typeof record.refName === 'string') return record.refName;
      if (typeof record.branch === 'string') return record.branch;
      if (typeof record.currentBranch === 'string') return record.currentBranch;
      if (record.repo && typeof record.repo === 'object') {
        const repo = record.repo as Record<string, unknown>;
        if (typeof repo.default_branch === 'string') return repo.default_branch;
      }

      for (const value of Object.values(record)) {
        if (typeof value === 'object' && value !== null) {
          const found = extractCurrentBranch(value);
          if (found) return found;
        }
      }
      return null;
    };

    let currentBranch: string | undefined;

    // Iterate through all embeddedData script tags until we find one with files
    while ((match = embeddedDataRegex.exec(html)) !== null) {
      try {
        const jsonData = JSON.parse(match[1]);
        extractFiles(jsonData);

        // Try to extract default branch from this payload
        const foundBranch = extractBranch(jsonData);
        if (foundBranch) defaultBranch = foundBranch;

        // Try to extract current branch from this payload
        const foundCurrentBranch = extractCurrentBranch(jsonData);
        if (foundCurrentBranch) currentBranch = foundCurrentBranch;

        // If we found files, we can stop looking
        if (files.length > 0) break;
      } catch {
        // JSON parsing failed for this script tag, try the next one
        continue;
      }
    }

    // Fallback: DOM parsing for file list
    if (files.length === 0) {
      // Match file/directory rows
      // Files: href="/owner/repo/blob/branch/path"
      // Directories: href="/owner/repo/tree/branch/path"
      const rowRegex =
        /<div[^>]*role="rowheader"[^>]*>[\s\S]*?<a[^>]*href="\/[^/]+\/[^/]+\/(blob|tree)\/([^/]+)\/([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<\/div>/g;

      let match;
      while ((match = rowRegex.exec(html)) !== null) {
        const [, linkType, , path, name] = match;
        files.push({
          name: name.trim(),
          type: linkType === 'tree' ? 'directory' : 'file',
          path: path.trim(),
        });
      }

      // Alternative: simpler link matching
      if (files.length === 0) {
        const linkRegex =
          /<a[^>]*href="\/[^/]+\/[^/]+\/(blob|tree)\/([^/]+)\/([^"]+)"[^>]*>([^<]+)<\/a>/g;
        while ((match = linkRegex.exec(html)) !== null) {
          const [, linkType, , path, name] = match;
          // Skip navigation links (usually have specific classes)
          if (!path.includes('?') && !name.includes('<')) {
            files.push({
              name: name.trim(),
              type: linkType === 'tree' ? 'directory' : 'file',
              path: path.trim(),
            });
 }
 }
 }

 // Log when DOM fallback is used
 if (files.length === 0) {
 console.warn('[repo2txt] parseRepoPage: embeddedData parsing found 0 files, trying DOM fallback');
 }
 }

    // Extract default branch from branch selector button if not found
    if (defaultBranch === 'main') {
      const branchMatch = html.match(/<button[^>]*data-hotkey="w"[^>]*>([^<]+)<\/button>/);
      if (branchMatch) {
        defaultBranch = branchMatch[1].trim();
      } else {
        // Try alternative: branch in title or header
        const titleMatch = html.match(
          /<span[^>]*class="[^"]*branch-name[^"]*"[^>]*>([^<]+)<\/span>/
        );
        if (titleMatch) {
          defaultBranch = titleMatch[1].trim();
        }
      }
    }

    console.debug(`[repo2txt] parseRepoPage: found ${files.length} files, defaultBranch=${defaultBranch}, currentBranch=${currentBranch ?? 'none'}`);

    return { files, defaultBranch, currentBranch };
  }

  /**
   * Parse a directory page to extract file/directory listing
   */
  private parseDirectoryPage(
    html: string
  ): Array<{ name: string; type: 'file' | 'directory'; path: string }> {
    const { files } = this.parseRepoPage(html);
    return files;
  }

  /**
   * Fetch file tree using session mode (github.com web endpoints)
   * Recursively fetches directories with concurrency control
   */
  /**
 * Fetch file tree using session mode (github.com web endpoints)
 * Recursively fetches directories with concurrency control
 */
private async fetchTreeSession(
  owner: string,
  repo: string,
  branch: string,
  basePath: string,
  signal?: AbortSignal
): Promise<FileNode[]> {
  const allNodes: FileNode[] = [];
  const queue: Array<{ path: string; depth: number }> = [{ path: basePath, depth: 0 }];
  const MAX_CONCURRENT = 3;

  const processQueueItem = async (item: { path: string; depth: number }): Promise<FileNode[]> => {
    // Check if aborted before processing
    if (signal?.aborted) {
      throw new Error('AbortError');
    }

    const pathSegment = item.path ? `/${item.path}` : '';
    const url = `${GitHubProvider.WEB_BASE}/${owner}/${repo}/tree/${branch}${pathSegment}`;

    const html = await this.sessionFetch(url, signal);
    const files = this.parseDirectoryPage(html);

    if (files.length === 0) {
      throw new ProviderError(
        'Could not parse GitHub page',
        ErrorCode.PROVIDER_ERROR,
        "Could not parse GitHub page. This may happen if you're not logged into GitHub, or GitHub's page structure has changed. Please try using a Personal Access Token, or check for extension updates."
      );
    }

    const nodes: FileNode[] = [];
    const subdirs: Array<{ path: string; depth: number }> = [];

    for (const file of files) {
      // Check if aborted between files
      if (signal?.aborted) {
        throw new Error('AbortError');
      }

      const fullPath = item.path ? `${item.path}/${file.name}` : file.name;
      const isDirectory = file.type === 'directory';

      nodes.push({
        path: fullPath,
        type: isDirectory ? 'tree' : 'blob',
        url: `${GitHubProvider.WEB_BASE}/${owner}/${repo}/${isDirectory ? 'tree' : 'blob'}/${branch}/${fullPath}`,
        urlType: 'web',
        // SHA not available from web scraping
      });

      if (isDirectory) {
        subdirs.push({ path: fullPath, depth: item.depth + 1 });
      }
    }

    // Add subdirectories to queue
    queue.push(...subdirs);

    return nodes;
  };

  // Process with concurrency control
  while (queue.length > 0) {
    // Check if aborted between batches
    if (signal?.aborted) {
      throw new Error('AbortError');
    }

    const batch = queue.splice(0, MAX_CONCURRENT);
    const results = await Promise.all(batch.map(processQueueItem));

    for (const nodes of results) {
      allNodes.push(...nodes);
    }

    // Small delay between batches to avoid rate limiting
    if (queue.length > 0) {
      await this.delay(100);
    }
  }

  return allNodes;
}

/**
 * Fetch file content using session mode (github.com raw URLs)
 */
  private async fetchFileSession(node: FileNode, signal?: AbortSignal): Promise<FileContent> {
  let rawUrl: string;

  if (node.urlType === 'web' && node.url?.includes('/blob/')) {
    // Session-mode node: convert blob URL to raw URL
    rawUrl = node.url.replace('/blob/', '/raw/');
  } else if (this.repoInfo?.owner) {
    // PAT-mode node falling back to session: construct web URL from repo metadata
    const branch = this.repoInfo.branch || 'HEAD';
    rawUrl = `${GitHubProvider.WEB_BASE}/${this.repoInfo.owner}/${this.repoInfo.repo}/raw/${branch}/${node.path}`;
  } else {
    throw new ProviderError(
      'Cannot construct session URL for file',
      ErrorCode.INVALID_URL,
      'Cannot fetch file: missing URL or repo metadata'
    );
  }

  const text = await this.sessionFetch(rawUrl, signal);

  return {
    path: node.path,
    text,
    url: rawUrl,
    lineCount: text.split('\n').length,
  };
}

  /**
   * Resolve branch and path for session mode by fetching the repo page
   */
  private async resolveSessionRefAndPath(
    owner: string,
    repo: string,
    urlBranch: string | undefined
  ): Promise<{ branch: string; path: string }> {
    if (!urlBranch && this.sessionDefaultBranch) {
      return { branch: this.sessionDefaultBranch, path: '' };
    }

    const repoUrl = urlBranch
      ? `${GitHubProvider.WEB_BASE}/${owner}/${repo}/tree/${urlBranch}`
      : `${GitHubProvider.WEB_BASE}/${owner}/${repo}`;
    const html = await this.sessionFetch(repoUrl);
    const { defaultBranch, currentBranch } = this.parseRepoPage(html);

    this.sessionDefaultBranch = defaultBranch;

    if (!urlBranch) {
      return { branch: defaultBranch, path: '' };
    }

    // If the page reports the current branch, use it directly.
    // This correctly handles branch names with slashes like "feature/auth/login"
    if (currentBranch) {
      const pathPrefix = currentBranch + '/';
      if (urlBranch === currentBranch) {
        return { branch: currentBranch, path: '' };
      }
      if (urlBranch.startsWith(pathPrefix)) {
        return { branch: currentBranch, path: urlBranch.slice(currentBranch.length + 1) };
      }
    }

    // Fallback: match against known defaultBranch
    if (urlBranch === defaultBranch || urlBranch.startsWith(defaultBranch + '/')) {
      return {
        branch: defaultBranch,
        path: urlBranch === defaultBranch ? '' : urlBranch.slice(defaultBranch.length + 1),
      };
    }

    // Last resort: assume first segment is the branch name
    const parts = urlBranch.split('/');
    return {
      branch: parts[0],
      path: parts.slice(1).join('/'),
    };
  }

  getType(): ProviderType {
    return 'github';
  }

  getName(): string {
    return 'GitHub';
  }

  /**
   * GitHub doesn't require auth for public repos
   */
  requiresAuth(): boolean {
    return false;
  }

  /**
   * Validate GitHub URL format
   */
  validateUrl(url: string): boolean {
    const normalized = url.replace(/\/$/, ''); // Remove trailing slash
    return GitHubProvider.URL_PATTERN.test(normalized);
  }

  /**
   * Parse GitHub URL to extract repository information
   */
  parseUrl(url: string): ParsedRepoInfo {
    const normalized = url.replace(/\/$/, '');
    const match = normalized.match(GitHubProvider.URL_PATTERN);

    if (!match) {
      return {
        url,
        isValid: false,
        error: 'Invalid GitHub URL format. Expected: https://github.com/owner/repo',
      };
    }

    const [, owner, repo, lastString] = match;

    return {
      owner,
      repo,
      // Store the full lastString - will be resolved later with actual branch list
      // This supports branch names with slashes like "feature/test/branch-name"
      branch: lastString,
      path: undefined, // Will be resolved in resolveRefAndPath
      url,
      isValid: true,
    };
  }

  async fetchTree(url: string, options?: FetchOptions): Promise<FileNode[]> {
  const parsed = this.parseUrl(url);

  if (!parsed.isValid) {
    throw new ProviderError(
      parsed.error || 'Invalid URL',
      ErrorCode.INVALID_URL,
      parsed.error || 'Please provide a valid GitHub repository URL'
    );
  }

  const { owner, repo } = parsed;
  if (!owner || !repo) {
    throw new ProviderError(
      'Missing owner or repo',
      ErrorCode.INVALID_URL,
      'Could not extract repository information from URL'
    );
  }

  // Store repo metadata
  this.repoInfo = {
    type: 'github',
    name: repo,
    owner,
    branch: options?.branch || parsed.branch,
    path: options?.path || parsed.path,
    url,
  };

  const cacheKey = `${url}${options?.branch ? `#${options.branch}` : ''}`;
  const { getCachedRepo, setCachedRepo } = useStore.getState();
  const cached = getCachedRepo(cacheKey);

  if (cached) {
    return cached.data;
  }

  try {
    // Session mode: use github.com web endpoints
    if (this.sessionMode) {
      const resolved = await this.resolveSessionRefAndPath(owner, repo, parsed.branch, options?.signal);
      const branch = options?.branch || resolved.branch;
      const path = options?.path || resolved.path;

      this.repoInfo.branch = branch;
      this.repoInfo.path = path;

      const tree = await this.fetchTreeSession(owner, repo, branch, path, options?.signal);
      setCachedRepo(cacheKey, tree, []);
      return tree;
    }

    // PAT mode: use api.github.com endpoints
    let ref = options?.branch || parsed.branch || '';
    let path = options?.path || parsed.path || '';

    if (parsed.branch) {
      const references = await this.fetchReferences(owner, repo, options?.signal);
      const resolved = this.resolveRefAndPath(parsed.branch, references);
      ref = resolved.ref;
      path = resolved.path;
    }

    try {
      const sha = await this.fetchTreeSha(owner, repo, ref, path, options?.signal);
      const tree = await this.fetchTreeRecursive(owner, repo, sha, options?.signal);
      setCachedRepo(cacheKey, tree, []);
      return tree;
    } catch (error) {
      // Re-throw AbortError without fallback
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      // PAT got 404/403: fall back to session mode
      if (this.credentials?.token && this.is404or403Error(error)) {
        this.sessionMode = true;
        const resolved = await this.resolveSessionRefAndPath(owner, repo, parsed.branch, options?.signal);
        const branch = options?.branch || resolved.branch;
        const path = options?.path || resolved.path;

        this.repoInfo.branch = branch;
        this.repoInfo.path = path;

        const tree = await this.fetchTreeSession(owner, repo, branch, path, options?.signal);
        setCachedRepo(cacheKey, tree, []);
        return tree;
      }
      throw error;
    }
  } catch (error) {
    // Re-throw AbortError without wrapping
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    throw this.handleFetchError(error, `${owner}/${repo}`);
  }
}

  /**
   * Fetch references (branches and tags)
   */
  private async fetchReferences(owner: string, repo: string, signal?: AbortSignal): Promise<GitHubReferences> {
    const headers = this.buildGitHubHeaders();

    const [branchesResponse, tagsResponse] = await Promise.all([
      this.fetchWithRetry(
        `${GitHubProvider.API_BASE}/repos/${owner}/${repo}/git/matching-refs/heads/`,
        { headers },
        1,
        signal
      ),
      this.fetchWithRetry(
        `${GitHubProvider.API_BASE}/repos/${owner}/${repo}/git/matching-refs/tags/`,
        { headers },
        1,
        signal
      ),
    ]);

    const branchesData = await branchesResponse.json();
    const tagsData = await tagsResponse.json();

    return {
      branches: branchesData.map((b: { ref: string }) => b.ref.split('/').slice(2).join('/')),
      tags: tagsData.map((t: { ref: string }) => t.ref.split('/').slice(2).join('/')),
    };
  }


  /**
   * Resolve ref and path from URL segment
   * Handles branch names with slashes like "feature/test/branch-name"
   */
  private resolveRefAndPath(
    lastString: string,
    references: GitHubReferences
  ): { ref: string; path: string } {
    const allRefs = [...references.branches, ...references.tags];

    // Sort refs by length (longest first) to match the most specific branch first
    // This handles cases like "feature/test/branch" vs "feature/test" vs "feature"
    const sortedRefs = allRefs.sort((a, b) => b.length - a.length);

    // Find the longest matching ref that is either:
    // 1. The entire lastString (exact branch name)
    // 2. Followed by a "/" (branch + path)
    const matchingRef = sortedRefs.find((ref) => {
      if (lastString === ref) {
        return true; // Exact match
      }
      if (lastString.startsWith(ref + '/')) {
        return true; // Branch followed by path
      }
      return false;
    });

    if (matchingRef) {
      const remainingPath = lastString.slice(matchingRef.length);
      return {
        ref: matchingRef,
        path: remainingPath.startsWith('/') ? remainingPath.slice(1) : remainingPath,
      };
    }

    // If no match found, treat entire string as ref
    // This will be validated when fetching the tree
    return { ref: lastString, path: '' };
  }

  /**
   * Fetch tree SHA for a specific ref/path
   */
  private async fetchTreeSha(
    owner: string,
    repo: string,
    ref: string,
    path: string,
    signal?: AbortSignal
  ): Promise<string> {
    const headers = this.buildGitHubHeaders({
      Accept: 'application/vnd.github.object+json',
    });

    const pathSegment = path ? `/${path}` : '';
    const refParam = ref ? `?ref=${encodeURIComponent(ref)}` : '';
    const url = `${GitHubProvider.API_BASE}/repos/${owner}/${repo}/contents${pathSegment}${refParam}`;

    const response = await this.fetchWithRetry(url, { headers }, 1, signal);
    const data = await response.json();

    return data.sha;
  }


  /**
   * Fetch complete file tree recursively
   */
  /**
 * Fetch complete file tree recursively
 */
private async fetchTreeRecursive(owner: string, repo: string, sha: string, signal?: AbortSignal): Promise<FileNode[]> {
  const headers = this.buildGitHubHeaders({
    Accept: 'application/vnd.github+json',
  });

  const url = `${GitHubProvider.API_BASE}/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`;
  const response = await this.fetchWithRetry(url, { headers }, 1, signal);
  const data = await response.json();

  if (data.truncated) {
    return this.fetchTreeManualRecursive(owner, repo, sha, '', signal);
  }

  return data.tree.map(
    (item: { path: string; type: string; url: string; size?: number; sha?: string }) => ({
      path: item.path,
      type: item.type === 'blob' ? 'blob' : 'tree',
      url: item.url,
      urlType: 'api' as const,
      size: item.size,
      sha: item.sha,
    })
  );
}

private async fetchTreeManualRecursive(
  owner: string,
  repo: string,
  sha: string,
  basePath: string,
  signal?: AbortSignal
): Promise<FileNode[]> {
  const headers = this.buildGitHubHeaders({
    Accept: 'application/vnd.github+json',
  });

  const url = `${GitHubProvider.API_BASE}/repos/${owner}/${repo}/git/trees/${sha}`;
  const response = await this.fetchWithRetry(url, { headers }, 1, signal);
  const data = await response.json();

  const allNodes: FileNode[] = [];
  const treeTasks: (() => Promise<FileNode[]>)[] = [];

    for (const item of data.tree) {
      // Check if aborted between items
      if (signal?.aborted) {
        const error = new Error('Request aborted');
        error.name = 'AbortError';
        throw error;
      }


    const fullPath = basePath ? `${basePath}/${item.path}` : item.path;

    allNodes.push({
      path: fullPath,
      type: item.type === 'blob' ? 'blob' : 'tree',
      url: item.url,
      urlType: 'api' as const,
      size: item.size,
      sha: item.sha,
    });

    if (item.type === 'tree' && item.sha) {
      treeTasks.push(() =>
        this.fetchTreeManualRecursive(owner, repo, item.sha as string, fullPath, signal)
      );
    }
  }

  const chunkSize = 5;
  for (let i = 0; i < treeTasks.length; i += chunkSize) {
    // Check if aborted between chunks
      if (signal?.aborted) {
        const error = new Error('Request aborted');
    error.name = 'AbortError';
      throw error;
}

    const chunk = treeTasks.slice(i, i + chunkSize);
    const results = await Promise.all(chunk.map((task) => task()));
    for (const subNodes of results) {
      allNodes.push(...subNodes);
    }
  }

  return allNodes;
}

/**
 * Fetch a single file's content (override to handle GitHub's base64 encoding)
 */
  async fetchFile(node: FileNode, signal?: AbortSignal): Promise<FileContent> {
  if (!node.url) {
    throw new ProviderError(
      'File node has no URL',
      ErrorCode.INVALID_URL,
      'Cannot fetch file: missing URL'
    );
  }

  try {
    // Session mode: use raw github.com URLs
    if (this.sessionMode) {
      return this.fetchFileSession(node, signal);
    }

    // PAT mode: use api.github.com endpoints
    const headers = this.buildGitHubHeaders();
    const response = await this.fetchWithRetry(node.url, { headers }, 1, signal);
    const data = await response.json();

    // GitHub returns base64-encoded content
    let text = data.content || '';
    if (data.encoding === 'base64') {
      // Remove whitespace/newlines from base64 string
      text = text.replace(/\s/g, '');
      // Decode base64 to binary string, then convert to UTF-8
      const binaryString = atob(text);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      text = new TextDecoder('utf-8').decode(bytes);
    }

    return {
      path: node.path,
      text,
      url: node.url,
      lineCount: text.split('\n').length,
    };
  } catch (error) {
      // Re-throw AbortError without fallback
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
if (this.credentials?.token && this.is404or403Error(error)) {
this.sessionMode = true;
return this.fetchFileSession(node, signal);
}
throw this.handleFetchError(error, node.path);
}
}

  /**
   * Build GitHub-specific headers with authentication
   */
  private buildGitHubHeaders(additionalHeaders?: Record<string, string>): HeadersInit {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      ...additionalHeaders,
    };

    const { pat } = useStore.getState();
    const token = pat || this.credentials?.token;

    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    return headers;
  }

  /**
   * Override error handling for GitHub-specific errors
   */
  protected handleFetchError(error: unknown, context?: string): ProviderError {
    const contextMsg = context ? ` (${context})` : '';

    if (error instanceof ProviderError) {
      return error;
    }

    if (error instanceof Error) {
      const message = error.message;

      // 403 on GitHub usually means rate limit (60 requests/hour for unauthenticated)
      // or authentication required for private repos
      if (message.includes('403')) {
        return new ProviderError(
          message,
          ErrorCode.RATE_LIMITED,
          `GitHub API rate limit exceeded or authentication required${contextMsg}.

Unauthenticated requests are limited to 60/hour. Please add a GitHub Personal Access Token to increase the limit to 5,000/hour.

Click the GitHub icon in the authentication section above to add a token.`,
          () => {
            window.open(
              'https://github.com/settings/tokens/new?description=repo2txt-extension&scopes=repo',
              '_blank'
            );
          }
        );
      }

      // 429 is explicit rate limiting
      if (message.includes('429')) {
        return new ProviderError(
          message,
          ErrorCode.RATE_LIMITED,
          `GitHub API rate limit exceeded${contextMsg}. Please wait a moment and try again.`
        );
      }
    }

    // Use base class error handling for other errors
    return super.handleFetchError(error, context);
  }

  /**
   * Check if an error indicates a 404 or 403 response
   */
  private is404or403Error(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message;
      return message.includes('404') || message.includes('403');
    }
    return false;
  }
}
