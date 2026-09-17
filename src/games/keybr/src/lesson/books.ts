import {
  type Book,
  type BookContent,
  type Content,
  flattenContent,
  splitParagraph,
} from "@keybr/content";
import { filterText, type Keyboard } from "@keybr/keyboard";
import { clamp } from "@keybr/lang";
import { type PhoneticModel } from "@keybr/phonetic-model";
import { type KeyStatsMap } from "@keybr/result";
import { type Settings } from "@keybr/settings";
import { LessonKeys } from "./key.ts";
import { Lesson } from "./lesson.ts";
import { lessonProps } from "./settings.ts";
import { Target } from "./target.ts";
import { generateFragment } from "./text/fragment.ts";
import { wordSequence } from "./text/words.ts";

type StoredBookProgress = {
  readonly paragraphIndex: number;
  readonly signature: string;
  readonly history: readonly number[];
  readonly pageIndex: number;
};

const progressKey = (book: Book) =>
  `game.keybr.storybook.progress.v1.${book.id}`;

function loadProgress(book: Book): StoredBookProgress | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const json = localStorage.getItem(progressKey(book));
    if (json == null) return null;
    const value = JSON.parse(json) as Partial<StoredBookProgress>;
    if (
      !Number.isInteger(value.paragraphIndex) ||
      Number(value.paragraphIndex) < 0
    )
      return null;
    if (typeof value.signature !== "string") return null;
    if (!Array.isArray(value.history) || value.history.length === 0)
      return null;
    if (!value.history.every((item) => Number.isInteger(item) && item >= 0))
      return null;
    if (
      !Number.isInteger(value.pageIndex) ||
      Number(value.pageIndex) < 0 ||
      Number(value.pageIndex) >= value.history.length
    )
      return null;
    return value as StoredBookProgress;
  } catch {
    return null;
  }
}

function storeProgress(book: Book, progress: StoredBookProgress): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(progressKey(book), JSON.stringify(progress));
  } catch {
    // Progress persistence must never make a typing lesson unusable.
  }
}

export class BooksLesson extends Lesson {
  static savedParagraphIndex(book: Book): number {
    return loadProgress(book)?.paragraphIndex ?? 0;
  }

  readonly book: Book;
  readonly content: Content;
  wordIndex = 0;
  #paragraphCacheKey = "";
  #paragraphCache: readonly string[] = [];
  #wordListCacheKey = "";
  #wordListCache: readonly string[] = [];
  #history: number[] = [0];
  #pageIndex = 0;
  #progressParagraphIndex = 0;
  #progressSignature = "";
  #generatedCurrentPage = false;

  constructor(
    settings: Settings,
    keyboard: Keyboard,
    model: PhoneticModel,
    { book, content }: BookContent,
  ) {
    super(settings, keyboard, model);
    this.book = book;
    this.content = content;

    const paragraphIndex = this.paragraphIndex;
    const signature = this.#makeProgressSignature();
    const saved = loadProgress(book);
    if (saved != null && saved.paragraphIndex === paragraphIndex) {
      const current = saved.history[saved.pageIndex] ?? 0;
      if (saved.signature === signature) {
        this.#history = [...saved.history];
        this.#pageIndex = saved.pageIndex;
      } else {
        this.#history = [current];
        this.#pageIndex = 0;
      }
    }
    this.#progressParagraphIndex = paragraphIndex;
    this.#progressSignature = signature;
    this.wordIndex = this.#history[this.#pageIndex] ?? 0;
  }

  get paragraphs(): readonly string[] {
    const lettersOnly = this.settings.get(lessonProps.books.lettersOnly);
    const lowercase = this.settings.get(lessonProps.books.lowercase);
    const key = `${Number(lettersOnly)}:${Number(lowercase)}`;
    if (key !== this.#paragraphCacheKey) {
      this.#paragraphCacheKey = key;
      this.#paragraphCache = this.#flattenContent(this.content, lettersOnly, lowercase);
      this.#wordListCacheKey = "";
    }
    return this.#paragraphCache;
  }

  get paragraphIndex(): number {
    const paragraphs = this.paragraphs;
    return clamp(
      this.settings.get(lessonProps.books.paragraphIndex),
      0,
      Math.max(0, paragraphs.length - 1),
    );
  }

