/**
 * File tree node component
 * Represents a single file or directory in the tree
 * Features extension-specific file icons with color coding
 */

import { useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import type { TreeNode } from '@/types';

interface FileTreeNodeProps {
  node: TreeNode;
  depth: number;
  onToggle?: (path: string) => void;
  onSelect?: (path: string, selected: boolean) => void;
  showExcluded?: boolean;
}

/** Get file icon SVG based on file extension */
function getFileIcon(filename: string, isSelected: boolean) {
  const ext = filename.includes('.') ? filename.split('.').pop()?.toLowerCase() : '';

  // TypeScript / TSX
  if (ext === 'ts' || ext === 'tsx') {
    return (
      <svg
        className={cn('w-4 h-4', isSelected ? 'text-blue-500' : 'text-blue-400')}
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path d="M1 1h14v14H1V1zm6 7v4.5l.5.5h2l.5-.5V8H9v3.5H8.5V8H7zm-.5-2h-2v1h2V6zm0 0h2V5h-2v1zm5.5 0h-2v1h2V6zm0 0h2V5h-2v1z" />
      </svg>
    );
  }

  // JavaScript / JSX
  if (ext === 'js' || ext === 'jsx' || ext === 'mjs' || ext === 'cjs') {
    return (
      <svg
        className={cn('w-4 h-4', isSelected ? 'text-yellow-500' : 'text-yellow-400')}
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path d="M1 1h14v14H1V1zm7.5 10.5c0 1.38-.91 2-2.25 2-1.16 0-1.84-.58-2.19-1.33l1.18-.71c.21.38.4.7.87.7.44 0 .72-.17.72-.84 0-1.73-4.05-1.5-4.05-4.37C3.78 5.83 5.14 5 6.63 5c1.14 0 1.96.43 2.49 1.38L7.94 7.1c-.23-.41-.48-.57-.88-.57-.4 0-.66.27-.66.62 0 .86 2.75.51 2.75 3.35zm4.75-3.5c-.47 0-.76.23-.95.58l-1.15-.67c.38-.76 1.1-1.41 2.25-1.41 1.32 0 2.1.68 2.1 1.85 0 .74-.37 1.22-.93 1.58l.01.02c.18.13.42.37.42.92 0 .86-.55 1.63-1.85 1.63-1.26 0-1.94-.63-2.3-1.42l1.25-.6c.2.43.48.77.97.77.38 0 .6-.19.6-.54 0-.4-.5-.55-1.06-.75l-.37-.15c-.73-.3-1.26-.73-1.26-1.62 0-.94.76-1.29 1.63-1.29z" />
      </svg>
    );
  }

  // Python
  if (ext === 'py' || ext === 'pyi' || ext === 'pyw') {
    return (
      <svg
        className={cn('w-4 h-4', isSelected ? 'text-sky-500' : 'text-sky-400')}
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path d="M8 1C4.69 1 5 2.5 5 2.5V4H8.5V4.5H3S1 4.14 1 7.5s1.75 3.25 1.75 3.25H4V9s-.1-1.75 1.9-1.75h3.7S12 7.4 12 5.5V3.5S12.28 1 8 1zM5.5 2.5a.75.75 0 110 1.5.75.75 0 010-1.5z" />
        <path d="M8 15c3.31 0 3-1.5 3-1.5V12H7.5v-.5H13s2 .36 2-3-1.75-3.25-1.75-3.25H12V7s.1 1.75-1.9 1.75H6.4S4 8.6 4 10.5v2S3.72 15 8 15zm2.5-1.5a.75.75 0 110-1.5.75.75 0 010 1.5z" />
      </svg>
    );
  }

  // Rust
  if (ext === 'rs') {
    return (
      <svg
        className={cn('w-4 h-4', isSelected ? 'text-orange-500' : 'text-orange-400')}
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path d="M8 0L.5 4v8L8 16l7.5-4V4L8 0zm0 2l5 2.67v5.66L8 13.33 3 10.33V4.67L8 2z" />
      </svg>
    );
  }

  // CSS / SCSS / LESS
  if (ext === 'css' || ext === 'scss' || ext === 'less' || ext === 'sass') {
    return (
      <svg
        className={cn('w-4 h-4', isSelected ? 'text-purple-500' : 'text-purple-400')}
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path d="M1 1l1.3 12.3L8 15l5.7-1.7L15 1H1zm10.2 4H5.8l.2 2h5l-.4 4.3L8 12.2l-2.6-.9-.2-2.2h1.9l.1 1.1 1.8.5 1.8-.5.2-2.1H5.3L4.8 3h6.5l-.1 2z" />
      </svg>
    );
  }

  // JSON
  if (ext === 'json' || ext === 'jsonc' || ext === 'json5') {
    return (
      <svg
        className={cn('w-4 h-4', isSelected ? 'text-green-500' : 'text-green-400')}
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path d="M5.5 1C3 1 3 3.5 3 3.5v2S3 8 1 8s2 0 2 0-2 0-2 2v2s0 2.5 2.5 2.5v-1S3 12 3 10.5V9s0-2 2-2-2 0-2-2V4S3 2 5.5 2v-1zm5 0C8 1 8 3.5 8 3.5v2S8 8 6 8s2 0 2 0-2 0-2 2v2s0 2.5 2.5 2.5v-1S13 12 13 10.5V9s0-2-2-2 2 0 2-2V4s0-2.5-2.5-2.5v1zM11 2c1.5 0 1.5 1.5 1.5 1.5v2s0 1.5-1.5 1.5S9.5 5.5 9.5 5.5v-2S9.5 2 11 2z" />
      </svg>
    );
  }

  // Markdown
  if (ext === 'md' || ext === 'mdx') {
    return (
      <svg
        className={cn(
          'w-4 h-4',
          isSelected ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'
        )}
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path d="M1 3v10h14V3H1zm12.5 8.5h-11v-7h11v7zM4 10l2-2-2-2h1.5L7.5 8 5.5 10H4zm4 0v-1h3v1H8z" />
      </svg>
    );
  }

  // Images
  if (
    ext === 'png' ||
    ext === 'jpg' ||
    ext === 'jpeg' ||
    ext === 'gif' ||
    ext === 'svg' ||
    ext === 'webp' ||
    ext === 'ico'
  ) {
    return (
      <svg
        className={cn('w-4 h-4', isSelected ? 'text-emerald-500' : 'text-emerald-400')}
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path d="M14 3v10H2V3h12zm1-1H1v12h14V2zM5 8l2 3 3-4 3 5H3l2-4z" />
        <circle cx="5.5" cy="5.5" r="1.5" />
      </svg>
    );
  }

  // Config files
  if (
    ext === 'yml' ||
    ext === 'yaml' ||
    ext === 'toml' ||
    ext === 'env' ||
    ext === 'ini' ||
    ext === 'cfg' ||
    ext === 'conf'
  ) {
    return (
      <svg
        className={cn('w-4 h-4', isSelected ? 'text-amber-500' : 'text-amber-400')}
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path d="M2 1v14h12V1H2zm6 12H4v-1h4v1zm0-2H4v-1h4v1zm0-2H4V8h4v1zm4 4H9v-1h3v1zm0-2H9v-1h3v1zm0-2H9V8h3v1zm0-2H4V5h8v2z" />
      </svg>
    );
  }

  // Shell scripts
  if (ext === 'sh' || ext === 'bash' || ext === 'zsh' || ext === 'fish') {
    return (
      <svg
        className={cn('w-4 h-4', isSelected ? 'text-lime-500' : 'text-lime-400')}
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path d="M2 2v12h12V2H2zm3 9l-1-1 3-3-3-3 1-1 4 4-4 4zm5 1H7v-1h3v1z" />
      </svg>
    );
  }

  // Go
  if (ext === 'go') {
    return (
      <svg
        className={cn('w-4 h-4', isSelected ? 'text-cyan-500' : 'text-cyan-400')}
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path d="M2.5 7c-.8 0-1.5.3-1.5 1v2c0 .6.7 1 1.5 1s1.5-.4 1.5-1V8c0-.7-.7-1-1.5-1zm11 0c-.8 0-1.5.3-1.5 1v2c0 .6.7 1 1.5 1s1.5-.4 1.5-1V8c0-.7-.7-1-1.5-1zM5 5h6v1H5V5zm1.5 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm3 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
      </svg>
    );
  }

  // HTML
  if (ext === 'html' || ext === 'htm') {
    return (
      <svg
        className={cn('w-4 h-4', isSelected ? 'text-orange-500' : 'text-orange-400')}
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path d="M3 2l1 12 4 1 4-1 1-12H3zm8.5 3h-7l-.2-2h7.4l-.2 2zm-.5 2l-.5 5.5L8 13.5l-2.5-1L5 7h6z" />
      </svg>
    );
  }

  // Default file icon
  return (
    <svg className="w-4 h-4 text-content-subtle" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Get directory icon */
function getDirectoryIcon(isOpen: boolean) {
  return (
    <svg
      className={cn(
        'w-4 h-4',
        isOpen ? 'text-primary-500' : 'text-primary-400 dark:text-primary-500'
      )}
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      {isOpen ? (
        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      ) : (
        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      )}
    </svg>
  );
}

export function FileTreeNode({
  node,
  depth,
  onToggle,
  onSelect,
  showExcluded = false,
}: FileTreeNodeProps) {
  const isDirectory = node.type === 'directory';
  const isExcluded = node.excluded || false;
  const isVisible = node.visible !== false;
  const isOpen = !!node.children;

  const handleCheckboxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      onSelect?.(node.path, e.target.checked);
    },
    [node.path, onSelect]
  );

  const handleToggle = useCallback(() => {
    if (isDirectory) {
      onToggle?.(node.path);
    }
  }, [isDirectory, node.path, onToggle]);

  if (!isVisible && !showExcluded) {
    return null;
  }

  const getCheckboxState = (): 'checked' | 'unchecked' | 'indeterminate' => {
    if (node.selected === 'indeterminate') return 'indeterminate';
    if (node.selected === true) return 'checked';
    return 'unchecked';
  };

  const checkboxState = getCheckboxState();

  return (
    <div
      className={cn(
        'flex items-center gap-2 py-1 px-2 rounded-md transition-colors duration-75 min-h-[32px]',
        'hover:bg-surface-raised active:bg-surface-sunken',
        isExcluded && 'opacity-50',
        isDirectory && 'cursor-pointer'
      )}
      style={{ paddingLeft: `${depth * 20 + 8}px` }}
      onClick={handleToggle}
    >
      {/* Expand/collapse icon for directories */}
      {isDirectory && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          className="flex-shrink-0 p-1 hover:bg-surface-sunken active:bg-gray-300 dark:active:bg-gray-600 rounded min-w-[28px] min-h-[28px] flex items-center justify-center transition-colors duration-75"
          aria-label={isOpen ? 'Collapse' : 'Expand'}
        >
          <svg
            className={cn(
              'w-3 h-3 text-content-muted transform transition-transform duration-150',
              isOpen && 'rotate-90'
            )}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}

      {/* Checkbox - hidden for excluded files */}
      {!isExcluded && (
        <input
          type="checkbox"
          checked={checkboxState === 'checked'}
          ref={(input) => {
            if (input) {
              input.indeterminate = checkboxState === 'indeterminate';
            }
          }}
          onChange={handleCheckboxChange}
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0 h-4 w-4 min-h-[20px] min-w-[20px] rounded border-stroke text-primary-600 focus:ring-primary-500 focus:ring-offset-0 dark:bg-gray-800"
          aria-label={`Select ${isDirectory ? 'directory' : 'file'} ${node.name}`}
        />
      )}
      {/* Spacer for excluded files to maintain alignment */}
      {isExcluded && <div className="w-4 h-4 flex-shrink-0" />}

      {/* Icon */}
      <div className="flex-shrink-0">
        {isDirectory
          ? getDirectoryIcon(isOpen)
          : getFileIcon(node.name, checkboxState === 'checked')}
      </div>

      {/* Name */}
      <span
        className={cn(
          'flex-1 text-sm truncate',
          isExcluded
            ? 'text-content-subtle line-through'
            : isDirectory
              ? 'text-content font-medium'
              : 'text-content'
        )}
        title={node.name}
      >
        {node.name}
      </span>
    </div>
  );
}
