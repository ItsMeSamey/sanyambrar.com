import { afterEach, expect, test } from 'bun:test';
import { plugin } from 'bun';
import { type Content } from '../src/games/keybr/content/books/types.ts';
import { type Keyboard } from '../src/games/keybr/keyboard/keyboard.ts';
import { Language } from '../src/games/keybr/keyboard/language.ts';
import { type PhoneticModel } from '../src/games/keybr/phonetic-model/phoneticmodel.ts';
import { Settings } from '../src/games/keybr/settings/settings.ts';
import { LocalDate, Today } from '../src/games/keybr/result/localdate.ts';
import { type Result } from '../src/games/keybr/result/result.ts';
import { orderResults } from '../src/games/keybr/result/order.ts';

// Bun's model tests do not run Vite's cover-URL glob transform. Keep the real
// book catalog and model code, substituting only asset URLs for this fixture.
plugin({name: 'keybr-book-cover-fixture', setup(build) {
  build.onLoad({filter: /\/content\/books\/book\.ts$/}, async ({path}) => ({
    loader: 'ts',
    contents: (await Bun.file(path).text()).replace(/import\.meta\.glob<string>\([\s\S]*?\);/, 'Object.fromEntries(BOOK_DEFINITIONS.map(({id}) => [`../assets/book-covers/${id}.jpg`, `/covers/${id}.jpg`]));'),
  }));
}});
const { BooksLesson } = await import('../src/games/keybr/lesson/books.ts');
const { Book } = await import('../src/games/keybr/content/books/book.ts');
const { lessonProps } = await import('../src/games/keybr/lesson/settings.ts');
const { MutableDailyGoal } = await import('../src/games/keybr/lesson/dailygoal.ts');

const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
afterEach(() => {
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
  else Reflect.deleteProperty(globalThis, 'localStorage');
});
function storage() {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  }});
  return values;
}
const keyboard = {getCodePoints: () => new Set(Array.from({length: 95}, (_, index) => index + 32))} as unknown as Keyboard;
const model = {language: Language.EN, letters: []} as unknown as PhoneticModel;
function lesson(settings: Settings, content: Content, book = Book.EN_ALICE_WONDERLAND) {
  return new BooksLesson(settings, keyboard, model, {book, content});
}
const base = new Settings().set(lessonProps.length, 0);
const longContent: Content = [['Long book', Array.from({length: 1505}, (_, index) => `${index} ` + 'story '.repeat(45))]];

test('books navigate beyond paragraph 1000, clamp to actual book, and restore the chosen paragraph', () => {
  storage();
  const settings = base.set(lessonProps.books.paragraphIndex, 1001);
  expect(new Settings(JSON.parse(JSON.stringify(settings))).get(lessonProps.books.paragraphIndex)).toBe(1001);
  const current = lesson(settings, longContent);
  expect(current.paragraphIndex).toBe(1001);
  expect(current.generate()).toStartWith('1001 ');
  expect(BooksLesson.savedParagraphIndex(Book.EN_ALICE_WONDERLAND)).toBe(1001);
  const restored = lesson(settings, longContent);
  expect(restored.generate()).toBe(current.generatePrevious() ?? lesson(settings, longContent).generate());
  expect(lesson(base.set(lessonProps.books.paragraphIndex, 999999), longContent).paragraphIndex).toBe(1504);
  expect(lesson(base.set(lessonProps.books.paragraphIndex, 1001.8), longContent).paragraphIndex).toBe(1001);
  expect(lesson(base.set(lessonProps.books.paragraphIndex, NaN), longContent).paragraphIndex).toBe(0);
});

test('storybook next, previous, reload, settings preview, and book round trips preserve page starts', () => {
  const values = storage();
  const settings = base.set(lessonProps.books.paragraphIndex, 1001);
  const current = lesson(settings, longContent);
  const first = current.generate();
  const second = current.generate();
  const beforePreview = JSON.stringify([...values]);
  for (let i = 0; i < 3; i++) current.generatePreview();
  expect(JSON.stringify([...values])).toBe(beforePreview);
  expect(current.generatePrevious()).toBe(first);
  expect(current.generate()).toBe(second);
  expect(lesson(settings, longContent).generate()).toBe(second);
  const other = Book.ALL.find(book => book !== Book.EN_ALICE_WONDERLAND)!;
  lesson(base, [['Other', ['different '.repeat(60)]]], other).generate();
  expect(lesson(settings, longContent).generate()).toBe(second);
  const next = current.generate();
  expect(lesson(settings, longContent).generate()).toBe(next);
});

test('first book page filters only needed paragraphs and preserves eager word-sequence output', () => {
  storage();
  let normalized = 0;
  const raw = String.prototype.normalize;
  String.prototype.normalize = function (...args) { normalized++; return raw.apply(this, args); };
  try {
    const current = lesson(base, longContent);
    const first = current.generate();
    expect(normalized).toBe(1);
    expect(first).toBe('0 ' + 'story '.repeat(19) + 'story');
    current.generate();
    expect(normalized).toBe(1);
    current.generate();
    expect(normalized).toBe(2);
  } finally { String.prototype.normalize = raw; }
});

test('daily goal resets at local midnight and ignores old imports after rollover', () => {
  let date = new LocalDate(2026, 11, 16);
  const goal = new MutableDailyGoal(base.set(lessonProps.dailyGoal, 1), () => new Today(date));
  const result = (day: LocalDate, time: number) => ({timeStamp: day.timeStamp + 1000, time}) as Result;
  goal.append(result(date, 60000));
  expect(goal.value).toBe(1);
  const yesterday = date;
  date = date.plusDays(1);
  expect(goal.copy().value).toBe(0);
  goal.append(result(yesterday, 60000));
  expect(goal.value).toBe(0);
  goal.append(result(date, 30000));
  expect(goal.value).toBe(0.5);
  goal.append(result(date, 30000));
  expect(goal.value).toBe(1);
});

test('legacy late-book progress prepares between event-loop turns without changing saves', async () => {
  const values = storage();
  const book = Book.ALL.get('en-bleak-house');
  const content = await Bun.file(new URL('../src/games/keybr/content/assets/books/en-bleak-house.json', import.meta.url)).json() as Content;
  const key = `game.keybr.storybook.progress.v1.${book.id}`;
  const raw = JSON.stringify({paragraphIndex: 0, signature: '0:0:0', history: [300000], pageIndex: 0});
  values.set(key, raw);
  const current = lesson(base, content, book);
  let turns = 0;
  const timer = setInterval(() => turns++, 0);
  try { await current.prepare(); } finally { clearInterval(timer); }
  expect(turns).toBeGreaterThan(1);
  expect(values.get(key)).toBe(raw);
  const reference = lesson(base, content, book);
  expect(current.generate()).toBe(reference.generate());
});

test('history ordering is stable across old imports, equal timestamps, duplicates, and reload', () => {
  const first = {timeStamp: 100, id: 'first'} as unknown as Result;
  const same = {timeStamp: 100, id: 'same'} as unknown as Result;
  const latest = {timeStamp: 300, id: 'latest'} as unknown as Result;
  const earlier = {timeStamp: 50, id: 'earlier'} as unknown as Result;
  const original = [first, latest, earlier, same, first];
  const ordered = orderResults(original);
  expect(ordered).toEqual([earlier, first, same, first, latest]);
  expect(orderResults(ordered)).toEqual(ordered);
  expect(original).toEqual([first, latest, earlier, same, first]);
  expect(ordered[1]).toBe(first);
  expect(ordered[3]).toBe(first);
});
