import { describe, test, expect, beforeEach, vi } from 'vitest';
import { chromeStorage } from '../chromeStorage';

describe('chromeStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('getItem', () => {
    test('returns null for missing key', async () => {
      expect(await chromeStorage.getItem('missing')).toBeNull();
    });

    test('returns stored value for non-secure key', async () => {
      localStorage.setItem('prefs', 'dark');
      expect(await chromeStorage.getItem('prefs')).toBe('dark');
    });

    test('decrypts value for key containing "secure"', async () => {
      await chromeStorage.setItem('secure-token', 'secret123');
      expect(await chromeStorage.getItem('secure-token')).toBe('secret123');
    });
  });

  describe('setItem', () => {
    test('stores value directly for non-secure key', async () => {
      await chromeStorage.setItem('theme', 'dark');
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    test('encrypts value for key containing "secure"', async () => {
      await chromeStorage.setItem('secure-pat', 'ghp_abc123');
      const stored = localStorage.getItem('secure-pat');
      expect(stored).not.toBe('ghp_abc123');
      expect(stored).toMatch(/^[A-Za-z0-9+/=]+$/);
    });
  });

  describe('removeItem', () => {
    test('removes key from localStorage', async () => {
      localStorage.setItem('key', 'value');
      await chromeStorage.removeItem('key');
      expect(localStorage.getItem('key')).toBeNull();
    });

    test('does not throw for missing key', async () => {
      await expect(chromeStorage.removeItem('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('encryption roundtrip', () => {
    test('secure key survives set+get', async () => {
      await chromeStorage.setItem('secure-data', 'my-token');
      expect(await chromeStorage.getItem('secure-data')).toBe('my-token');
    });

    test('multiple secure keys are independent', async () => {
      await chromeStorage.setItem('secure-a', 'val-a');
      await chromeStorage.setItem('secure-b', 'val-b');
      expect(await chromeStorage.getItem('secure-a')).toBe('val-a');
      expect(await chromeStorage.getItem('secure-b')).toBe('val-b');
    });

    test('secure key with special characters', async () => {
      const special = 'p@$$w0rd!#"\'\\`~';
      await chromeStorage.setItem('secure-chars', special);
      expect(await chromeStorage.getItem('secure-chars')).toBe(special);
    });

    test('secure key with unicode', async () => {
      const unicode = '日本語テスト🔑';
      await chromeStorage.setItem('secure-unicode', unicode);
      expect(await chromeStorage.getItem('secure-unicode')).toBe(unicode);
    });

    test('secure key with empty string', async () => {
      await chromeStorage.setItem('secure-empty', '');
      expect(await chromeStorage.getItem('secure-empty')).toBe('');
    });
  });
});
