import { type Keyboard } from "../keyboard/keyboard.ts";
import { KeyboardOptions } from "../keyboard/settings.ts";
import { type WeightedCodePointSet } from "../keyboard/types.ts";
import { type Letter } from "../phonetic-model/letter.ts";
import { PhoneticModel } from "../phonetic-model/phoneticmodel.ts";
import { LCG } from "../rand/rng/lcg.ts";
import { type RNGStream } from "../rand/types.ts";
import { type KeyStatsMap } from "../result/keystats.ts";
import { type Result } from "../result/result.ts";
import { type Settings } from "../settings/settings.ts";
import { type StyledText } from "../textinput/chars.ts";
import { type LessonKeys } from "./key.ts";

export abstract class Lesson {
  static rng: RNGStream = LCG(Date.now());

  readonly settings: Settings;
  readonly keyboard: Keyboard;
  readonly codePoints: WeightedCodePointSet;
  readonly model: PhoneticModel;

  protected constructor(
    settings: Settings,
    keyboard: Keyboard,
    model: PhoneticModel,
  ) {
    this.settings = settings;
    this.keyboard = keyboard;
    this.codePoints = keyboard.getCodePoints();
    this.model = PhoneticModel.restrict(model, this.codePoints);
  }

  filter(results: readonly Result[]): readonly Result[] {
    const family = KeyboardOptions.from(this.settings).layout.family;
    return results.filter(({ layout }) => layout.family === family);
  }

  abstract get letters(): readonly Letter[];

  abstract update(keyStatsMap: KeyStatsMap): LessonKeys;

  abstract generate(lessonKeys: LessonKeys, rng: RNGStream): StyledText;
}
