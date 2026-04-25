/**
 * Output panel component
 * Displays formatted output with download and copy functionality
 * Features gradient progress bar, copy success animation, semantic tokens
 */

import { useState } from 'react';
import JSZip from 'jszip';
import { Button } from './ui/Button';
import { FileStats } from './FileStats';
import { Skeleton } from './ui/Skeleton';
import { cn } from '@/lib/utils/cn';
import { logger } from '@/lib/utils/logger';
import { sanitizeFilename } from '@/lib/utils/repoName';
import type { FormattedOutput } from '@/types';

interface OutputPanelProps {
  output: FormattedOutput | null;
  isLoading?: boolean;
  repoName?: string;
  showTokenCount?: boolean;
  showLineCount?: boolean;
}

export function OutputPanel({
  output,
  isLoading = false,
  repoName = 'repo-export',
  showTokenCount = true,
  showLineCount = true,
}: OutputPanelProps) {
  const [copied, setCopied] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'txt' | 'md' | 'zip'>('txt');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleCopy = async () => {
    if (!output) return;

    const fullText = `${output.directoryTree}\n\n${output.fileContents}`;

    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      logger.error('repo2txt', 'Failed to copy:', error);
    }
  };

  const fallbackDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const handleDownload = async () => {
    if (!output) return;

    setDownloadError(null);
    setIsDownloading(true);

    try {
      const fullText = `${output.directoryTree}\n\n${output.fileContents}`;
      const safeName = sanitizeFilename(repoName);
      const isChromeExtension = typeof chrome !== 'undefined' && chrome.downloads;

      if (downloadFormat === 'zip') {
        const zip = new JSZip();
        zip.file(`${safeName}.txt`, fullText);

        const metadata = {
          generatedAt: new Date().toISOString(),
          repository: repoName,
          lineCount: output.lineCount,
          tokenCount: output.tokenCount,
          fileCount: output.files?.length || 0,
        };
        zip.file('metadata.json', JSON.stringify(metadata, null, 2));

        const blob = await zip.generateAsync({ type: 'blob' });

        if (isChromeExtension) {
          const url = URL.createObjectURL(blob);
          try {
            await chrome.downloads.download({
              url,
              filename: `${safeName}.zip`,
              saveAs: true,
            });
          } finally {
            setTimeout(() => URL.revokeObjectURL(url), 30000);
          }
        } else {
          fallbackDownload(blob, `${safeName}.zip`);
        }
      } else {
        const mimeType = downloadFormat === 'md' ? 'text/markdown' : 'text/plain';
        const blob = new Blob([fullText], { type: mimeType });

        if (isChromeExtension) {
          const url = URL.createObjectURL(blob);
          try {
            await chrome.downloads.download({
              url,
              filename: `${safeName}.${downloadFormat}`,
              saveAs: true,
            });
          } finally {
            setTimeout(() => URL.revokeObjectURL(url), 30000);
          }
        } else {
          fallbackDownload(blob, `${safeName}.${downloadFormat}`);
        }
      }
    } catch (error) {
      logger.error('repo2txt', 'Failed to download:', error);
      setDownloadError(error instanceof Error ? error.message : 'Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Loading state with gradient progress bar
  if (isLoading) {
    return (
      <div className="space-y-3">
        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-surface-sunken overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-primary-500 via-primary-400 to-primary-600 animate-indeterminate" />
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg border border-stroke bg-surface-raised">
          <span className="text-xs text-content-muted">Generating output...</span>
          <Skeleton variant="text" width="60px" />
        </div>

        <Skeleton variant="rectangle" count={4} className="h-4" />
      </div>
    );
  }

  if (!output) {
    return (
      <div className="flex items-center justify-center h-48 border border-stroke rounded-lg bg-surface">
        <div className="text-center text-content-muted">
          <svg
            className="mx-auto h-10 w-10 text-content-subtle"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-1.5 text-xs">Select files to generate output</p>
        </div>
      </div>
    );
  }

  const fullText = `${output.directoryTree}\n\n${output.fileContents}`;

  return (
    <div className="space-y-1.5">
      {/* Stats + Actions Row */}
      <div className={cn(
        'flex items-center justify-between p-2 rounded-lg border border-stroke bg-surface-raised gap-2 transition-colors',
        copied && 'animate-copy-success'
      )}>
        {/* Compact Stats Pills */}
        <div className="flex items-center gap-1.5">
          {showLineCount && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 border border-stroke-subtle">
              <svg className="w-3 h-3 text-content-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
              <span className="text-[11px] text-content-muted">Lines</span>
              <span className="text-xs font-semibold text-content">{output.lineCount.toLocaleString()}</span>
            </span>
          )}
          {showTokenCount && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 border border-stroke-subtle">
              <svg className="w-3 h-3 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l3.5 7L5 17h14l-3.5-7L19 3H5z" />
              </svg>
              <span className="text-[11px] text-content-muted">Tokens</span>
              <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">{output.tokenCount.toLocaleString()}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 border border-stroke-subtle">
            <svg className="w-3 h-3 text-content-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-[11px] text-content-muted">Files</span>
            <span className="text-xs font-semibold text-content">{output.files?.length || 0}</span>
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <Button
            variant={copied ? 'success' : 'secondary'}
            size="sm"
            onClick={handleCopy}
            title="Copy to clipboard"
            className="px-2 py-1 h-7 text-xs"
          >
            {copied ? (
              <>
                <svg className="w-3 h-3 mr-1 animate-scale-in" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg
                  className="w-3 h-3 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy
              </>
            )}
          </Button>

          <select
            value={downloadFormat}
            onChange={(e) => { setDownloadFormat(e.target.value as 'txt' | 'md' | 'zip'); setDownloadError(null); }}
            className="h-7 rounded border border-stroke bg-surface px-1.5 text-xs text-content focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            title="Select download format"
            aria-label="Download format"
          >
            <option value="txt">TXT</option>
            <option value="md">MD</option>
            <option value="zip">ZIP</option>
          </select>

          <Button
            variant="primary"
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading}
            title={`Download as ${downloadFormat.toUpperCase()}`}
            className="px-2 py-1 h-7 text-xs"
          >
            {isDownloading ? (
              <>
                <div className="w-3 h-3 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ...
              </>
            ) : (
              <>
                <svg
                  className="w-3 h-3 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span>Download</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {downloadError && (
        <p className="text-xs text-danger-600 dark:text-danger-400 px-2">{downloadError}</p>
      )}

      {/* Per-file statistics */}
      {output.files && output.files.length > 0 && <FileStats files={output.files} />}

      {/* Output preview with left accent border */}
      <div className="rounded-lg border border-stroke bg-surface overflow-hidden">
        <div className="border-l-2 border-primary-300 dark:border-primary-700 p-2 max-h-48 overflow-auto">
          <pre className="text-[11px] font-mono text-content whitespace-pre-wrap">
            {fullText}
          </pre>
        </div>
      </div>
    </div>
  );
}
