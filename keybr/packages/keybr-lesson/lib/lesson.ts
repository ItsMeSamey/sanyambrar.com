import {
  type Keyboard,
  KeyboardOptions,
  type WeightedCodePointSet,
} from "@keybr/keyboard";
import { type Letter, PhoneticModel } from "@keybr/phonetic-model";
import { LCG, type RNGStream } from "@keybr/rand";
import { type KeyStatsMap, type Result } from "@keybr/result";
import { type Settings } from "@keybr/settings";
import { type StyledText } from "@keybr/textinput";
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
