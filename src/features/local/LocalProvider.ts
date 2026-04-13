/**
 * Local provider implementation
 * Supports directory uploads and zip files
 */

import JSZip from 'jszip';
import { BaseProvider } from '@/lib/providers/BaseProvider';
import { ProviderError, ErrorCode } from '@/lib/providers/types';
import type { ParsedRepoInfo } from '@/lib/providers/types';
import type {
  ProviderType,
  FileNode,
  FileContent,
  FileSystemDirectoryHandle,
  FileSystemFileHandle,
} from '@/types';

export interface LocalProviderOptions {
  source: 'directory' | 'zip';
  files?: FileList;
  directoryHandle?: FileSystemDirectoryHandle;
  zipFile?: File;
  onProgress?: (progress: number, message: string) => void;
}

export class LocalProvider extends BaseProvider {
  private fileMap: Map<string, File | FileSystemFileHandle> = new Map();
  private zipInstance: JSZip | null = null;
  private options: LocalProviderOptions | null = null;

  getType(): ProviderType {
    return 'local';
  }

  getName(): string {
    return 'Local';
  }

  /**
   * Local provider doesn't need authentication
   */
  requiresAuth(): boolean {
    return false;
  }

  /**
   * Validate URL - always returns true for local
   */
  validateUrl(url: string): boolean {
    return url === 'local://' || url.startsWith('local://');
  }

  /**
   * Parse URL - returns basic info for local
   */
  parseUrl(url: string): ParsedRepoInfo {
    if (!this.validateUrl(url)) {
      return {
        url,
        isValid: false,
        error: 'Invalid local URL format. Expected: local://',
      };
    }

    return {
      url,
      isValid: true,
    };
  }

  /**
   * Initialize with directory files or zip file
   */
  async initialize(options: LocalProviderOptions): Promise<void> {
    this.options = options;

    if (options.source === 'directory') {
      if (options.directoryHandle) {
        await this.parseDirectoryHandle(options.directoryHandle, options.onProgress);
        this.repoInfo = {
          type: 'local',
          name: options.directoryHandle.name || 'Directory',
          url: 'local://directory',
        };
      } else if (options.files && options.files.length > 0) {
        this.parseDirectoryFiles(options.files);
        this.repoInfo = {
          type: 'local',
          name: this.extractDirectoryName(options.files),
          url: 'local://directory',
        };
      } else {
        throw new ProviderError(
          'No files provided',
          ErrorCode.INVALID_URL,
          'Please select a directory to upload'
        );
      }
    } else if (options.source === 'zip') {
      if (!options.zipFile) {
        throw new ProviderError(
          'No zip file provided',
          ErrorCode.INVALID_URL,
          'Please select a zip file to upload'
        );
      }

      await this.parseZipFile(options.zipFile, options.onProgress);

      this.repoInfo = {
        type: 'local',
        name: options.zipFile.name.replace(/\.zip$/i, ''),
        url: 'local://zip',
      };
    }
  }

  /**
   * Fetch tree from local files
   */
  async fetchTree(_url?: string, _options?: any): Promise<FileNode[]> {
    if (!this.options) {
      throw new ProviderError(
        'Provider not initialized',
        ErrorCode.INVALID_URL,
        'Please call initialize() before fetching tree'
      );
    }

    const nodes: FileNode[] = [];

    if (this.options.source === 'directory') {
      // Build tree from file map
      for (const [path, fileOrHandle] of this.fileMap) {
        nodes.push({
          path,
          type: 'blob',
          size: 'size' in fileOrHandle ? fileOrHandle.size : undefined,
          url: path, // Use path as URL for local files
          urlType: 'directory',
        });
      }
    } else if (this.options.source === 'zip' && this.zipInstance) {
      // Build tree from zip
      this.zipInstance.forEach((relativePath, file) => {
        if (!file.dir) {
          nodes.push({
            path: relativePath,
            type: 'blob',
            url: relativePath,
            urlType: 'zip',
          });
        }
      });
    }

    return nodes;
  }

