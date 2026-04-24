/**
 * Advanced Filters component
 * Wraps Extension Filter and Gitignore Editor in a collapsible container
 */

import { useState } from 'react';
import { ExtensionFilter } from './filters/ExtensionFilter';
import { GitIgnoreEditor } from './filters/GitIgnoreEditor';
import type { ExtensionFilter as ExtensionFilterType } from '@/types';

interface AdvancedFiltersProps {
  // Extension filter props
  extensions: ExtensionFilterType[];
  onExtensionToggle?: (extension: string) => void;
  onSelectAllExtensions?: () => void;
  onDeselectAllExtensions?: () => void;

  // Gitignore editor props
  gitignorePatterns: string[];
  onApplyGitignore?: (patterns: string[]) => void;
  onResetGitignore?: () => void;
  showExcluded?: boolean;
  onToggleExcluded?: (show: boolean) => void;
}

export function AdvancedFilters({
  extensions,
  onExtensionToggle,
  onSelectAllExtensions,
  onDeselectAllExtensions,
  gitignorePatterns,
  onApplyGitignore,
  onResetGitignore,
  showExcluded,
  onToggleExcluded,
}: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-surface">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
      className="w-full flex items-center justify-between p-2 hover:bg-surface-raised transition-colors min-h-[32px] touch-manipulation"
      >
        <div className="flex items-center gap-1.5">
        <h3 className="text-sm font-semibold text-content">
            Advanced Filters
          </h3>
        <span className="text-[11px] text-content-muted">Extension & Gitignore</span>
        </div>
        <svg
      className={`w-4 h-4 text-content-muted transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
      <div className="p-2 border-t border-border-subtle">
            <div className="grid grid-cols-1 gap-3">
              {/* Extension Filter */}
              <div className="space-y-1.5">
        <h4 className="text-xs font-medium text-content">
                  File Extensions
                </h4>
                <ExtensionFilter
                  extensions={extensions}
                  onToggle={onExtensionToggle}
                  onSelectAll={onSelectAllExtensions}
                  onDeselectAll={onDeselectAllExtensions}
                />
              </div>

              {/* Gitignore Patterns */}
              <div className="space-y-1.5">
        <h4 className="text-xs font-medium text-content">
                  Gitignore Patterns
                </h4>
                <GitIgnoreEditor
                  patterns={gitignorePatterns}
                  onApply={onApplyGitignore}
                  onReset={onResetGitignore}
                  showExcluded={showExcluded}
                  onToggleExcluded={onToggleExcluded}
                />
              </div>
            </div>
          </div>
        </div>
    </div>
    </div>
  );
}
