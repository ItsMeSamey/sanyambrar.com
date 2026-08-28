import { type LoadingEventListener } from "@keybr/lang";
import { type Lesson, MutableDailyGoal } from "@keybr/lesson";
import {
  MutableKeyStatsMap,
  MutableStreakList,
  MutableSummaryStats,
  type Result,
} from "@keybr/result";
import { type Settings } from "@keybr/settings";

export class Progress {
  readonly #results: Result[] = [];
  readonly #keyStatsMap;
  readonly #summaryStats = new MutableSummaryStats();
  readonly #streakList = new MutableStreakList();
  readonly #dailyGoal;

  constructor(readonly settings: Settings, readonly lesson: Lesson) {
    this.#keyStatsMap = new MutableKeyStatsMap(lesson.letters);
    this.#dailyGoal = new MutableDailyGoal(settings);
  }

  async *seedAsync(results: readonly Result[], listener: LoadingEventListener | null = null) {
    while (this.#results.length < results.length) {
      const end = Math.min(this.#results.length + 1000, results.length);
      while (this.#results.length < end) this.append(results[this.#results.length]);
      listener?.({ total: results.length, current: end });
      yield null;
    }
  }

  append(result: Result) {
    this.#results.push(result);
    this.#keyStatsMap.append(result);
    this.#summaryStats.append(result);
    this.#streakList.append(result);
    this.#dailyGoal.append(result);
  }

  get keyStatsMap() { return this.#keyStatsMap; }
  get summaryStats() { return this.#summaryStats; }
  get streakList() { return this.#streakList; }
  get dailyGoal() { return this.#dailyGoal; }
}