  /**
   * Fetch a single file's content
   */
  async fetchFile(node: FileNode): Promise<FileContent> {
    if (node.urlType === 'directory') {
      // Get from file map
      let file = this.fileMap.get(node.path);
      if (!file) {
        throw new ProviderError(
          `File not found: ${node.path}`,
          ErrorCode.NOT_FOUND,
          'The requested file could not be found'
        );
      }

      let actualFile: File;
      if ('kind' in file && file.kind === 'file' && 'getFile' in file && typeof file.getFile === 'function') {
        try {
          actualFile = await file.getFile();
        } catch {
          throw new ProviderError(
            `Permission denied or file unreadable: ${node.path}`,
            ErrorCode.UNKNOWN,
            'Could not read file. Please ensure you have granted permission.'
          );
        }
      } else {
        actualFile = file as File;
      }

      const text = await this.readFileAsText(actualFile);
      return {
        path: node.path,
        text,
        lineCount: text.split('\n').length,
      };
    } else if (node.urlType === 'zip' && this.zipInstance) {
      // Get from zip
      const zipFile = this.zipInstance.file(node.path);
      if (!zipFile) {
        throw new ProviderError(
          `File not found in zip: ${node.path}`,
          ErrorCode.NOT_FOUND,
          'The requested file could not be found in the zip archive'
        );
      }

      const text = await zipFile.async('text');
      return {
        path: node.path,
        text,
        lineCount: text.split('\n').length,
      };
    }

    throw new ProviderError(
      'Invalid file node',
      ErrorCode.UNKNOWN,
      'Could not determine file source'
    );
  }

  /**
   * Parse directory files from FileList
   */
  private parseDirectoryFiles(files: FileList): void {
    this.fileMap.clear();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const path = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      this.fileMap.set(path, file);
    }
  }

  private async parseDirectoryHandle(
    dirHandle: FileSystemDirectoryHandle,
    onProgress?: (progress: number, message: string) => void
  ): Promise<void> {
    this.fileMap.clear();
    let fileCount = 0;

    const traverse = async (handle: FileSystemDirectoryHandle, currentPath: string) => {
      for await (const entry of handle.values()) {
        const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
        if (entry.kind === 'file') {
          this.fileMap.set(entryPath, entry as FileSystemFileHandle);
          fileCount++;
          if (fileCount % 100 === 0) {
            onProgress?.(0, `Found ${fileCount} files...`);
          }
        } else if (entry.kind === 'directory') {
          await traverse(entry as FileSystemDirectoryHandle, entryPath);
        }
      }
    };

    onProgress?.(0, 'Scanning directory...');
    await traverse(dirHandle, dirHandle.name);
    onProgress?.(100, `Found ${fileCount} files`);
  }

  /**
   * Parse zip file using JSZip
   */
  private async parseZipFile(
    zipFile: File,
    onProgress?: (progress: number, message: string) => void
  ): Promise<void> {
    try {
      onProgress?.(0, 'Reading zip file...');

      this.zipInstance = await JSZip.loadAsync(zipFile, {
        createFolders: false,
      });

      onProgress?.(100, 'Zip file loaded');
    } catch (error) {
      throw new ProviderError(
        String(error),
        ErrorCode.UNKNOWN,
        'Failed to parse zip file. Please ensure it is a valid zip archive.'
      );
    }
  }

  /**
   * Extract directory name from FileList
   */
  private extractDirectoryName(files: FileList): string {
    if (files.length === 0) return 'Unknown';

    const firstFile = files[0];
    const relativePath = (firstFile as File & { webkitRelativePath?: string }).webkitRelativePath;

    if (relativePath) {
      const parts = relativePath.split('/');
      return parts[0] || 'Directory';
    }

    return 'Directory';
  }

  /**
   * Read file as text
   */
  private readFileAsText(file: File): Promise<string> {
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return Promise.reject(
        new ProviderError(
          'File too large',
          ErrorCode.UNKNOWN,
          `File ${file.name} exceeds the 10MB limit for text files.`
        )
      );
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve(reader.result as string);
      };

      reader.onerror = () => {
        reject(
          new ProviderError(
            'Failed to read file',
            ErrorCode.UNKNOWN,
            `Could not read file: ${file.name}`
          )
        );
      };

      reader.readAsText(file);
    });
  }

  /**
   * Reset provider state
   */
  reset(): void {
    super.reset();
    this.fileMap.clear();
    this.zipInstance = null;
    this.options = null;
  }
}
