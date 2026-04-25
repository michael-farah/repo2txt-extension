/**
 * File search bar component
 * Compact search input for filtering the file tree by filename
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';

interface FileSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
  totalCount: number;
  className?: string;
}

export function FileSearchBar({
  value,
  onChange,
  resultCount,
  totalCount,
  className,
}: FileSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  // ⌘K / Ctrl+K shortcut to focus the search bar
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClear = useCallback(() => {
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  const showResultCount = value.length > 0;
  const showShortcutHint = value.length === 0 && !focused;

  return (
    <div className={cn('relative', className)}>
      {/* Search icon */}
      <svg
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-content-muted"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search files…"
        aria-label="Search files"
        className={cn(
          'w-full rounded-md border border-stroke bg-surface-raised px-3 py-1.5 text-sm text-content',
          'pl-9',
          showResultCount ? 'pr-20' : showShortcutHint ? 'pr-16' : 'pr-9',
          'placeholder:text-content-subtle',
          'focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none',
          'transition-colors'
        )}
      />

      {/* Result count badge */}
      {showResultCount && (
        <span className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-xs text-content-muted tabular-nums">
          {resultCount}/{totalCount}
        </span>
      )}

      {/* Clear button */}
      {value.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center h-4 w-4 rounded-sm text-content-muted hover:text-content focus:outline-none focus:text-content transition-colors"
          aria-label="Clear search"
        >
          <svg
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}

      {/* Keyboard shortcut hint */}
      {showShortcutHint && (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-content-subtle border border-stroke rounded px-1.5 py-0.5">
          ⌘K
        </span>
      )}
    </div>
  );
}
