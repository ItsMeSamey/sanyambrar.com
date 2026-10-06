import { expect, test } from 'bun:test';
import { randomBytes } from 'node:crypto';
import { decodeBase64, importKey, sealBytes, openBytes, openPost } from '../src/site/public/blog/2/crypto.js';

async function fixture(payload = { version: 2, html: '<h1>Private fixture</h1>', assets: {} }) {
  const keyText = randomBytes(32).toString('base64url');
  const key = await importKey(keyText, ['encrypt', 'decrypt']);
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  return { keyText, key, encrypted: await sealBytes(bytes, key, 'post') };
}

test('binary ciphertext hides content; a nonextractable key opens the article', async () => {
  const { keyText, key, encrypted } = await fixture();
  expect(key.extractable).toBe(false);
  expect((await openPost(encrypted, key)).html).toBe('<h1>Private fixture</h1>');
  expect(Buffer.from(encrypted).toString()).not.toContain('Private fixture');
  expect(Buffer.from(encrypted).toString()).not.toContain(keyText);
});

test('wrong keys, modified ciphertext and modified nonces fail authentication', async () => {
  const { key, encrypted } = await fixture();
  const wrong = await importKey(randomBytes(32).toString('base64url'));
  await expect(openPost(encrypted, wrong)).rejects.toThrow();
  for (const index of [4, 16, encrypted.length - 1]) {
    const changed = encrypted.slice();
    changed[index] ^= 1;
    await expect(openPost(changed, key)).rejects.toThrow();
  }
});

test('resource binding rejects substitution between assets and the article', async () => {
  const { key } = await fixture();
  const first = 'a'.repeat(64), second = 'b'.repeat(64);
  const encrypted = await sealBytes(new TextEncoder().encode('attachment'), key, first);
  expect(new TextDecoder().decode(await openBytes(encrypted, key, first))).toBe('attachment');
  await expect(openBytes(encrypted, key, second)).rejects.toThrow();
  await expect(openBytes(encrypted, key, 'post')).rejects.toThrow();
});

test('rejects unsupported headers, missing tags and oversized files', async () => {
  const { key, encrypted } = await fixture();
  const changed = encrypted.slice();
  changed[3] = 9;
  for (const value of [changed, encrypted.slice(0, 25), new Uint8Array(8_000_033)]) {
    await expect(openPost(value, key)).rejects.toThrow();
  }
});

test('requires a canonical 256-bit key', () => {
  expect(decodeBase64(randomBytes(32).toString('base64url'), true)).toHaveLength(32);
  for (const value of ['', 'password', 'A'.repeat(42), 'A'.repeat(44), 'A'.repeat(42) + 'B']) {
    expect(() => decodeBase64(value, true)).toThrow();
  }
});

test('rejects invalid article metadata and asset paths', async () => {
  for (const payload of [
    { version: 1, html: '', assets: {} }, { version: 2, assets: {} },
    { version: 2, html: '', assets: [] },
    { version: 2, html: '', assets: { 'private.txt': { id: '../outside', mime: 'application/octet-stream' } } },
    { version: 2, html: '', assets: { 'image.svg': { id: 'a'.repeat(64), mime: 'image/svg+xml' } } },
  ]) {
    const { key, encrypted } = await fixture(payload);
    await expect(openPost(encrypted, key)).rejects.toThrow();
  }
});
