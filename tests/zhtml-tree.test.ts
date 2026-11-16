import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { describeZhtmlTree, zhtmlNodeText, type ZhtmlNode } from '../src/site/demos/zhtml-tree.ts';

const node = (index: number, depth: number, tag: string, text = ''): ZhtmlNode => ({ index, depth, tag, text, matched: false });

test('node table recovers parent links and contiguous subtree ranges across siblings and roots', () => {
  const input = [node(1, 0, 'main'), node(2, 1, 'a'), node(3, 2, '#text', 'One'), node(4, 1, 'a'), node(5, 2, '#text', 'Two'), node(6, 0, 'footer')];
  const rows = describeZhtmlTree(input);
  expect(rows.map(({ index, parent, end }) => [index, parent, end])).toEqual([[1, 0, 5], [2, 1, 3], [3, 2, 3], [4, 1, 5], [5, 4, 5], [6, 0, 6]]);
  expect(zhtmlNodeText(rows, rows[0]!)).toBe('OneTwo');
  expect(zhtmlNodeText(rows, rows[1]!)).toBe('One');
  expect(zhtmlNodeText(rows, rows[5]!)).toBe('');
  expect(input[0]).not.toHaveProperty('end');
});

test('empty documents, text roots and source entities stay faithful to adapter output', () => {
  expect(describeZhtmlTree([])).toEqual([]);
  const rows = describeZhtmlTree([node(1, 0, '#text', 'A &amp; B'), node(2, 0, 'br')]);
  expect(rows[0]).toMatchObject({ parent: 0, end: 1 });
  expect(zhtmlNodeText(rows, rows[0]!)).toBe('A &amp; B');
  expect(zhtmlNodeText(rows, rows[1]!)).toBe('');
});

type Engine = WebAssembly.Exports & { memory: WebAssembly.Memory; input_ptr(): number; output_ptr(): number; output_len(): number; run(operation: number, length: number): void };
const { instance } = await WebAssembly.instantiate(await readFile(new URL('../src/site/demos/assets/project-engines.wasm', import.meta.url)));
const engine = instance.exports as Engine;
function parse(html: string) {
  const bytes = new TextEncoder().encode(JSON.stringify({ html, selector: 'p, a.nav' }));
  new Uint8Array(engine.memory.buffer, engine.input_ptr(), bytes.length).set(bytes);
  engine.run(0, bytes.length);
  return JSON.parse(new TextDecoder().decode(new Uint8Array(engine.memory.buffer, engine.output_ptr(), engine.output_len()))) as { nodes: ZhtmlNode[]; matches: number };
}

test('actual WASM node table retains multiple roots and runtime selector matches', () => {
  const parsed = parse('<main><a class="nav">One</a><a>Two</a></main><footer>End</footer>');
  const rows = describeZhtmlTree(parsed.nodes);
  expect(rows.map(({ parent, end }) => [parent, end])).toEqual([[0, 5], [1, 3], [2, 3], [1, 5], [4, 5], [0, 7], [6, 7]]);
  expect(rows.filter(row => row.matched).map(row => row.index)).toEqual([2]);
  expect(parsed.matches).toBe(1);
  expect(zhtmlNodeText(rows, rows[0]!)).toBe('OneTwo');
  expect(zhtmlNodeText(rows, rows[5]!)).toBe('End');
});

test('actual WASM optional end tags produce sibling paragraphs, not a fabricated browser tree', () => {
  const parsed = parse('<article><p>First<p>Second<br>Third</article>');
  const rows = describeZhtmlTree(parsed.nodes);
  const paragraphs = rows.filter(row => row.matched);
  expect(paragraphs.map(({ parent, end }) => [parent, end])).toEqual([[1, 3], [1, 7]]);
  expect(paragraphs.map(row => zhtmlNodeText(rows, row))).toEqual(['First', 'SecondThird']);
  expect(rows.find(row => row.tag === 'br')).toMatchObject({ parent: 4, end: 6 });
});

test('actual WASM text roots and entity spellings are displayed without DOM parsing', () => {
  const rows = describeZhtmlTree(parse('leading<section>A &amp; B</section>trailing').nodes);
  expect(rows.map(({ parent, end }) => [parent, end])).toEqual([[0, 1], [0, 3], [2, 3], [0, 4]]);
  expect(zhtmlNodeText(rows, rows[1]!)).toBe('A &amp; B');
  expect(describeZhtmlTree(parse('').nodes)).toEqual([]);
});
