/**
 * Logger utility to replace console statements
 * Provides environment-aware logging with proper levels
 */

const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

type ErrorSink = (message: string, error?: unknown) => void;

function getProdErrorSink(): ErrorSink | null {
  const g = globalThis as { __METMAL_ERROR_SINK__?: ErrorSink };
  if (typeof g.__METMAL_ERROR_SINK__ === 'function') return g.__METMAL_ERROR_SINK__;
  return null;
}

export const logger = {
  /**
   * Log informational messages (development only)
   */
  info: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },

  /**
   * Log warnings (all environments)
   */
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },

  /**
   * Log errors (all environments).
   * Prod: console + optional `globalThis.__METMAL_ERROR_SINK__` (no Sentry dep).
   * Wire sink from bootstrap when DSN ready — e.g. Sentry.captureException.
   */
  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${message}`, error);

    if (!isProd) return;

    const sink = getProdErrorSink();
    if (sink) {
      try {
        sink(message, error);
      } catch {
        /* logger must never throw */
      }
      return;
    }

    // Browser reporting API when available; no third-party SDK installed
    if (typeof reportError === 'function' && error instanceof Error) {
      try {
        reportError(error);
      } catch {
        /* ignore */
      }
    }
  },

  /**
   * Log debug information (development only)
   */
  debug: (message: string, data?: unknown) => {
    if (isDev) {
      console.debug(`[DEBUG] ${message}`, data);
    }
  }
};
