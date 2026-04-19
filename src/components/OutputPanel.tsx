/**
 * Output panel component
 * Displays formatted output with download and copy functionality
 */

import { useState } from 'react';
import JSZip from 'jszip';
import { Button } from './ui/Button';
import { FileStats } from './FileStats';
import { sanitizeFilename } from '@/lib/utils/repoName';
import type { FormattedOutput } from '@/types';

interface OutputPanelProps {
  output: FormattedOutput | null;
  isLoading?: boolean;
  repoName?: string;
}

export function OutputPanel({
  output,
  isLoading = false,
  repoName = 'repo-export',
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
      console.error('Failed to copy:', error);
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
      console.error('Failed to download:', error);
      setDownloadError(error instanceof Error ? error.message : 'Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading files...</p>
        </div>
      </div>
    );
  }

  if (!output) {
    return (
      <div className="flex items-center justify-center h-64 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
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
          <p className="mt-2 text-sm">Select files to generate output</p>
        </div>
      </div>
    );
  }

  const fullText = `${output.directoryTree}\n\n${output.fileContents}`;

  return (
    <div className="space-y-2">
      {/* Stats */}
      <div className="flex flex-col items-start justify-between p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 gap-2">
        <div className="flex gap-4 w-full justify-between">
          <div className="flex gap-4">
            <div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Lines</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {output.lineCount.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Tokens</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {output.tokenCount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-1.5 w-full">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            title="Copy to clipboard"
            className="flex-1 px-2 py-1.5 h-auto text-xs"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg
                  className="w-3.5 h-3.5 mr-1"
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

          <div className="flex gap-1.5 flex-1">
            <select
              value={downloadFormat}
          onChange={(e) => { setDownloadFormat(e.target.value as 'txt' | 'md' | 'zip'); setDownloadError(null); }}
              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-1.5 py-1 text-xs text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
              title="Select download format"
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
              className="flex-1 px-2 py-1.5 h-auto text-xs"
            >
              {isDownloading ? (
                <>
                  <div className="w-3.5 h-3.5 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <svg
                    className="w-3.5 h-3.5 mr-1"
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
                  Download
                </>
              )}
            </Button>
          </div>
          {downloadError && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{downloadError}</p>
          )}
        </div>
      </div>

      {/* Per-file statistics */}
      {output.files && output.files.length > 0 && <FileStats files={output.files} />}

      {/* Output preview */}
      <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="p-2 border-b border-gray-300 dark:border-gray-700">
          <h3 className="text-xs font-medium text-gray-900 dark:text-gray-100">Output Preview</h3>
        </div>
        <div className="p-2 max-h-48 overflow-auto">
          <pre className="text-[10px] font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
            {fullText}
          </pre>
        </div>
      </div>
    </div>
  );
}
