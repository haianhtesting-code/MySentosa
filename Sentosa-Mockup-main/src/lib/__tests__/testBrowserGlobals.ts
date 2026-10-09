// Minimal in-memory localStorage + `window` shim for tests exercising
// functions that are hard-wired to browser globals (guarded by
// `typeof window === "undefined"` checks throughout src/lib/*.ts).
// vitest.config.ts runs with environment: "node", so these globals are
// normally absent; installing/removing them per-test lets us exercise the
// localStorage-backed persistence paths without switching the whole suite
// to a jsdom/happy-dom environment (neither is installed in this repo).

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  get length(): number {
    return this.store.size;
  }
}

export function installBrowserGlobals(): void {
  (globalThis as any).window = globalThis;
  (globalThis as any).localStorage = new MemoryStorage();
}

export function uninstallBrowserGlobals(): void {
  delete (globalThis as any).window;
  delete (globalThis as any).localStorage;
}
