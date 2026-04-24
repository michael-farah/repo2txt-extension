/**
 * Token count warning banner
 * Alerts when output exceeds common LLM context windows
 */

import { getTokenWarningLevel, getExceededLimits, formatTokenCount } from '@/lib/utils/contextLimits';

interface TokenWarningProps {
  tokenCount: number;
}

export function TokenWarning({ tokenCount }: TokenWarningProps) {
  const level = getTokenWarningLevel(tokenCount);
  const exceeded = getExceededLimits(tokenCount);

  if (level === 'none') return null;

  const styles: Record<string, string> = {
    caution:
      'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
    warning:
      'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200',
    danger:
      'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
  };

  const icons: Record<string, string> = {
    caution: '⚠',
    warning: '⚡',
    danger: '🚫',
  };

  // Show top 3 exceeded models
  const modelNames = exceeded
    .slice(0, 3)
    .map((l) => l.model)
    .join(', ');
  const moreCount = exceeded.length > 3 ? exceeded.length - 3 : 0;

  return (
    <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${styles[level]}`}>
      <span className="text-sm leading-none mt-0.5" role="img" aria-label="Warning">
        {icons[level]}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium">
          {formatTokenCount(tokenCount)} tokens may exceed context limits
        </p>
        <p className="mt-0.5 opacity-80">
          Exceeds: {modelNames}
          {moreCount > 0 && ` +${moreCount} more`}
        </p>
      </div>
    </div>
  );
}
