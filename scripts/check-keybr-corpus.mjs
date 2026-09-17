import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { BOOK_DEFINITIONS } from '../src/games/keybr/content/books/catalog.ts';

const dir = join(import.meta.dirname, '../src/games/keybr/content/assets/books');
const coversDir = join(import.meta.dirname, '../src/games/keybr/content/assets/book-covers');
const expected = new Set(BOOK_DEFINITIONS.map(book => `${book.id}.json`));
const actual = new Set((await readdir(dir)).filter(name => name.endsWith('.json')));
const failures = [];

if (BOOK_DEFINITIONS.filter(book => book.language === 'en').length !== 100) failures.push('expected exactly 100 English books');
if (BOOK_DEFINITIONS.filter(book => book.gutenbergId != null).length !== 97) failures.push('expected 97 sourced additions');
for (const name of expected) if (!actual.has(name)) failures.push(`missing ${name}`);
for (const name of actual) if (!expected.has(name)) failures.push(`uncatalogued ${name}`);

const expectedCovers = new Set(BOOK_DEFINITIONS.map(book => `${book.id}.jpg`));
const actualCovers = new Set((await readdir(coversDir)).filter(name => name.endsWith('.jpg')));
for (const name of expectedCovers) if (!actualCovers.has(name)) failures.push(`missing cover ${name}`);
for (const name of actualCovers) if (!expectedCovers.has(name)) failures.push(`uncatalogued cover ${name}`);
const coverHashes = new Set();
for (const name of expectedCovers) {
  const bytes = await readFile(join(coversDir, name));
  if (bytes.length < 1000 || bytes[0] !== 0xff || bytes[1] !== 0xd8) failures.push(`${name}: invalid JPEG cover`);
  coverHashes.add(createHash('sha256').update(bytes).digest('hex'));
}
if (coverHashes.size !== expectedCovers.size) failures.push(`book covers are not all distinct: ${coverHashes.size}/${expectedCovers.size}`);

for (const book of BOOK_DEFINITIONS) {
  const content = await Bun.file(join(dir, `${book.id}.json`)).json();
  const paragraphs = Array.isArray(content) ? content.flatMap(section => Array.isArray(section?.[1]) ? section[1] : []) : [];
  const text = paragraphs.join('\n');
  if (paragraphs.length < 20) failures.push(`${book.id}: suspiciously short`);
  if (book.gutenbergId != null && text.length < 100_000) failures.push(`${book.id}: suspiciously little text`);
  if (/project gutenberg|\*\*\*\s*(?:start|end) of/i.test(text)) failures.push(`${book.id}: source wrapper leaked`);
  if (paragraphs.some(paragraph => typeof paragraph !== 'string' || !paragraph.trim())) failures.push(`${book.id}: invalid paragraph`);
}

if (failures.length) throw new Error(`Keybr corpus validation failed:\n${failures.join('\n')}`);
console.log(`Keybr corpus: ${BOOK_DEFINITIONS.length} books, 100 English, 97 pinned Gutenberg additions, ${coverHashes.size} distinct covers.`);
