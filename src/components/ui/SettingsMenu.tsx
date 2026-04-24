import { useState, useRef, useEffect, useCallback } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface ToggleSettingProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleSetting({ label, description, checked, onChange }: ToggleSettingProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
 className="flex items-center justify-between w-full gap-3 rounded-md px-2 py-2 transition-colors hover:bg-surface-raised cursor-pointer"
    >
      <div className="flex flex-col items-start min-w-0">
 <span className="text-sm font-medium text-content">
          {label}
        </span>
        {description && (
 <span className="text-xs text-content-muted leading-tight mt-0.5">
            {description}
          </span>
        )}
      </div>
      <span
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ease-in-out',
          checked
            ? 'bg-primary-600 dark:bg-primary-500'
 : 'bg-gray-300 dark:bg-gray-600'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out',
            'translate-y-0.5',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          )}
        />
      </span>
    </button>
  );
}

export function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    showGitHubButton,
    showTokenCount,
    showLineCount,
    autoExpandDirectories,
    setShowGitHubButton,
    setShowTokenCount,
    setShowLineCount,
    setAutoExpandDirectories,
  } = useSettings();

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        close();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, close]);

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Settings"
        aria-expanded={isOpen}
        aria-haspopup="true"
        data-testid="settings-menu-button"
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={cn(
 'w-4 h-4 text-content-muted transition-transform duration-300',
            isOpen && 'rotate-90'
          )}
        >
          <path
            fillRule="evenodd"
            d="M8.34 1.804A1 1 0 019.32 1h1.36a1 1 0 01.98.804l.295 1.453c.497.181.964.413 1.394.693l1.4-.627a1 1 0 011.206.384l.68 1.177a1 1 0 01-.274 1.32l-1.1.835c.064.52.064 1.044 0 1.563l1.1.835a1 1 0 01.274 1.32l-.68 1.177a1 1 0 01-1.206.384l-1.4-.627c-.43.28-.897.512-1.394.693l-.295 1.453a1 1 0 01-.98.804H9.32a1 1 0 01-.98-.804l-.295-1.453a5.93 5.93 0 01-1.394-.693l-1.4.627a1 1 0 01-1.206-.384l-.68-1.177a1 1 0 01.274-1.32l1.1-.835a5.935 5.935 0 010-1.563l-1.1-.835a1 1 0 01-.274-1.32l.68-1.177a1 1 0 011.206-.384l1.4.627c.43-.28.897-.512 1.394-.693l.295-1.453zM10 13a3 3 0 100-6 3 3 0 000 6z"
            clipRule="evenodd"
          />
        </svg>
      </Button>

      <div
        ref={menuRef}
        role="menu"
        aria-label="Settings"
        className={cn(
 'absolute right-0 top-full mt-1.5 w-72 rounded-lg border border-stroke-subtle',
 'bg-surface shadow-float z-50',
          'origin-top-right transition-all duration-200 ease-out',
          isOpen
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
        )}
      >
        <div className="px-3 pt-3 pb-1">
 <h3 className="text-xs font-semibold uppercase tracking-wider text-content-muted">
            Settings
          </h3>
        </div>

 <div className="mx-3 border-t border-stroke-subtle" />

        <div className="p-2 space-y-0.5">
          <ToggleSetting
            label="GitHub Button"
            description="Show Convert to Text on GitHub pages"
            checked={showGitHubButton}
            onChange={setShowGitHubButton}
          />
          <ToggleSetting
            label="Token Count"
            description="Display token count in output"
            checked={showTokenCount}
            onChange={setShowTokenCount}
          />
          <ToggleSetting
            label="Line Count"
            description="Display line count in output"
            checked={showLineCount}
            onChange={setShowLineCount}
          />
          <ToggleSetting
            label="Auto-Expand Dirs"
            description="Expand directories on load"
            checked={autoExpandDirectories}
            onChange={setAutoExpandDirectories}
          />
        </div>
      </div>
    </div>
  );
}
