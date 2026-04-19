/**
 * GitHub authentication component
 * Handles Personal Access Token input with secure storage
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useStore } from '@/store';

export function GitHubAuth() {
  const { setCredentials, setPAT, clearPAT } = useStore();
  const [token, setToken] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [showToken, setShowToken] = useState(false);

 // Load saved token from Zustand store on mount
 useEffect(() => {
 const { pat } = useStore.getState();
 if (pat) {
 setToken(pat);
 setCredentials({ token: pat });
 }
 }, [setCredentials]);

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newToken = e.target.value;
    setToken(newToken);

 // Save to store
 if (newToken) {
 setCredentials({ token: newToken });
 setPAT(newToken);
 } else {
 setCredentials({ token: undefined });
 clearPAT();
 }
  };

 const handleClearToken = () => {
 setToken('');
 setCredentials({ token: undefined });
 clearPAT();
 };

  return (
    <div className="space-y-1.5">
      <label
        htmlFor="github-token"
        className="flex items-center text-xs font-medium text-gray-700 dark:text-gray-300"
      >
        Personal Access Token
        <span className="ml-1 text-gray-500 dark:text-gray-400">(optional)</span>
        <button
          type="button"
          onClick={() => setShowInfo(!showInfo)}
          className="ml-1.5 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
          aria-label="Toggle token information"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            {showInfo ? (
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            ) : (
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            )}
          </svg>
        </button>
      </label>

      {showInfo && (
        <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-2 text-xs">
 <p className="text-blue-800 dark:text-blue-200 mb-1">
 Required for private repos & higher rate limits. For private repos, you can also use session mode (no token needed if you're logged into GitHub in your browser).
 </p>
          <a
            href="https://github.com/settings/tokens/new?description=repo2txt-extension&scopes=repo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
            </svg>
            Get token
          </a>
        </div>
      )}

      <div className="flex gap-1.5">
        <input
          type={showToken ? 'text' : 'password'}
          id="github-token"
          value={token}
          onChange={handleTokenChange}
          placeholder="ghp_..."
          className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
        />
        {token && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowToken(!showToken)}
            title={showToken ? 'Hide token' : 'Show token'}
            className="px-2 py-1.5 h-auto"
          >
            {showToken ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </Button>
        )}
        {token && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClearToken}
            title="Clear token"
            className="px-2 py-1.5 h-auto"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </Button>
        )}
      </div>

      {token && (
        <p className="text-[10px] text-green-600 dark:text-green-400 flex items-center">
          <svg className="w-2.5 h-2.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          Token saved
        </p>
      )}
    </div>
  );
}
