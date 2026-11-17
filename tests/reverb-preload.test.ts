import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/site/components/ReverbDemo.tsx', import.meta.url), 'utf8');
const program = ts.createSourceFile('ReverbDemo.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = new Set(['preloadTask', 'warmNoiseImage', 'fontsTask', 'fontTasks', 'preloadReverbFonts', 'preloadReverbDemoAssets']);
const declarations = program.statements.filter(node => {
  if (ts.isFunctionDeclaration(node)) return names.has(node.name?.text ?? '');
  if (!ts.isVariableStatement(node)) return false;
  return node.declarationList.declarations.some(declaration => names.has(declaration.name.getText(program)));
}).map(node => node.getText(program).replace(/^export /, '').replaceAll('import.meta.url', JSON.stringify('https://example.test/ReverbDemo.js')));
const code = ts.transpileModule(`${declarations.join('\n')}\n({ preloadReverbDemoAssets, preloadReverbFonts });`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;

function harness() {
  const faces: Array<{ family: string; url: string; resolve: () => void; reject: (error: Error) => void }> = [];
  const registered: unknown[] = [];
  const api = runInNewContext(code, {
    URL,
    REVERB_NOISE_URL: '/noise.png',
    prepareReverbTemplate() {},
    document: { fonts: { add: (face: unknown) => registered.push(face) } },
    Image: class { src = ''; },
    FontFace: class {
      constructor(readonly family: string, readonly url: string) {}
      load() {
        return new Promise<void>((resolve, reject) => faces.push({ family: this.family, url: this.url, resolve, reject }));
      }
    },
  }) as { preloadReverbDemoAssets: () => Promise<void>; preloadReverbFonts: () => Promise<void> };
  return { ...api, faces, registered };
}

const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

test('Reverb retries rejected preload and font caches while sharing live and loaded fonts', async () => {
  const h = harness();
  const first = h.preloadReverbDemoAssets();
  expect(h.preloadReverbDemoAssets()).toBe(first);
  await flush();
  expect(h.faces).toHaveLength(4);
  const failed = h.faces[0]!;
  h.faces[1]!.resolve();
  h.faces[2]!.resolve();
  failed.reject(new Error('network unavailable'));
  await expect(first).rejects.toThrow('network unavailable');
  expect(h.registered).toHaveLength(2);

  const retry = h.preloadReverbDemoAssets();
  expect(retry).not.toBe(first);
  expect(h.preloadReverbDemoAssets()).toBe(retry);
  await flush();
  expect(h.faces).toHaveLength(5);
  expect(h.faces[4]!.url).toBe(failed.url);
  h.faces[3]!.resolve();
  h.faces[4]!.resolve();
  await retry;
  expect(h.registered).toHaveLength(4);
  expect(new Set(h.registered).size).toBe(4);
  expect(h.preloadReverbDemoAssets()).toBe(retry);
  await h.preloadReverbFonts();
  expect(h.faces).toHaveLength(5);
});

test('Reverb font preload alone recovers after failure for a later demo request', async () => {
  const h = harness();
  const first = h.preloadReverbFonts();
  await flush();
  for (const face of h.faces) face.reject(new Error('offline'));
  await expect(first).rejects.toThrow('offline');
  const retry = h.preloadReverbDemoAssets();
  await flush();
  expect(h.faces).toHaveLength(8);
  for (const face of h.faces.slice(4)) face.resolve();
  await retry;
  expect(h.registered).toHaveLength(4);
});
