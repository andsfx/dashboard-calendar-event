/**
 * Logger utility to replace console statements
 * Provides environment-aware logging with proper levels
 */

const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

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
   * Log errors (all environments)
   */
  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${message}`, error);
    
    // TODO: Send to error tracking service in production
    if (isProd) {
      // Integrate with Sentry, LogRocket, or similar
      // Example: Sentry.captureException(error);
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

/**
 * Usage examples:
 * 
 * logger.info('User logged in', { userId: 123 });
 * logger.warn('API rate limit approaching');
 * logger.error('Failed to fetch events', error);
 * logger.debug('Component rendered', { props });
 */
