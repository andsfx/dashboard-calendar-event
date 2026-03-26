import { RATE_LIMIT_KEY, MAX_LOGIN_ATTEMPTS, LOCK_DURATION_MS } from '../constants';

interface RateLimitState {
  failedAttempts: number;
  lockUntil: number | null;
  lastAttempt: number;
}

export function getRateLimitState(): RateLimitState {
  try {
    const stored = localStorage.getItem(RATE_LIMIT_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as RateLimitState;
      // Reset jika sudah expired
      if (parsed.lockUntil && Date.now() > parsed.lockUntil) {
        return { failedAttempts: 0, lockUntil: null, lastAttempt: Date.now() };
      }
      return parsed;
    }
  } catch {
    // Ignore parse errors
  }
  return { failedAttempts: 0, lockUntil: null, lastAttempt: Date.now() };
}

export function saveRateLimitState(state: RateLimitState): void {
  try {
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(state));
  } catch {
    // Ignore write errors
  }
}

export function recordFailedAttempt(): RateLimitState {
  const current = getRateLimitState();
  const newAttempts = current.failedAttempts + 1;
  
  const newState: RateLimitState = {
    failedAttempts: newAttempts,
    lockUntil: newAttempts >= MAX_LOGIN_ATTEMPTS ? Date.now() + LOCK_DURATION_MS : current.lockUntil,
    lastAttempt: Date.now(),
  };
  
  saveRateLimitState(newState);
  return newState;
}

export function resetRateLimit(): void {
  saveRateLimitState({ failedAttempts: 0, lockUntil: null, lastAttempt: Date.now() });
}

export function isRateLimited(): { limited: boolean; remainingSec: number } {
  const state = getRateLimitState();
  if (state.lockUntil && Date.now() < state.lockUntil) {
    return { 
      limited: true, 
      remainingSec: Math.ceil((state.lockUntil - Date.now()) / 1000) 
    };
  }
  return { limited: false, remainingSec: 0 };
}
