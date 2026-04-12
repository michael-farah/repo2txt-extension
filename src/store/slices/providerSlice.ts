import type { StateCreator } from 'zustand';
import type { ProviderType, ProviderCredentials, RepoMetadata } from '@/types';

export interface ProviderSlice {
  providerType: ProviderType | null;
  credentials: ProviderCredentials | null;
  pat: string | null;
  repoMetadata: RepoMetadata | null;
  repoUrl: string;
  isLoading: boolean;
  error: string | null;

  setProviderType: (type: ProviderType) => void;
  setCredentials: (credentials: ProviderCredentials) => void;
  setPAT: (pat: string | null) => void;
  clearPAT: () => void;
  setRepoMetadata: (metadata: RepoMetadata) => void;
  setRepoUrl: (url: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  providerType: null,
  credentials: null,
  pat: null,
  repoMetadata: null,
  repoUrl: '',
  isLoading: false,
  error: null,
};

export const createProviderSlice: StateCreator<ProviderSlice> = (set) => ({
  ...initialState,

  setProviderType: (type: ProviderType) => set({ providerType: type }),

  setCredentials: (credentials: ProviderCredentials) => {
    set({ credentials });
    // We no longer use sessionStorage here, persistence is handled by Zustand persist middleware
  },

  setPAT: (pat: string | null) => set({ pat }),
  
  clearPAT: () => set({ pat: null }),

  setRepoMetadata: (metadata: RepoMetadata) => set({ repoMetadata: metadata }),

  setRepoUrl: (url: string) => set({ repoUrl: url }),

  setLoading: (isLoading: boolean) => set({ isLoading }),

  setError: (error: string | null) => set({ error }),

  reset: () => {
    set(initialState);
  },
});
