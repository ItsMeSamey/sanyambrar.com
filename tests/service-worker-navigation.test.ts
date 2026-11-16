import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function navigationWorker(fetchResponse: () => Promise<Response>, cached: Response | undefined) {
  const build = ts.createSourceFile('build.ts', readFileSync(new URL('../build.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
  let template = '';
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'generateServiceWorker') {
      for (const statement of node.body!.statements) {
        if (!ts.isVariableStatement(statement)) continue;
        for (const declaration of statement.declarationList.declarations) {
          if (declaration.name.getText(build) === 'source') template = declaration.initializer!.getText(build);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(build);
  if (!template) throw new Error('Service-worker generator not found');
  const source = runInNewContext(template, { version: 'test', files: [] }) as string;
  const handlers = new Map<string, (event: any) => void>();
  let reads = 0;
  runInNewContext(source, {
    URL, Response, location: { origin: 'https://example.test' }, fetch: fetchResponse,
    self: { registration: { scope: 'https://example.test/' }, addEventListener: (name: string, handler: (event: any) => void) => handlers.set(name, handler) },
    caches: { open: async () => ({ match: async () => { reads++; return cached; }, put: async () => {} }) },
  });
  return {
    async navigate() {
      let result: Promise<Response> | undefined;
      handlers.get('fetch')!({ request: { url: 'https://example.test/projects/missing/', method: 'GET', mode: 'navigate' }, respondWith: (response: Promise<Response>) => { result = response; } });
      return result!;
    },
    get cacheReads() { return reads; },
  };
}

for (const status of [200, 403, 404, 500]) {
  test(`navigation preserves a reachable server's HTTP ${status} response`, async () => {
    const response = new Response(`live ${status}`, { status });
    const worker = navigationWorker(async () => response, new Response('stale shell'));
    expect(await worker.navigate()).toBe(response);
    expect(worker.cacheReads).toBe(0);
  });
}

test('navigation falls back to cached content when the network rejects', async () => {
  const cached = new Response('offline shell');
  const worker = navigationWorker(async () => { throw new TypeError('Network unavailable'); }, cached);
  expect(await worker.navigate()).toBe(cached);
  expect(worker.cacheReads).toBe(1);
});
