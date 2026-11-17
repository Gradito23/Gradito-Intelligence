export const PV_API_429_MAX_ATTEMPTS = 4;
export const PV_API_429_BACKOFF_MS = [2_000, 5_000, 10_000, 20_000];

/** Delay before retrying a 429; prefers Retry-After seconds when present (capped at 60s). */
export function pvApi429DelayMs(attempt: number, retryAfterHeader: string | null): number {
  let delayMs = PV_API_429_BACKOFF_MS[Math.min(attempt, PV_API_429_BACKOFF_MS.length - 1)];
  if (retryAfterHeader) {
    const sec = Number(retryAfterHeader);
    if (Number.isFinite(sec) && sec > 0) delayMs = Math.min(sec * 1000, 60_000);
  }
  return delayMs;
}

export function isPvApiRateLimited(err: unknown): boolean {
  return err instanceof Error && err.message.includes('(429)');
}
