import { describe, test, expect } from 'vitest';
import {
  CONTEXT_LIMITS,
  getExceededLimits,
  getTokenWarningLevel,
  formatTokenCount,
} from '../contextLimits';

describe('CONTEXT_LIMITS', () => {
  test('contains expected model limits', () => {
    expect(CONTEXT_LIMITS).toHaveLength(8);

    const models = CONTEXT_LIMITS.map((l) => l.model);
    expect(models).toContain('GPT-4o');
    expect(models).toContain('GPT-4o mini');
    expect(models).toContain('Claude 3.5 Sonnet');
    expect(models).toContain('Claude 3 Opus');
    expect(models).toContain('Gemini 1.5 Pro');
    expect(models).toContain('Gemini 1.5 Flash');
    expect(models).toContain('GPT-3.5 Turbo');
    expect(models).toContain('Llama 3 70B');
  });

  test('has correct token limits', () => {
    const limits = CONTEXT_LIMITS.reduce(
      (acc, curr) => {
        acc[curr.model] = curr.tokens;
        return acc;
      },
      {} as Record<string, number>
    );

    expect(limits['GPT-4o']).toBe(128_000);
    expect(limits['GPT-4o mini']).toBe(128_000);
    expect(limits['Claude 3.5 Sonnet']).toBe(200_000);
    expect(limits['Claude 3 Opus']).toBe(200_000);
    expect(limits['Gemini 1.5 Pro']).toBe(1_000_000);
    expect(limits['Gemini 1.5 Flash']).toBe(1_000_000);
    expect(limits['GPT-3.5 Turbo']).toBe(16_385);
    expect(limits['Llama 3 70B']).toBe(8_192);
  });
});

describe('getExceededLimits', () => {
  test('returns empty array for 0 tokens', () => {
    const exceeded = getExceededLimits(0);
    expect(exceeded).toEqual([]);
    expect(exceeded).toHaveLength(0);
  });

  test('returns empty array for small token counts', () => {
    expect(getExceededLimits(100)).toEqual([]);
    expect(getExceededLimits(1000)).toEqual([]);
    expect(getExceededLimits(5000)).toEqual([]);
    expect(getExceededLimits(8000)).toEqual([]);
  });

  test('returns models with < 200K context for 200000 tokens', () => {
    const exceeded = getExceededLimits(200_000);
    const models = exceeded.map((l) => l.model);

    // Should exceed all models with < 200K context
    expect(models).toContain('GPT-4o');
    expect(models).toContain('GPT-4o mini');
    expect(models).toContain('GPT-3.5 Turbo');
    expect(models).toContain('Llama 3 70B');

    // Should NOT exceed 200K models
    expect(models).not.toContain('Claude 3.5 Sonnet');
    expect(models).not.toContain('Claude 3 Opus');
    expect(models).not.toContain('Gemini 1.5 Pro');
    expect(models).not.toContain('Gemini 1.5 Flash');
  });

  test('returns all models for very large token counts', () => {
    const exceeded = getExceededLimits(2_000_000);
    expect(exceeded).toHaveLength(CONTEXT_LIMITS.length);
    expect(exceeded.map((l) => l.model)).toEqual(
      expect.arrayContaining(CONTEXT_LIMITS.map((l) => l.model))
    );
  });

  test('returns correct models for 128K tokens', () => {
    const exceeded = getExceededLimits(128_000);
    const models = exceeded.map((l) => l.model);

    // Should exceed smaller models
    expect(models).toContain('GPT-3.5 Turbo');
    expect(models).toContain('Llama 3 70B');

    // Should NOT exceed 128K models
    expect(models).not.toContain('GPT-4o');
    expect(models).not.toContain('GPT-4o mini');
  });

  test('returns correct models for 16K tokens', () => {
    const exceeded = getExceededLimits(16_385);
    const models = exceeded.map((l) => l.model);

    // Should only exceed Llama 3 70B (8K)
    expect(models).toContain('Llama 3 70B');
    expect(models).not.toContain('GPT-3.5 Turbo');
  });
});

describe('getTokenWarningLevel', () => {
  test("returns 'none' for 0 tokens", () => {
    expect(getTokenWarningLevel(0)).toBe('none');
  });

  test("returns 'none' for small token counts that exceed no limits", () => {
    expect(getTokenWarningLevel(100)).toBe('none');
    expect(getTokenWarningLevel(1000)).toBe('none');
    expect(getTokenWarningLevel(5000)).toBe('none');
  });

  test("returns 'caution' when exceeding at least one limit", () => {
    // Exceeds Llama 3 70B (8K) but not many others
    expect(getTokenWarningLevel(10_000)).toBe('caution');
    expect(getTokenWarningLevel(16_385)).toBe('caution');
  });

  test("returns 'warning' when exceeding more than half of limits", () => {
    // With 8 limits, exceeding 5+ should be 'warning'
    // 200K exceeds 6 limits (all except Gemini 1M models)
    expect(getTokenWarningLevel(200_001)).toBe('warning');
  });

  test("returns 'danger' when exceeding all known limits", () => {
    // 2M exceeds all limits including Gemini's 1M
    expect(getTokenWarningLevel(2_000_000)).toBe('danger');
    expect(getTokenWarningLevel(10_000_000)).toBe('danger');
  });

  test('correctly calculates warning levels at boundary values', () => {
    // Just under Llama limit
    expect(getTokenWarningLevel(8_191)).toBe('none');

    // At Llama limit (exceeds 0, but 8192 > 8192 is false)
    // Actually 8192 > 8192 is false, so it shouldn't exceed
    expect(getTokenWarningLevel(8_192)).toBe('none');

    // Just over Llama limit
    expect(getTokenWarningLevel(8_193)).toBe('caution');
  });
});

describe('formatTokenCount', () => {
  test('formats small numbers as-is', () => {
    expect(formatTokenCount(0)).toBe('0');
    expect(formatTokenCount(42)).toBe('42');
    expect(formatTokenCount(100)).toBe('100');
    expect(formatTokenCount(999)).toBe('999');
  });

  test('formats thousands with K suffix', () => {
    expect(formatTokenCount(1000)).toBe('1.0K');
    expect(formatTokenCount(1500)).toBe('1.5K');
    expect(formatTokenCount(50000)).toBe('50.0K');
    expect(formatTokenCount(999999)).toBe('1000.0K');
  });

  test('formats millions with M suffix', () => {
    expect(formatTokenCount(1_000_000)).toBe('1.0M');
    expect(formatTokenCount(1_200_000)).toBe('1.2M');
    expect(formatTokenCount(1_500_000)).toBe('1.5M');
    expect(formatTokenCount(10_000_000)).toBe('10.0M');
  });

  test('handles edge cases correctly', () => {
    // Boundary between K and M
    expect(formatTokenCount(999_999)).toBe('1000.0K');
    expect(formatTokenCount(1_000_000)).toBe('1.0M');

    // Large numbers
    expect(formatTokenCount(100_000_000)).toBe('100.0M');
    expect(formatTokenCount(1_000_000_000)).toBe('1000.0M');
  });

  test('rounds to one decimal place', () => {
    expect(formatTokenCount(1_234_567)).toBe('1.2M');
    expect(formatTokenCount(1_567_890)).toBe('1.6M');
    expect(formatTokenCount(1234)).toBe('1.2K');
    expect(formatTokenCount(1567)).toBe('1.6K');
  });
});
