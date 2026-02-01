import type { FetchResult } from './types';

const store = new Map<string, FetchResult>();

/** Returns cached result only if complete. Auto-evicts incomplete entries. */
export function getCached(packageName: string): FetchResult | undefined {
  const entry = store.get(packageName);
  if (!entry) return undefined;
  if (!entry.complete) {
    store.delete(packageName);
    return undefined;
  }
  return entry;
}

/** Only caches complete results. Incomplete data is never stored. */
export function setCached(packageName: string, result: FetchResult): void {
  if (result.complete) {
    store.set(packageName, result);
  }
}

export function invalidate(packageName: string): void {
  store.delete(packageName);
}
