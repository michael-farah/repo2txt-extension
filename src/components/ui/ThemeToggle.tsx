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
    if (theme === 'light') return '☀️';
    if (theme === 'dark') return '🌙';
    return '💻';
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
      className="gap-1.5 px-2 py-1 h-auto"
      data-testid="theme-toggle"
    >
      <span className="text-sm" data-testid="theme-icon">
        {getIcon()}
      </span>
      <span className="text-xs" data-testid="theme-label">
        {getLabel()}
      </span>
    </Button>
  );
}
