import { expect, test } from 'bun:test';
import { Settings } from '../src/games/keybr/settings/settings.ts';
import { createLocalSettingsStorage, type SettingsStorageFailure } from '../src/games/keybr/settings/storage.ts';

const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');

test('first-time startup and edits remain usable when writes fail', async () => {
  const failures: SettingsStorageFailure[] = [];
  const storage = createLocalSettingsStorage(failure => failures.push(failure), () => ({
    getItem: () => null,
    setItem: () => { throw quotaError; },
  }));
  const defaults = await storage.load();
  expect(defaults.isNew).toBe(true);
  const changed = new Settings({ lesson: 'books' });
  expect(await storage.store(changed)).toBe(changed);
  expect(failures.map(failure => failure.operation)).toEqual(['write']);
});

test('failed reads never overwrite an unread saved value, even if storage becomes writable', async () => {
  let saved = '{"lesson":"custom"}';
  let blocked = true;
  let writes = 0;
  const failures: SettingsStorageFailure[] = [];
  const storage = createLocalSettingsStorage(failure => failures.push(failure), () => ({
    getItem: () => { if (blocked) throw new DOMException('Access denied', 'SecurityError'); return saved; },
    setItem: (_key, value) => { writes++; saved = value; },
  }));
  const defaults = await storage.load();
  blocked = false;
  const changed = new Settings({ lesson: 'books' });
  expect(defaults.isNew).toBe(true);
  expect(await storage.store(changed)).toBe(changed);
  expect(writes).toBe(0);
  expect(saved).toBe('{"lesson":"custom"}');
  expect(failures.map(failure => failure.operation)).toEqual(['read']);
});

test('existing settings survive failed writes and persistence can recover', async () => {
  let saved = '{"lesson":"custom"}';
  let blocked = true;
  const failures: SettingsStorageFailure[] = [];
  const storage = createLocalSettingsStorage(failure => failures.push(failure), () => ({
    getItem: () => saved,
    setItem: (_key, value) => { if (blocked) throw quotaError; saved = value; },
  }));
  expect((await storage.load()).toJSON()).toEqual({ lesson: 'custom' });
  const changed = new Settings({ lesson: 'books' });
  await storage.store(changed);
  expect(saved).toBe('{"lesson":"custom"}');
  blocked = false;
  await storage.store(changed);
  expect(JSON.parse(saved)).toEqual({ lesson: 'books' });
  blocked = true;
  await storage.store(changed);
  expect(failures.map(failure => failure.operation)).toEqual(['write', 'write']);
});

test('malformed settings retain the recovery error and are never reset', async () => {
  let writes = 0;
  const storage = createLocalSettingsStorage(() => {}, () => ({
    getItem: () => '{invalid json',
    setItem: () => { writes++; },
  }));
  await expect(storage.load()).rejects.toThrow('Keybr settings are invalid');
  expect(writes).toBe(0);
});
