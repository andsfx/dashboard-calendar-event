// Rate Limiting Constants
export const RATE_LIMIT_KEY = 'mmb-admin-rate-limit';
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCK_DURATION_MS = 30_000; // 30 seconds

// Search & Debounce
export const SEARCH_DEBOUNCE_MS = 250;

// Input Length Limits
export const INPUT_LIMITS = {
  ACARA: 150,
  EO: 100,
  LOKASI: 100,
  KETERANGAN: 500,
  JAM: 20,
  PASSWORD: 100,
  SEARCH_QUERY: 100,
} as const;

// Event Status Order for Sorting
export const STATUS_ORDER = {
  ongoing: 0,
  upcoming: 1,
  past: 2,
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  EVENTS: 'mmb-events-v3',
  DARK_MODE: 'mmb-dark-mode',
} as const;

// Animation Durations (ms)
export const ANIMATION_DURATIONS = {
  SHAKE: 500,
  SAVE_FEEDBACK: 300,
} as const;
