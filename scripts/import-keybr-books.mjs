import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { BOOK_DEFINITIONS } from '../src/games/keybr/packages/keybr-content/lib/books/catalog.ts';

const outDir = join(import.meta.dirname, '../src/games/keybr/packages/keybr-content/assets/books');
const refresh = process.argv.includes('--refresh');
const selected = BOOK_DEFINITIONS.filter(book => book.gutenbergId != null);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function normalizeBlock(block) {
  return block.replace(/\r/g, '').replace(/\s*\n\s*/g, ' ').replace(/[ \t]+/g, ' ').trim();
}

function storyBody(raw, label) {
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const start = text.search(/^\*\*\* START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK .*?\*\*\*\s*$/im);
  const end = text.search(/^\*\*\* END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK .*?\*\*\*\s*$/im);
  if (start < 0 || end <= start) throw new Error(`${label}: Gutenberg markers missing`);
  const markerEnd = text.indexOf('\n', start);
  const body = text.slice(markerEnd + 1, end);
  const blocks = body.split(/\n[ \t]*\n+/).map(normalizeBlock).filter(Boolean);
  if (blocks.length < 20) throw new Error(`${label}: suspiciously short body`);

  const first = Math.max(0, blocks.findIndex((block, index) => {
    if (index >= 80 || block.length < 120 || !/[a-z]{3}/i.test(block)) return false;
    const headingCount = (block.match(/\b(?:chapter|part|book|contents)\b/gi) ?? []).length;
    return headingCount < 3;
  }));
  const paragraphs = blocks.slice(first).filter(block =>
    !/^\[(?:illustration|image|music|decoration)\b/i.test(block) &&
    !/project gutenberg/i.test(block),
  );
  const chars = paragraphs.reduce((sum, paragraph) => sum + paragraph.length, 0);
  if (paragraphs.length < 20 || chars < body.length * 0.70) {
    throw new Error(`${label}: parser retained only ${paragraphs.length} paragraphs / ${chars} chars`);
  }
  const sections = [];
  for (let i = 0; i < paragraphs.length; i += 60) sections.push([`Section ${sections.length + 1}`, paragraphs.slice(i, i + 60)]);
  return sections;
}

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function download(book) {
  const path = join(outDir, `${book.id}.json`);
  if (!refresh && await exists(path)) return { book, skipped: true };
  const id = book.gutenbergId;
  const urls = [
    `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`,
    `https://www.gutenberg.org/files/${id}/${id}-0.txt`,
    `https://www.gutenberg.org/files/${id}/${id}.txt`,
  ];
  let raw = null;
  let lastError = null;
  for (const url of urls) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(url, { headers: { 'user-agent': 'ItsMeSamey-Keybr/1.0 (+https://github.com/ItsMeSamey/itsmesamey.github.io)' } });
        if (response.ok) { raw = await response.text(); break; }
        if (response.status === 404) break;
        lastError = new Error(`${response.status} ${url}`);
      } catch (error) { lastError = error; }
      await sleep(750 * (attempt + 1));
    }
    if (raw != null) break;
  }
  if (raw == null) throw lastError ?? new Error(`${book.title}: download failed`);
  const content = storyBody(raw, book.title);
  await writeFile(path, `${JSON.stringify(content)}\n`);
  return { book, skipped: false, sections: content.length, paragraphs: content.reduce((n, [, p]) => n + p.length, 0) };
}

await mkdir(outDir, { recursive: true });
let cursor = 0;
const results = [];
async function worker() {
  while (cursor < selected.length) {
    const book = selected[cursor++];
    const result = await download(book);
    results.push(result);
    if (!result.skipped) console.log(`${book.gutenbergId}\t${book.title}\t${result.sections} sections\t${result.paragraphs} paragraphs`);
    await sleep(150);
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
const written = results.filter(result => !result.skipped).length;
console.log(`Imported ${written}; kept ${results.length - written} existing; catalog ${selected.length}.`);
