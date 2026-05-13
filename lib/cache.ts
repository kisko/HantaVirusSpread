/**
 * Simple in-memory TTL cache for API routes.
 * Keys are strings; values can be anything.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class InMemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  /** Return cached value or compute-and-cache using the provided factory. */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;
    const value = await factory();
    this.set(key, value, ttlMs);
    return value;
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

// Singleton – shared across all API route invocations in the same Node process.
export const cache = new InMemoryCache();

/** Default TTL: 5 minutes */
export const DEFAULT_TTL_MS = 5 * 60 * 1000;
