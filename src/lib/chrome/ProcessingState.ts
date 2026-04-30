export interface ProcessingState {
  repoUrl: string;
  status: 'loading' | 'loaded' | 'generating';
  timestamp: number;
}
