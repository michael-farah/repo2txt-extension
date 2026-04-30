/**
 * Provider selector component
 * Allows switching between GitHub and Local providers
 * Features animated sliding pill indicator
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { useStore, type ActiveTab } from '@/store';
import { GitHubForm } from '@/features/github';
import { LocalForm } from '@/features/local';
import { cn } from '@/lib/utils/cn';
import type { ProviderType, FileSystemDirectoryHandle } from '@/types';

interface ProviderSelectorProps {
  onGitHubSubmit?: (url: string) => void;
  onLocalDirectorySubmit?: (files: FileList | FileSystemDirectoryHandle) => void;
  onLocalZipSubmit?: (file: File) => void;
  onProviderChange?: (provider: ProviderType) => void;
  disabled?: boolean;
  initialUrl?: string;
  autoSubmitUrl?: string;
}

const TABS = [
  {
    id: 'github' as ProviderType,
    label: 'GitHub',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.232 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
    testId: 'provider-tab-github',
  },
  {
    id: 'local' as ProviderType,
    label: 'Local',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
        />
      </svg>
    ),
    testId: 'provider-tab-local',
  },
];

export function ProviderSelector({
  onGitHubSubmit,
  onLocalDirectorySubmit,
  onLocalZipSubmit,
  onProviderChange,
  disabled = false,
  initialUrl,
  autoSubmitUrl,
}: ProviderSelectorProps) {
  const activeTab = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);

  const activeProvider: ProviderType = activeTab === 'github' ? 'github' : 'local';
  const activeIndex = TABS.findIndex((t) => t.id === activeProvider);

  // Sliding pill indicator state
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });

  const updatePill = useCallback(() => {
    const activeEl = tabRefs.current[activeIndex];
    if (activeEl) {
      const parent = activeEl.parentElement;
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        const activeRect = activeEl.getBoundingClientRect();
        setPillStyle({
          left: activeRect.left - parentRect.left,
          width: activeRect.width,
          ready: true,
        });
      }
    }
  }, [activeIndex]);

  useEffect(() => {
    updatePill();
    // Recalculate on resize
    const observer = new ResizeObserver(updatePill);
    const parent = tabRefs.current[0]?.parentElement;
    if (parent) observer.observe(parent);
    return () => observer.disconnect();
  }, [updatePill]);

  const handleProviderChange = (provider: ProviderType) => {
    const tab: ActiveTab = provider === 'github' ? 'github' : 'local';
    if (tab !== activeTab) {
      setActiveTab(tab);
      onProviderChange?.(provider);
    }
  };

  return (
    <div className="space-y-2">
      {/* Provider tabs with sliding pill */}
      <div className="relative flex rounded-lg bg-surface-sunken p-1">
        {/* Sliding pill indicator */}
        <div
          className={cn(
            'absolute top-1 h-[calc(100%-8px)] rounded-md bg-surface shadow-raised transition-all duration-200 ease-out',
            !pillStyle.ready && 'opacity-0',
            pillStyle.ready && 'opacity-100'
          )}
          style={{
            left: pillStyle.left,
            width: pillStyle.width,
          }}
        />

        {TABS.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            onClick={() => handleProviderChange(tab.id)}
            disabled={disabled}
            data-testid={tab.testId}
            className={cn(
              'relative z-10 flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors duration-150 min-h-[32px] touch-manipulation rounded-md',
              activeProvider === tab.id ? 'text-content' : 'text-content-muted hover:text-content',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Provider form */}
      <div className="rounded-lg border border-stroke bg-surface p-2.5">
        {activeProvider === 'github' ? (
          <GitHubForm
            onSubmit={onGitHubSubmit}
            disabled={disabled}
            initialUrl={initialUrl}
            autoSubmitUrl={autoSubmitUrl}
          />
        ) : (
          <LocalForm
            onDirectorySelected={onLocalDirectorySubmit}
            onZipSelected={onLocalZipSubmit}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  );
}
