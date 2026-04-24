import { useStore, type ActiveTab } from '@/store';
import { DirectoryPicker } from './DirectoryPicker';
import { ZipUploader } from './ZipUploader';

import type { FileSystemDirectoryHandle } from '@/types';

interface LocalFormProps {
  onDirectorySelected?: (files: FileList | FileSystemDirectoryHandle) => void;
  onZipSelected?: (file: File) => void;
  disabled?: boolean;
}

export function LocalForm({
  onDirectorySelected,
  onZipSelected,
  disabled,
}: LocalFormProps) {
  const activeTab = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);

  const localTab = activeTab === 'zip' ? 'zip' : 'directory';

  const handleTabChange = (tab: 'directory' | 'zip') => {
    if (tab !== localTab) {
      setActiveTab(tab as ActiveTab);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab selector */}
      <div className="flex space-x-1 rounded-lg bg-surface-sunken p-1">
        <button
          onClick={() => handleTabChange('directory')}
          data-testid="local-tab-directory"
          className={`
          flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.98] transition-transform duration-100
          ${
            localTab === 'directory'
            ? 'bg-surface shadow text-content'
            : 'text-content-muted hover:text-content'
          }
        `}
        >
          <svg
            className="inline w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          Directory
        </button>
        <button
          onClick={() => handleTabChange('zip')}
          data-testid="local-tab-zip"
          className={`
          flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.98] transition-transform duration-100
          ${
            localTab === 'zip'
            ? 'bg-surface shadow text-content'
            : 'text-content-muted hover:text-content'
          }
        `}
        >
          <svg
            className="inline w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          Zip File
        </button>
      </div>

      {/* Tab content */}
      <div>
        {localTab === 'directory' ? (
          <DirectoryPicker onDirectorySelected={onDirectorySelected} disabled={disabled} />
        ) : (
          <ZipUploader onFileSelected={onZipSelected} disabled={disabled} />
        )}
      </div>
    </div>
  );
}
