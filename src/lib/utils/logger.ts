/**
 * Structured logger utility for repo2txt extension
 * - Supports debug/info/warn/error levels
 * - Sanitizes sensitive data (tokens, auth headers) in production
 * - Silences debug logs entirely in production builds
 */

const IS_PRODUCTION = import.meta.env.PROD;

/**
 * Remove sensitive data from log messages:
 * - GitHub PAT tokens (40+ hex chars after "token")
 * - Bearer tokens
 * - Authorization headers with token values
 */
function sanitize(message: string): string {
  return message
    .replace(/token\s+[a-f0-9]{40,}/gi, 'token [REDACTED]')
    .replace(/Bearer\s+[a-f0-9]{40,}/gi, 'Bearer [REDACTED]')
    .replace(/Authorization:\s*token\s+\S+/gi, 'Authorization: token [REDACTED]');
}

function sanitizeArg(arg: unknown): unknown {
  if (typeof arg === 'string') {
    return sanitize(arg);
  }
  return arg;
}

export const logger = {
  debug: (prefix: string, ...args: unknown[]) => {
    if (!IS_PRODUCTION) {
      console.debug(`[${prefix}]`, ...args.map(sanitizeArg));
    }
  },

  info: (prefix: string, ...args: unknown[]) => {
    console.info(`[${prefix}]`, ...args.map(sanitizeArg));
  },

  warn: (prefix: string, ...args: unknown[]) => {
    console.warn(`[${prefix}]`, ...args.map(sanitizeArg));
  },

  error: (prefix: string, ...args: unknown[]) => {
    console.error(`[${prefix}]`, ...args.map(sanitizeArg));
  },
};
