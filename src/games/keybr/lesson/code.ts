import { type Keyboard } from "../keyboard/keyboard.ts";
import { Letter } from "../phonetic-model/letter.ts";
import { type PhoneticModel } from "../phonetic-model/phoneticmodel.ts";
import { type RNGStream } from "../rand/types.ts";
import { type KeyStatsMap } from "../result/keystats.ts";
import { type Settings } from "../settings/settings.ts";
import { LessonKeys } from "./key.ts";
import { Lesson } from "./lesson.ts";
import { lessonProps } from "./settings.ts";
import { Target } from "./target.ts";

export class CodeLesson extends Lesson {
  constructor(settings: Settings, keyboard: Keyboard, model: PhoneticModel) {
    super(settings, keyboard, model);
  }

  override get letters(): readonly Letter[] {
    return Letter.programming;
  }

  override update(keyStatsMap: KeyStatsMap) {
    return LessonKeys.includeAll(keyStatsMap, new Target(this.settings));
  }

  override generate(_lessonKeys: LessonKeys, rng: RNGStream) {
    const syntax = this.settings.get(lessonProps.code.syntax);
    const flags = this.settings.get(lessonProps.code.flags);
    return syntax.generate(new Set(flags), rng);
  }
}
