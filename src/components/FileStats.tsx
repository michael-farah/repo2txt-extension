/**
 * File Statistics component
 * Displays per-file token and line counts
 */

import { useState } from 'react';
import type { FileContent } from '@/types';

interface FileStatsProps {
  files: FileContent[];
}

export function FileStats({ files }: FileStatsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!files || files.length === 0) {
    return null;
  }

  // Filter files that have token counts
  const filesWithStats = files.filter((f) => f.tokenCount !== undefined);

  if (filesWithStats.length === 0) {
    return null;
  }

  // Sort by token count (descending)
  const sortedFiles = [...filesWithStats].sort(
    (a, b) => (b.tokenCount || 0) - (a.tokenCount || 0)
  );

  const totalTokens = sortedFiles.reduce((sum, f) => sum + (f.tokenCount || 0), 0);
  const totalLines = sortedFiles.reduce((sum, f) => sum + (f.lineCount || 0), 0);

  return (
    <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
      {/* Header with summary - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100">Files</h3>
            <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                {sortedFiles.length} files
              </span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">•</span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                {totalLines.toLocaleString()} lines
              </span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">•</span>
                  <span className="text-[11px] text-primary-600 dark:text-primary-400">
                {totalTokens.toLocaleString()} tokens
              </span>
            </div>
          </div>
          <svg
            className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
              isExpanded ? 'transform rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Collapsible per-file details */}
      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="px-2 pb-2 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-0.5 max-h-48 overflow-y-auto pt-2">
              {sortedFiles.map((file) => (
                <div
                  key={file.path}
                  className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                      {file.path.split('/').pop()}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                      {file.path}
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <div className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium">{file.lineCount?.toLocaleString()}</span>
                      <span className="text-[11px] ml-0.5">lines</span>
                    </div>
                    <div className="text-primary-600 dark:text-primary-400">
                      <span className="font-medium">{file.tokenCount?.toLocaleString()}</span>
                      <span className="text-[11px] ml-0.5">tokens</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
    </div>
    </div>
  );
}
