/**
 * Token count context window limits
 * Warns users when output exceeds common LLM context windows
 */

/** Known LLM context window sizes (in tokens) */
export const CONTEXT_LIMITS = [
  { model: 'GPT-4o', tokens: 128_000 },
  { model: 'GPT-4o mini', tokens: 128_000 },
  { model: 'Claude 3.5 Sonnet', tokens: 200_000 },
  { model: 'Claude 3 Opus', tokens: 200_000 },
  { model: 'Gemini 1.5 Pro', tokens: 1_000_000 },
  { model: 'Gemini 1.5 Flash', tokens: 1_000_000 },
  { model: 'GPT-3.5 Turbo', tokens: 16_385 },
  { model: 'Llama 3 70B', tokens: 8_192 },
] as const;

export type ContextLimit = (typeof CONTEXT_LIMITS)[number];

/**
 * Get context limits that the token count exceeds
 */
export function getExceededLimits(tokenCount: number): ContextLimit[] {
  return CONTEXT_LIMITS.filter((limit) => tokenCount > limit.tokens);
}

/**
 * Get the warning level for a token count
 */
export function getTokenWarningLevel(
  tokenCount: number
): 'none' | 'caution' | 'warning' | 'danger' {
  if (tokenCount === 0) return 'none';

  const exceeded = getExceededLimits(tokenCount);
  const totalLimits = CONTEXT_LIMITS.length;

  // Exceeds all known limits
  if (exceeded.length === totalLimits) return 'danger';
  // Exceeds more than half
  if (exceeded.length > totalLimits / 2) return 'warning';
  // Exceeds at least one
  if (exceeded.length > 0) return 'caution';

  return 'none';
}

/**
 * Format token count for display (e.g., "1.2M", "500K")
 */
export function formatTokenCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return count.toString();
}
