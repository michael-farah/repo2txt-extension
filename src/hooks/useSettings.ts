import { useStore } from '@/store';

export function useSettings() {
  const {
    showGitHubButton,
    showTokenCount,
    showLineCount,
    autoExpandDirectories,
    setShowGitHubButton,
    setShowTokenCount,
    setShowLineCount,
    setAutoExpandDirectories,
  } = useStore();

  return {
    showGitHubButton,
    showTokenCount,
    showLineCount,
    autoExpandDirectories,
    setShowGitHubButton,
    setShowTokenCount,
    setShowLineCount,
    setAutoExpandDirectories,
  };
}
