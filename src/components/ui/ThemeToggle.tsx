import { useTheme } from '@/hooks/useTheme';
import { Button } from './Button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    if (theme === 'light') {
      return (
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4 text-gray-600 dark:text-gray-400"
          data-testid="theme-icon"
        >
          <circle cx="10" cy="10" r="4" />
          <line
            x1="10"
            y1="1"
            x2="10"
            y2="3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="10"
            y1="16.5"
            x2="10"
            y2="19"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="1"
            y1="10"
            x2="3.5"
            y2="10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="16.5"
            y1="10"
            x2="19"
            y2="10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="3.5"
            y1="3.5"
            x2="5.3"
            y2="5.3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="14.7"
            y1="14.7"
            x2="16.5"
            y2="16.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="3.5"
            y1="16.5"
            x2="5.3"
            y2="14.7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="14.7"
            y1="5.3"
            x2="16.5"
            y2="3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    }
    if (theme === 'dark') {
      return (
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4 text-gray-600 dark:text-gray-400"
          data-testid="theme-icon"
        >
          <path d="M14.5 12.5a6 6 0 0 1-7-7 6 6 0 1 0 7 7z" />
        </svg>
      );
    }
    return (
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4 text-gray-600 dark:text-gray-400"
        data-testid="theme-icon"
      >
        <rect x="3" y="4" width="14" height="10" rx="1.5" />
        <line
          x1="7"
          y1="16"
          x2="13"
          y2="16"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="10"
          y1="14"
          x2="10"
          y2="16"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  };

  const getLabel = () => {
    if (theme === 'light') return 'Light';
    if (theme === 'dark') return 'Dark';
    return 'System';
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      title={`Current theme: ${getLabel()}`}
      aria-label={`Switch theme (current: ${getLabel()})`}
      data-testid="theme-toggle"
    >
      {getIcon()}
    </Button>
  );
}
