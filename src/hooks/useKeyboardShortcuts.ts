/**
 * Global keyboard shortcuts hook
 * Registers keyboard shortcuts for common actions
 */

import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsConfig {
  onSearch?: () => void;
  onEscape?: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onGenerate?: () => void;
  enabled?: boolean;
}

/**
 * Hook for global keyboard shortcuts
 * - Ctrl/Cmd+K: Open search
 * - Escape: Close search / clear selection
 * - Ctrl/Cmd+A: Select all files
 * - Ctrl/Cmd+Shift+A: Deselect all files
 * - Ctrl/Cmd+Enter: Generate output
 */
export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  const {
    onSearch,
    onEscape,
    onSelectAll,
    onDeselectAll,
    onGenerate,
    enabled = true,
  } = config;

  const handler = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't capture shortcuts when typing in an input/textarea
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      const isMod = e.metaKey || e.ctrlKey;

      // Ctrl/Cmd + K → Search
      if (isMod && e.key === 'k') {
        e.preventDefault();
        onSearch?.();
        return;
      }

      // Ctrl/Cmd + Enter → Generate
      if (isMod && e.key === 'Enter') {
        e.preventDefault();
        onGenerate?.();
        return;
      }

      // Escape → close/clear (works even in inputs)
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscape?.();
        return;
      }

      // The following shortcuts only work when NOT in an input
      if (isInput) return;

      // Ctrl/Cmd + A → Select all
      if (isMod && e.key === 'a' && !e.shiftKey) {
        e.preventDefault();
        onSelectAll?.();
        return;
      }

      // Ctrl/Cmd + Shift + A → Deselect all
      if (isMod && e.key === 'A' && e.shiftKey) {
        e.preventDefault();
        onDeselectAll?.();
        return;
      }
    },
    [enabled, onSearch, onEscape, onSelectAll, onDeselectAll, onGenerate]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handler, enabled]);
}
