type LoadingEventListener = (event: { readonly total: number; readonly current: number }) => void;
import { type Lesson } from "../../lesson/lesson.ts";
import { type Letter } from "../../phonetic-model/letter.ts";
import { MutableDailyGoal } from "../../lesson/dailygoal.ts";
import { MutableKeyStatsMap } from "../../result/keystats.ts";
import { MutableStreakList } from "../../result/accuracy.ts";
import { MutableSummaryStats } from "../../result/summarystats.ts";
import { type Result } from "../../result/result.ts";
import { type Settings } from "../../settings/settings.ts";
import { type LessonEventListener } from "./event-types.ts";

export class Progress {
  readonly #settings: Settings;
  readonly #lesson: Lesson;
  readonly #results: Result[];
  readonly #keyStatsMap: MutableKeyStatsMap;
  readonly #summaryStats: MutableSummaryStats;
  readonly #streakList: MutableStreakList;
  readonly #dailyGoal: MutableDailyGoal;
  readonly #included = new Set<Letter>();
  #resultCount = 0;
  #topSpeed = 0;
  #topScore = 0;
  #lastDailyGoalValue = 0;

  constructor(settings: Settings, lesson: Lesson) {
    this.#settings = settings;
    this.#lesson = lesson;
    this.#results = [];
    this.#keyStatsMap = new MutableKeyStatsMap(this.#lesson.letters);
    this.#summaryStats = new MutableSummaryStats();
    this.#streakList = new MutableStreakList();
    this.#dailyGoal = new MutableDailyGoal(this.#settings);

    for (const lessonKey of this.#lesson.update(this.#keyStatsMap).findIncludedKeys()) {
      this.#included.add(lessonKey.letter);
    }
  }

  async *seedAsync(
    results: readonly Result[],
    listener: LoadingEventListener | null = null,
  ) {
    // We assume that the given array of results is append-only,
    // so finding new results is a matter of comparing the array lengths.
    // This function appends all the remaining results in chunks.
    // The returned async iterator must be called repeatedly
    // to complete the seeding.
    while (true) {
      const { length } = this.#results;
      if (length < results.length) {
        for (const result of results.slice(length, length + 100)) {
          this.append(result);
        }
        if (listener != null) {
          listener({ total: results.length, current: length });
        }
        yield null; // Yield to the browser event loop, unfreeze the UI.
      } else {
        break;
      }
    }
  }

  seed(results: readonly Result[]) {
    // We assume that the given array of results is append-only,
    // so finding new results is a matter of comparing the array lengths.
    // This function appends all the remaining results.
    const { length } = this.#results;
    if (length < results.length) {
      for (const result of results.slice(length)) {
        this.append(result);
      }
    }
  }

  append(result: Result, listener: LessonEventListener = () => {}) {
    this.#results.push(result);
    this.#keyStatsMap.append(result);
    this.#summaryStats.append(result);
    this.#streakList.append(result);
    this.#dailyGoal.append(result);
    this.#appendEvents(result, listener);
  }

  #appendEvents(result: Result, listener: LessonEventListener): void {
    for (const lessonKey of this.#lesson.update(this.#keyStatsMap).findIncludedKeys()) {
      if (!this.#included.has(lessonKey.letter)) {
        this.#included.add(lessonKey.letter);
        listener({ type: "new-letter", lessonKey });
      }
    }

    this.#resultCount += 1;
    if (result.speed > this.#topSpeed) {
      if (this.#resultCount >= 3) {
        listener({ type: "top-speed", speed: result.speed, previous: this.#topSpeed });
      }
      this.#topSpeed = result.speed;
    }
    if (result.score > this.#topScore) {
      if (this.#resultCount >= 3) {
        listener({ type: "top-score", score: result.score, previous: this.#topScore });
      }
      this.#topScore = result.score;
    }
    if (this.#lastDailyGoalValue < 1 && this.#dailyGoal.value >= 1) {
      listener({ type: "daily-goal" });
    }
    this.#lastDailyGoalValue = this.#dailyGoal.value;
  }

  get settings() {
    return this.#settings;
  }

  get lesson() {
    return this.#lesson;
  }

  get keyStatsMap() {
    return this.#keyStatsMap;
  }

  get summaryStats() {
    return this.#summaryStats;
  }

  get streakList() {
    return this.#streakList;
  }

  get dailyGoal() {
    return this.#dailyGoal;
  }
}
