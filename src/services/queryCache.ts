type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

export function readQueryCache<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }

  return entry.value as T;
}

export function writeQueryCache<T>(key: string, value: T, ttlMs = 5 * 60 * 1000): T {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
  return value;
}

export function invalidateQueryCache(...keys: string[]): void {
  keys.forEach((key) => cache.delete(key));
}

export function clearQueryCache(): void {
  cache.clear();
}
