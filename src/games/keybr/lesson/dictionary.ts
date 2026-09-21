import { type WordList } from "../content/words/types.ts";
import { type Filter } from "../phonetic-model/filter.ts";
import { type CodePoint, type CodePointSet } from "../unicode/types.ts";
import { toCodePoints } from "../unicode/codepoints.ts";


const filteredCache = new WeakMap<readonly string[], Map<string, string[]>>();
const dictionaryCache = new WeakMap<readonly string[], Map<string, Dictionary>>();

const codePointKey = (codePoints: CodePointSet): string | null => {
  const iterator = (codePoints as CodePointSet & Partial<Iterable<CodePoint>>)[Symbol.iterator];
  return typeof iterator === "function" ? [...(codePoints as CodePointSet & Iterable<CodePoint>)].join(",") : null;
};

export class Dictionary implements Iterable<string> {
  readonly #words: Word[] = [];
  readonly #dict = new Map<CodePoint, Word[]>();

  constructor(wordList: WordList) {
    for (const item of wordList) {
      const word = new Word(item);
      this.#words.push(word);
      for (const codePoint of word.codePoints) {
        let list = this.#dict.get(codePoint);
        if (list == null) {
          this.#dict.set(codePoint, (list = []));
        }
        if (!list.includes(word)) {
          list.push(word);
        }
      }
    }
  }

  *[Symbol.iterator](): IterableIterator<string> {
    for (const word of this.#words) {
      yield word.value;
    }
  }

  find({ codePoints, focusedCodePoint }: Filter): WordList {
    let words = this.#words;
    if (focusedCodePoint != null) {
      words = this.#dict.get(focusedCodePoint) ?? [];
    }
    if (codePoints != null) {
      words = words.filter((word) => word.matches(codePoints));
    }
    return words.map(({ value }) => value);
  }
}

class Word {
  readonly value: string;
  readonly codePoints: readonly CodePoint[];

  constructor(value: string) {
    this.value = value;
    this.codePoints = [...toCodePoints(value)];
  }

  matches(codePoints: CodePointSet): boolean {
    return this.codePoints.every((codePoint) => codePoints.has(codePoint));
  }

  toString() {
    return this.value;
  }
}

export const filterWordList = (
  words: WordList,
  codePoints: CodePointSet,
): string[] => {
  const key = codePointKey(codePoints);
  if (key != null) {
    let byCodePoints = filteredCache.get(words);
    if (byCodePoints == null) filteredCache.set(words, (byCodePoints = new Map<string, string[]>()));
    const cached = byCodePoints.get(key);
    if (cached != null) return cached;
    const filtered = words.filter((word) =>
      [...toCodePoints(word)].every((codePoint) => codePoints.has(codePoint)),
    );
    byCodePoints.set(key, filtered);
    return filtered;
  }
  return words.filter((word) =>
    [...toCodePoints(word)].every((codePoint) => codePoints.has(codePoint)),
  );
};

export const filteredDictionary = (
  words: WordList,
  codePoints: CodePointSet,
  minLength = 0,
): Dictionary => {
  const signature = codePointKey(codePoints);
  const key = signature == null ? null : `${signature}|${minLength}`;
  if (key != null) {
    let byFilter = dictionaryCache.get(words);
    if (byFilter == null) dictionaryCache.set(words, (byFilter = new Map<string, Dictionary>()));
    const cached = byFilter.get(key);
    if (cached != null) return cached;
    const source = filterWordList(words, codePoints).filter((word) => word.length >= minLength);
    const dictionary = new Dictionary(source);
    byFilter.set(key, dictionary);
    return dictionary;
  }
  return new Dictionary(filterWordList(words, codePoints).filter((word) => word.length >= minLength));
};
