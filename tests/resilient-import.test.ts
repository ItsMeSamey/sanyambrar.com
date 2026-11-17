import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { resilientImport } from '../src/shared/resilientImport.ts';

const marker = 'samey.stale-import-reload.v1';
let originals: Map<string, PropertyDescriptor | undefined>;
let values: Map<string, string>;
let reloads: number;
let storage: { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void };
let warning: ReturnType<typeof spyOn>;

beforeEach(() => {
  originals = new Map(['location', 'sessionStorage'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  values = new Map();
  reloads = 0;
  storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
  };
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { reload: () => { reloads++; } } });
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });
  warning = spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warning.mockRestore();
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

for (const message of ['Failed to fetch dynamically imported module', 'error loading dynamically imported module', 'Importing a module script failed']) {
  test(`${message}: one reload keeps the boundary pending and the next failure rejects`, async () => {
    const error = new TypeError(message);
    let settled = false;
    void resilientImport(() => Promise.reject(error)).then(() => { settled = true; }, () => { settled = true; });
    for (let i = 0; i < 8; i++) await Promise.resolve();
    expect(reloads).toBe(1);
    expect(Number(values.get(marker))).toBeGreaterThan(0);
    expect(settled).toBe(false);
    await expect(resilientImport(() => Promise.reject(error))).rejects.toBe(error);
    expect(reloads).toBe(1);
  });
}

for (const operation of ['getItem', 'setItem'] as const) {
  test(`an unavailable marker ${operation} never starts a reload loop`, async () => {
    storage[operation] = () => { throw new Error('Storage blocked'); };
    const error = new TypeError('Failed to fetch dynamically imported module');
    for (let attempt = 0; attempt < 2; attempt++) {
      let rejection: unknown;
      void resilientImport(() => Promise.reject(error)).catch(cause => { rejection = cause; });
      for (let i = 0; i < 8; i++) await Promise.resolve();
      expect(rejection).toBe(error);
    }
    expect(reloads).toBe(0);
  });
}

test('a throwing sessionStorage getter surfaces the original import failure', async () => {
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get() { throw new Error('Storage blocked'); } });
  const error = new TypeError('Failed to fetch dynamically imported module');
  await expect(resilientImport(() => Promise.reject(error))).rejects.toBe(error);
  expect(reloads).toBe(0);
});

test('ordinary failures propagate without reload and successful imports stay unchanged', async () => {
  const error = new Error('Module initialization failed');
  await expect(resilientImport(() => Promise.reject(error))).rejects.toBe(error);
  const module = { ready: true };
  expect(await resilientImport(() => Promise.resolve(module))).toBe(module);
  expect(reloads).toBe(0);
});

test('an expired marker permits one new recovery reload', async () => {
  values.set(marker, String(Date.now() - 16_000));
  void resilientImport(() => Promise.reject(new TypeError('Failed to fetch dynamically imported module')));
  for (let i = 0; i < 8; i++) await Promise.resolve();
  expect(reloads).toBe(1);
  expect(Number(values.get(marker))).toBeGreaterThan(Date.now() - 1000);
});
