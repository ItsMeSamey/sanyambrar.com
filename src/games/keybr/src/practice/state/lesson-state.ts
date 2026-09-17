import { keyboardProps } from "../../keyboard/settings.ts";
import { type KeyId } from "../../keyboard/types.ts";
import { BooksLesson } from "../../lesson/books.ts";
import { type DailyGoal } from "../../lesson/dailygoal.ts";
import { Lesson } from "../../lesson/lesson.ts";
import { type LessonKeys } from "../../lesson/key.ts";
import { lessonProps } from "../../lesson/settings.ts";
import { type KeyStatsMap } from "../../result/keystats.ts";
import { Result } from "../../result/result.ts";
import { type StreakList } from "../../result/accuracy.ts";
import { type SummaryStats } from "../../result/summarystats.ts";
import { type Settings } from "../../settings/settings.ts";
import { type Feedback, TextInput } from "../../textinput/textinput.ts";
import { type LineList, type StyledText } from "../../textinput/chars.ts";
import { makeStats } from "../../textinput/stats.ts";
import { type TextDisplaySettings, type TextInputSettings, toTextDisplaySettings, toTextInputSettings } from "../../textinput/settings.ts";
import { type IInputEvent } from "../../textinput-events/types.ts";
import { type CodePoint } from "../../unicode/types.ts";
import { type Progress } from "./progress.ts";

export class LessonState {
  readonly settings: Settings;
  readonly lesson: Lesson;
  readonly textInputSettings: TextInputSettings;
  readonly textDisplaySettings: TextDisplaySettings;
  readonly keyStatsMap: KeyStatsMap;
  readonly summaryStats: SummaryStats;
  readonly streakList: StreakList;
  readonly dailyGoal: DailyGoal;
  readonly lessonKeys: LessonKeys;

  textInput!: TextInput; // Mutable.
  lines!: LineList; // Mutable.
  suffix!: readonly CodePoint[]; // Mutable.
  depressedKeys: readonly KeyId[] = []; // Mutable.

  constructor(progress: Progress) {
    this.settings = progress.settings;
    this.lesson = progress.lesson;
    this.textInputSettings = toTextInputSettings(this.settings);
    this.textDisplaySettings = toTextDisplaySettings(this.settings);
    this.keyStatsMap = progress.keyStatsMap.copy();
    this.summaryStats = progress.summaryStats.copy();
    this.streakList = progress.streakList.copy();
    this.dailyGoal = progress.dailyGoal.copy();
    this.lessonKeys = this.lesson.update(this.keyStatsMap);
    this.#reset(this.lesson.generate(this.lessonKeys, Lesson.rng));
  }

  resetLesson() {
    this.#reset(this.textInput.text);
  }

  previousLesson() {
    if (this.lesson instanceof BooksLesson) {
      const previous = this.lesson.generatePrevious();
      if (previous != null) {
        this.#reset(previous);
        return;
      }
    }
    this.resetLesson();
  }

  skipLesson() {
    this.#reset(this.lesson.generate(this.lessonKeys, Lesson.rng));
  }

  onInput(event: IInputEvent): { feedback: Feedback; result: Result | null } {
    const feedback = this.textInput.onInput(event);
    this.lines = this.textInput.lines;
    this.suffix = this.textInput.remaining.map(({ codePoint }) => codePoint);
    return {
      feedback,
      result: this.textInput.completed ? this.#makeResult() : null,
    };
  }

  #reset(fragment: StyledText) {
    this.textInput = new TextInput(fragment, this.textInputSettings);
    this.lines = this.textInput.lines;
    this.suffix = this.textInput.remaining.map(({ codePoint }) => codePoint);
  }

  #makeResult(timeStamp = Date.now()) {
    return Result.fromStats(
      this.settings.get(keyboardProps.layout),
      this.settings.get(lessonProps.type).textType,
      timeStamp,
      makeStats(this.textInput.steps),
    );
  }
}
