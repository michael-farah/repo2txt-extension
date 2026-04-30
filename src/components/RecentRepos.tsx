/**
 * RecentRepos component
 * Displays recently loaded repositories as clickable chips/tags
 */

import { cn } from '@/lib/utils';

interface RecentRepo {
  url: string;
  name: string;
  timestamp: number;
}

interface RecentReposProps {
  repos: RecentRepo[];
  onSelect: (url: string) => void;
  onRemove: (url: string) => void;
  currentUrl?: string;
}

export function RecentRepos({ repos, onSelect, onRemove, currentUrl }: RecentReposProps) {
  if (repos.length === 0) {
    return null;
  }

  const truncateName = (name: string, maxLength: number = 20): string => {
    if (name.length <= maxLength) return name;
    return name.slice(0, maxLength - 1) + '…';
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Clock icon + label */}
      <div className="flex items-center gap-1 shrink-0">
        <svg
          className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-xs text-gray-500 dark:text-gray-400">Recent</span>
      </div>

      {/* Repo chips */}
      {repos.map((repo, index) => {
        const isActive = repo.url === currentUrl;

        return (
          <div
            key={repo.url}
            className={cn(
              'group relative inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs border transition-all',
              'animate-fade-in',
              isActive
                ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 border-primary-300 dark:border-primary-700'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Repo name button */}
            <button
              onClick={() => onSelect(repo.url)}
              className="font-medium truncate max-w-[120px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 rounded"
              aria-label={`Switch to ${repo.name}`}
              title={repo.name}
            >
              {truncateName(repo.name)}
            </button>

            {/* Remove button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(repo.url);
              }}
              className={cn(
                'ml-0.5 -mr-1 p-0.5 rounded-full transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                'opacity-40 group-hover:opacity-100',
                isActive
                  ? 'text-primary-600 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-800'
                  : 'text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
              aria-label={`Remove ${repo.name} from recent`}
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
