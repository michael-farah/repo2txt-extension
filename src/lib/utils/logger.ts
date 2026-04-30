/**
 * Structured logger with production sanitization
 * Strips sensitive data (tokens, credentials) from log output
 * Debug logs are suppressed in production
 */

const IS_PRODUCTION = import.meta.env.PROD;

type _LogLevel = 'debug' | 'info' | 'warn' | 'error';

function sanitize(message: string): string {
  // Remove GitHub tokens from log messages
  return message
    .replace(/token\s+[a-f0-9]{40,}/gi, 'token [REDACTED]')
    .replace(/Bearer\s+[a-f0-9]{40,}/gi, 'Bearer [REDACTED]')
    .replace(/Authorization:\s*token\s+\S+/gi, 'Authorization: token [REDACTED]');
}

export const logger = {
  debug: (prefix: string, ...args: unknown[]) => {
    if (!IS_PRODUCTION) {
      console.debug(`[${prefix}]`, ...args.map((a) => (typeof a === 'string' ? sanitize(a) : a)));
    }
  },

  info: (prefix: string, ...args: unknown[]) => {
    console.info(`[${prefix}]`, ...args.map((a) => (typeof a === 'string' ? sanitize(a) : a)));
  },

  warn: (prefix: string, ...args: unknown[]) => {
    console.warn(`[${prefix}]`, ...args.map((a) => (typeof a === 'string' ? sanitize(a) : a)));
  },

  error: (prefix: string, ...args: unknown[]) => {
    console.error(`[${prefix}]`, ...args.map((a) => (typeof a === 'string' ? sanitize(a) : a)));
  },
};
