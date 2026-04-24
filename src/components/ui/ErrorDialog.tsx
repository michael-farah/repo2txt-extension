/**
 * Error Dialog component
 * Displays user-friendly error messages with optional recovery actions
 */

import { useEffect, useRef } from 'react';

interface ErrorDialogProps {
  title?: string;
  message: string;
  onClose: () => void;
  onAction?: () => void;
  actionLabel?: string;
}

export function ErrorDialog({
  title = 'Oops! Something went wrong',
  message,
  onClose,
  onAction,
  actionLabel = 'Help',
}: ErrorDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Focus trap
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Focus the first focusable element
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !dialog) return;
      const focusableElements = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleTab);
    return () => window.removeEventListener('keydown', handleTab);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div ref={dialogRef} role="dialog" aria-modal="true" className="bg-surface rounded-lg shadow-xl max-w-md w-full border border-stroke-subtle">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
        <h3 className="text-lg font-semibold text-content">
                {title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
        className="text-content-subtle hover:text-content transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Message */}
        <div className="px-6 pb-6">
      <p className="text-sm text-content-muted whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* Actions */}
      <div className="flex gap-3 p-6 pt-0 border-t border-stroke-subtle">
          <button
            onClick={onClose}
        className="flex-1 px-4 py-2 text-sm font-medium text-content bg-surface-sunken hover:bg-surface-raised rounded-md transition-colors"
          >
            Close
          </button>
          {onAction && (
            <button
              onClick={() => {
                onAction();
                onClose();
              }}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 rounded-md transition-colors"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
