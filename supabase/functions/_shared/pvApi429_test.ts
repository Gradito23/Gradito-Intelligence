import { pvApi429DelayMs } from './perfectVenue.ts';

Deno.test('pvApi429DelayMs uses backoff by attempt', () => {
  const d0 = pvApi429DelayMs(0, null);
  const d1 = pvApi429DelayMs(1, null);
  const d2 = pvApi429DelayMs(2, null);
  if (d0 !== 2_000) throw new Error(`Expected 2000, got ${d0}`);
  if (d1 !== 5_000) throw new Error(`Expected 5000, got ${d1}`);
  if (d2 !== 10_000) throw new Error(`Expected 10000, got ${d2}`);
});

Deno.test('pvApi429DelayMs prefers Retry-After seconds capped at 60s', () => {
  const d = pvApi429DelayMs(0, '8');
  if (d !== 8_000) throw new Error(`Expected 8000 from Retry-After, got ${d}`);
  const capped = pvApi429DelayMs(0, '120');
  if (capped !== 60_000) throw new Error(`Expected 60000 cap, got ${capped}`);
});

Deno.test('pvApi429DelayMs ignores invalid Retry-After', () => {
  const d = pvApi429DelayMs(0, 'nope');
  if (d !== 2_000) throw new Error(`Expected backoff fallback 2000, got ${d}`);
});
