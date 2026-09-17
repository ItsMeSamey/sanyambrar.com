import { filterText } from "../keyboard/filter.ts";
import { type Keyboard } from "../keyboard/keyboard.ts";
import { type PhoneticModel } from "../phonetic-model/phoneticmodel.ts";
import { type RNGStream } from "../rand/types.ts";
import { type KeyStatsMap } from "../result/keystats.ts";
import { type Settings } from "../settings/settings.ts";
import { LessonKeys } from "./key.ts";
import { Lesson } from "./lesson.ts";
import { lessonProps } from "./settings.ts";
import { Target } from "./target.ts";
import { generateFragment } from "./text/fragment.ts";
import { randomWords, uniqueWords, wordSequence } from "./text/words.ts";

export class CustomTextLesson extends Lesson {
  wordIndex = 0;
  #wordListKey = "";
  #wordList: readonly string[] = [];

  constructor(settings: Settings, keyboard: Keyboard, model: PhoneticModel) {
    super(settings, keyboard, model);
  }

  get wordList(): readonly string[] {
    const content = this.settings.get(lessonProps.customText.content);
    const lettersOnly = this.settings.get(lessonProps.customText.lettersOnly);
    const lowercase = this.settings.get(lessonProps.customText.lowercase);
    const key = `${content}\u0000${Number(lettersOnly)}${Number(lowercase)}`;
    if (key !== this.#wordListKey) {
      this.#wordListKey = key;
      this.wordIndex = 0;
      this.#wordList = this.#getWordList(content, lettersOnly, lowercase);
    }
    return this.#wordList;
  }

  override get letters() {
    return this.model.letters;
  }

  override update(keyStatsMap: KeyStatsMap) {
    return LessonKeys.includeAll(keyStatsMap, new Target(this.settings));
  }

  override generate(_lessonKeys: LessonKeys, rng: RNGStream) {
    return generateFragment(this.settings, this.#makeWordGenerator(rng));
  }

  #makeWordGenerator(rng: RNGStream) {
    const randomize = this.settings.get(lessonProps.customText.randomize);
    if (randomize && this.wordList.length > 0) {
      return uniqueWords(randomWords(this.wordList, rng));
    } else {
      return wordSequence(this.wordList, this);
    }
  }

  #getWordList(content: string, lettersOnly: boolean, lowercase: boolean) {
    const codePoints = new Set(this.codePoints);
    if (lettersOnly) {
      for (const codePoint of codePoints) {
        if (!this.model.language.includes(codePoint)) {
          codePoints.delete(codePoint);
        }
      }
    }
    let text = filterText(content, codePoints);
    if (lowercase) {
      text = this.model.language.lowerCase(text);
    }
    return text.split(/\s+/);
  }
}
