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

export class BooksLesson extends Lesson {
  readonly book: Book;
  readonly content: Content;
  wordIndex = 0;
  #paragraphCacheKey = "";
  #paragraphCache: readonly string[] = [];
  #wordListCacheKey = "";
  #wordListCache: readonly string[] = [];

  constructor(
    settings: Settings,
    keyboard: Keyboard,
    model: PhoneticModel,
    { book, content }: BookContent,
  ) {
    super(settings, keyboard, model);
    this.book = book;
    this.content = content;
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
      this.wordIndex = 0;
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
    return generateFragment(this.settings, wordSequence(this.wordList, this));
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
