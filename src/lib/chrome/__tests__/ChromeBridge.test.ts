import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChromeBridge } from '../ChromeBridge';
import type { ProcessingState } from '../ProcessingState';

describe('ChromeBridge', () => {
  let mockStorage: Map<string, unknown>;
  let localStorage: Map<string, unknown>;
  let mockChrome: {
    storage: {
      session: {
        set: (items: Record<string, unknown>) => Promise<void>;
        get: (key: string) => Promise<Record<string, unknown>>;
        remove: (key: string) => Promise<void>;
      };
      local: {
        set: (items: Record<string, unknown>) => Promise<void>;
        get: (key: string) => Promise<Record<string, unknown>>;
        remove: (key: string) => Promise<void>;
      };
    };
    action: {
      setBadgeText: (details: { text: string }) => Promise<void>;
      setBadgeBackgroundColor: (details: { color: string }) => Promise<void>;
    };
  };

  beforeEach(() => {
    mockStorage = new Map();
    localStorage = new Map();
    mockChrome = {
      storage: {
        session: {
          set: vi.fn(async (items: Record<string, unknown>) => {
            Object.entries(items).forEach(([key, value]) => {
              mockStorage.set(key, value);
            });
          }),
          get: vi.fn(async (key: string) => {
            const result: Record<string, unknown> = {};
            if (mockStorage.has(key)) {
              result[key] = mockStorage.get(key);
            }
            return result;
          }),
          remove: vi.fn(async (key: string) => {
            mockStorage.delete(key);
          }),
        },
        local: {
          set: vi.fn(async (items: Record<string, unknown>) => {
            Object.entries(items).forEach(([key, value]) => {
              localStorage.set(key, value);
            });
          }),
          get: vi.fn(async (key: string) => {
            const result: Record<string, unknown> = {};
            if (localStorage.has(key)) {
              result[key] = localStorage.get(key);
            }
            return result;
          }),
          remove: vi.fn(async (key: string) => {
            localStorage.delete(key);
          }),
        },
      },
      action: {
        setBadgeText: vi.fn(async () => {}),
        setBadgeBackgroundColor: vi.fn(async () => {}),
      },
    };
    vi.stubGlobal('chrome', mockChrome);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ==========================================================================
  // ProcessingState Tests
  // ==========================================================================

  describe('setProcessingState', () => {
    it('should write state to chrome.storage.session', async () => {
      const state: ProcessingState = {
        repoUrl: 'https://github.com/test/repo',
        status: 'loading',
        timestamp: Date.now(),
      };

      await ChromeBridge.setProcessingState(state);

      expect(mockChrome.storage.session.set).toHaveBeenCalledWith({
        processingState: state,
      });
      expect(mockStorage.get('processingState')).toEqual(state);
    });

    it('should resolve without error when chrome is undefined', async () => {
      vi.unstubAllGlobals();
      vi.stubGlobal('chrome', undefined);

      const state: ProcessingState = {
        repoUrl: 'https://github.com/test/repo',
        status: 'loading',
        timestamp: Date.now(),
      };

      await expect(ChromeBridge.setProcessingState(state)).resolves.toBeUndefined();
    });

    it('should resolve without error when chrome.storage is undefined', async () => {
      vi.unstubAllGlobals();
      vi.stubGlobal('chrome', {});

      const state: ProcessingState = {
        repoUrl: 'https://github.com/test/repo',
        status: 'loading',
        timestamp: Date.now(),
      };

      await expect(ChromeBridge.setProcessingState(state)).resolves.toBeUndefined();
    });
  });

  describe('getProcessingState', () => {
    it('should read state from chrome.storage.session', async () => {
      const state: ProcessingState = {
        repoUrl: 'https://github.com/test/repo',
        status: 'loaded',
        timestamp: Date.now(),
      };
      mockStorage.set('processingState', state);

      const result = await ChromeBridge.getProcessingState();

      expect(mockChrome.storage.session.get).toHaveBeenCalledWith('processingState');
      expect(result).toEqual(state);
    });

    it('should return null when no state exists', async () => {
      const result = await ChromeBridge.getProcessingState();

      expect(result).toBeNull();
    });

    it('should return null when chrome is undefined', async () => {
      vi.unstubAllGlobals();
      vi.stubGlobal('chrome', undefined);

      const result = await ChromeBridge.getProcessingState();

      expect(result).toBeNull();
    });
  });

  describe('clearProcessingState', () => {
    it('should remove state from chrome.storage.session', async () => {
      const state: ProcessingState = {
        repoUrl: 'https://github.com/test/repo',
        status: 'loaded',
        timestamp: Date.now(),
      };
      mockStorage.set('processingState', state);

      await ChromeBridge.clearProcessingState();

      expect(mockChrome.storage.session.remove).toHaveBeenCalledWith('processingState');
      expect(mockStorage.has('processingState')).toBe(false);
    });

    it('should resolve without error when chrome is undefined', async () => {
      vi.unstubAllGlobals();
      vi.stubGlobal('chrome', undefined);

      await expect(ChromeBridge.clearProcessingState()).resolves.toBeUndefined();
    });
  });

  describe('updateProcessingStatus', () => {
    it('should update status field while preserving other fields', async () => {
      const initialState: ProcessingState = {
        repoUrl: 'https://github.com/test/repo',
        status: 'loading',
        timestamp: 1000,
      };
      mockStorage.set('processingState', initialState);

      await ChromeBridge.updateProcessingStatus('generating');

      const updatedState = mockStorage.get('processingState') as ProcessingState;
      expect(updatedState.status).toBe('generating');
      expect(updatedState.repoUrl).toBe('https://github.com/test/repo');
      expect(updatedState.timestamp).toBeGreaterThan(1000);
    });

    it('should not throw when no state exists', async () => {
      await expect(ChromeBridge.updateProcessingStatus('generating')).resolves.toBeUndefined();
      expect(mockStorage.has('processingState')).toBe(false);
    });
  });

  describe('round-trip operations', () => {
    it('should support full workflow: loading -> generating -> loaded -> clear', async () => {
      const repoUrl = 'https://github.com/test/repo';

      await ChromeBridge.setProcessingState({ repoUrl, status: 'loading', timestamp: Date.now() });
      let state = await ChromeBridge.getProcessingState();
      expect(state?.status).toBe('loading');

      await ChromeBridge.updateProcessingStatus('generating');
      state = await ChromeBridge.getProcessingState();
      expect(state?.status).toBe('generating');

      await ChromeBridge.updateProcessingStatus('loaded');
      state = await ChromeBridge.getProcessingState();
      expect(state?.status).toBe('loaded');

      await ChromeBridge.clearProcessingState();
      state = await ChromeBridge.getProcessingState();
      expect(state).toBeNull();
    });
  });

  // ==========================================================================
  // Local Storage Tests
  // ==========================================================================

  describe('setLocalStorage', () => {
    it('should write value to chrome.storage.local', async () => {
      await ChromeBridge.setLocalStorage('test-key', { foo: 'bar' });

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ 'test-key': { foo: 'bar' } });
      expect(localStorage.get('test-key')).toEqual({ foo: 'bar' });
    });

    it('should fall back to localStorage when chrome is unavailable', async () => {
      vi.unstubAllGlobals();
      vi.stubGlobal('chrome', undefined);

      await ChromeBridge.setLocalStorage('test-key', { foo: 'bar' });

      expect(window.localStorage.getItem('test-key')).toBe(JSON.stringify({ foo: 'bar' }));
      window.localStorage.removeItem('test-key');
    });
  });

  describe('getLocalStorage', () => {
    it('should read value from chrome.storage.local', async () => {
      localStorage.set('test-key', { foo: 'bar' });

      const result = await ChromeBridge.getLocalStorage<Record<string, string>>('test-key');

      expect(result).toEqual({ foo: 'bar' });
    });

    it('should return null when key does not exist', async () => {
      const result = await ChromeBridge.getLocalStorage('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when chrome is undefined', async () => {
      vi.unstubAllGlobals();
      vi.stubGlobal('chrome', undefined);
      // Clear any data left by previous tests in window.localStorage
      window.localStorage.removeItem('test-key');

      const result = await ChromeBridge.getLocalStorage('test-key');

      expect(result).toBeNull();
    });
  });

  describe('removeLocalStorage', () => {
    it('should remove key from chrome.storage.local', async () => {
      localStorage.set('test-key', 'value');

      await ChromeBridge.removeLocalStorage('test-key');

      expect(mockChrome.storage.local.remove).toHaveBeenCalledWith('test-key');
      expect(localStorage.has('test-key')).toBe(false);
    });

    it('should fall back to localStorage.removeItem when chrome is unavailable', async () => {
      vi.unstubAllGlobals();
      vi.stubGlobal('chrome', undefined);
      // Pre-populate localStorage so removeItem has something to remove
      window.localStorage.setItem('test-key', 'value');

      await ChromeBridge.removeLocalStorage('test-key');

      expect(window.localStorage.getItem('test-key')).toBeNull();
    });
  });

  // ==========================================================================
  // Badge Tests
  // ==========================================================================

  describe('setBadge', () => {
    it('should set badge text and color', async () => {
      await ChromeBridge.setBadge('1');

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '1' });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#4F46E5' });
    });

    it('should set badge with custom color', async () => {
      await ChromeBridge.setBadge('5', '#FF0000');

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '5' });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#FF0000' });
    });

    it('should not set background color when text is empty', async () => {
      await ChromeBridge.setBadge('');

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
      expect(mockChrome.action.setBadgeBackgroundColor).not.toHaveBeenCalled();
    });

    it('should be a no-op when chrome.action is undefined', async () => {
      vi.unstubAllGlobals();
      vi.stubGlobal('chrome', { storage: { session: {}, local: {} } });

      await expect(ChromeBridge.setBadge('1')).resolves.toBeUndefined();
    });
  });

  describe('clearBadge', () => {
    it('should clear badge text', async () => {
      await ChromeBridge.clearBadge();

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });

    it('should be a no-op when chrome.action is undefined', async () => {
      vi.unstubAllGlobals();
      vi.stubGlobal('chrome', { storage: { session: {}, local: {} } });

      await expect(ChromeBridge.clearBadge()).resolves.toBeUndefined();
    });
  });
});