  get wordList(): readonly string[] {
    const paragraphs = this.paragraphs;
    const paragraphIndex = this.paragraphIndex;
    const key = `${this.#paragraphCacheKey}:${paragraphIndex}`;
    if (key !== this.#wordListCacheKey) {
      this.#wordListCacheKey = key;
      this.#wordListCache = [
        ...paragraphs.slice(paragraphIndex),
        ...paragraphs.slice(0, paragraphIndex),
      ]
        .map(splitParagraph)
        .flat();
    }
    return this.#wordListCache;
  }

  override get letters() {
    return this.model.letters;
  }

  override update(keyStatsMap: KeyStatsMap) {
    return LessonKeys.includeAll(keyStatsMap, new Target(this.settings));
  }

  override generate() {
    this.#syncProgress();
    if (this.#generatedCurrentPage) {
      this.#moveNext();
    } else {
      this.#generatedCurrentPage = true;
    }
    return this.#generateCurrent();
  }

  generatePrevious(): string | null {
    this.#syncProgress();
    if (this.#pageIndex === 0) return null;
    this.#pageIndex--;
    this.#generatedCurrentPage = true;
    this.#saveProgress();
    return this.#generateCurrent();
  }

  generatePreview(): string {
    const start = this.paragraphIndex === this.#progressParagraphIndex
      ? this.#history[this.#pageIndex] ?? 0
      : 0;
    const cursor = { wordIndex: this.#normalizeWordIndex(start) };
    return generateFragment(this.settings, wordSequence(this.wordList, cursor));
  }

  #moveNext(): void {
    if (this.#pageIndex < this.#history.length - 1) {
      this.#pageIndex++;
    } else {
      this.#history.push(this.#normalizeWordIndex(this.wordIndex));
      this.#pageIndex++;
    }
    this.#saveProgress();
  }

  #generateCurrent(): string {
    const start = this.#normalizeWordIndex(this.#history[this.#pageIndex] ?? 0);
    this.#history[this.#pageIndex] = start;
    this.wordIndex = start;
    this.#saveProgress();
    return generateFragment(this.settings, wordSequence(this.wordList, this));
  }

  #normalizeWordIndex(value: number): number {
    const length = this.wordList.length;
    return length > 0 ? ((value % length) + length) % length : 0;
  }

  #syncProgress(): void {
    const paragraphIndex = this.paragraphIndex;
    const signature = this.#makeProgressSignature();
    if (paragraphIndex !== this.#progressParagraphIndex) {
      this.#history = [0];
      this.#pageIndex = 0;
      this.wordIndex = 0;
      this.#generatedCurrentPage = false;
    } else if (signature !== this.#progressSignature) {
      const current = this.#history[this.#pageIndex] ?? 0;
      this.#history = [current];
      this.#pageIndex = 0;
      this.wordIndex = current;
      this.#generatedCurrentPage = false;
    }
    this.#progressParagraphIndex = paragraphIndex;
    this.#progressSignature = signature;
    this.#saveProgress();
  }

  #makeProgressSignature(): string {
    return [
      this.settings.get(lessonProps.length),
      Number(this.settings.get(lessonProps.books.lettersOnly)),
      Number(this.settings.get(lessonProps.books.lowercase)),
    ].join(":");
  }

  #saveProgress(): void {
    storeProgress(this.book, {
      paragraphIndex: this.#progressParagraphIndex,
      signature: this.#progressSignature,
      history: this.#history,
      pageIndex: this.#pageIndex,
    });
  }

  #flattenContent(content: Content, lettersOnly: boolean, lowercase: boolean) {
    const codePoints = new Set(this.keyboard.getCodePoints());
    if (lettersOnly) {
      for (const codePoint of codePoints) {
        if (!this.model.language.includes(codePoint)) {
          codePoints.delete(codePoint);
        }
      }
    }
    return flattenContent(content).map((paragraph) => {
      let text = filterText(paragraph, codePoints);
      if (lowercase) {
        text = this.model.language.lowerCase(text);
      }
      return text;
    });
  }
}
