import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const { instance } = await WebAssembly.instantiate(await readFile(new URL('../src/site/demos/assets/project-engines.wasm', import.meta.url)));
const engine = instance.exports;
test('vendored sources and shipped engine match recorded provenance', async () => {
  const base = new URL('../src/site/demos/zig/', import.meta.url);
  const provenance = JSON.parse(await readFile(new URL('provenance.json', base), 'utf8'));
  for (const [path, hash] of Object.entries(provenance.files)) {
    assert.equal(createHash('sha256').update(await readFile(new URL(path, base))).digest('hex'), hash, path);
  }
  assert.equal(createHash('sha256').update(await readFile(new URL('../assets/project-engines.wasm', base))).digest('hex'), provenance.wasmSha256);
});
function run(operation, input) {
  const bytes = new TextEncoder().encode(JSON.stringify(input));
  assert.ok(bytes.length <= engine.input_capacity());
  new Uint8Array(engine.memory.buffer, engine.input_ptr(), bytes.length).set(bytes);
  engine.run(operation, bytes.length);
  return JSON.parse(new TextDecoder().decode(new Uint8Array(engine.memory.buffer, engine.output_ptr(), engine.output_len())));
}
test('actual zhtml tree and runtime selector execute in WebAssembly', () => {
  const result = run(0, { html: '<main><a class="nav">Docs</a><p>Hello</p></main>', selector: 'main > a.nav' });
  assert.equal(result.matches, 1);
  assert.deepEqual(result.nodes.filter(node => node.matched).map(node => node.tag), ['a']);
  assert.ok(result.nodes.some(node => node.tag === '#text' && node.text === 'Docs'));
  assert.equal(result.nodes.find(node => node.tag === 'a').depth, 1);
});
test('zhtml empty, malformed, bounded input and selector errors recover', () => {
  assert.equal(run(0, { html: '', selector: '*' }).matches, 0);
  assert.ok(run(0, { html: '<p>one<p>two', selector: 'p' }).matches >= 1);
  assert.ok(run(0, { html: '<p>Hi</p>', selector: '[' }).error);
  assert.equal(run(0, { html: 'x'.repeat(8193), selector: '*' }).error, 'InputTooLarge');
  assert.equal(run(0, { html: '<p>ok</p>', selector: 'p' }).matches, 1);
});
test('actual OneSerial bytes, field spans and checked round trip', () => {
  const value = { id: 42, user: { name: 'Ada ☕', active: true }, scores: [98, 65535, 0] };
  const result = run(1, { value });
  assert.equal(result.valid, true);
  assert.deepEqual(result.decoded, value);
  assert.ok(Array.isArray(result.bytes));
  // The pinned library includes alignment bytes before scalar payloads.
  assert.deepEqual(result.bytes.slice(0, 8), [0, 0, 0, 0, 42, 0, 0, 0]);
  assert.equal(result.regions[0].start, 0);
  assert.equal(result.regions.at(-1).end, result.bytes.length);
  for (let i = 1; i < result.regions.length; i++) assert.equal(result.regions[i - 1].end, result.regions[i].start);
  const damaged = run(1, { value, truncate: true });
  assert.equal(damaged.valid, false);
  assert.equal(damaged.decoded, undefined);
  assert.equal(damaged.bytes.length, result.bytes.length - 1);
});
test('OneSerial enforces the schema and recovers after invalid input', () => {
  assert.ok(run(1, { value: { id: -1, user: { name: '', active: true }, scores: [] } }).error);
  assert.ok(run(1, { value: { id: 1, user: { name: '', active: true }, scores: [65536] } }).error);
  assert.equal(run(1, { value: { id: 1, user: { name: 'x'.repeat(513), active: true }, scores: [] } }).error, 'InputTooLarge');
  assert.equal(run(1, { value: { id: 0, user: { name: '', active: false }, scores: [] } }).valid, true);
});
