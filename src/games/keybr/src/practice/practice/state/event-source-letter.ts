import { type Lesson } from "../../../lesson/lesson.ts";
import { type Letter } from "../../../phonetic-model/letter.ts";
import { type KeyStatsMap } from "../../../result/keystats.ts";
import { type Result } from "../../../result/result.ts";
import {
  type LessonEventListener,
  type LessonEventSource,
} from "./event-types.ts";

export class LetterEvents implements LessonEventSource {
  readonly #lesson: Lesson;
  readonly #keyStatsMap: KeyStatsMap;
  readonly #included: Set<Letter>;

  constructor(lesson: Lesson, keyStatsMap: KeyStatsMap) {
    this.#lesson = lesson;
    this.#keyStatsMap = keyStatsMap;
    this.#included = new Set();
    const lessonKeys = this.#lesson.update(this.#keyStatsMap);
    for (const lessonKey of lessonKeys.findIncludedKeys()) {
      if (!this.#included.has(lessonKey.letter)) {
        this.#included.add(lessonKey.letter);
      }
    }
  }

  append(_result: Result, listener: LessonEventListener): void {
    const lessonKeys = this.#lesson.update(this.#keyStatsMap);
    for (const lessonKey of lessonKeys.findIncludedKeys()) {
      if (!this.#included.has(lessonKey.letter)) {
        this.#included.add(lessonKey.letter);
        listener({ type: "new-letter", lessonKey });
      }
    }
  }
}
