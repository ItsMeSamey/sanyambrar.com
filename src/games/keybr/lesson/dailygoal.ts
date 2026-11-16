import { type Result } from "../result/result.ts";
import { Today } from "../result/localdate.ts";
import { type Settings } from "../settings/settings.ts";
import { lessonProps } from "./settings.ts";

export type DailyGoal = {
  /** Daily goal in minutes. */
  readonly goal: number;
  /** Progress ratio. Values above 1 represent progress beyond the daily goal. */
  readonly value: number;
};

export class MutableDailyGoal implements DailyGoal {
  readonly #goal: number;
  #today: Today;
  readonly #clock: () => Today;
  #time: number;
  #value: number;

  constructor(settings: Settings, today: Today | (() => Today) = () => new Today()) {
    this.#goal = settings.get(lessonProps.dailyGoal);
    this.#clock = typeof today === 'function' ? today : () => today;
    this.#today = this.#clock();
    this.#time = 0;
    this.#value = 0;
  }

  get goal(): number {
    return this.#goal;
  }

  get value(): number {
    this.#refreshDay();
    return this.#value;
  }

  append(result: Result) {
    this.#refreshDay();
    if (this.#today.includes(result.timeStamp)) {
      this.#time += result.time;
      this.#value = this.measure(this.#time);
    }
  }

  measure(time: number): number {
    return this.#goal > 0 ? time / 1000 / 60 / this.#goal : 0;
  }

  copy(): DailyGoal {
    return { goal: this.#goal, value: this.value };
  }

  #refreshDay(): void {
    const today = this.#clock();
    if (today.from.timeStamp !== this.#today.from.timeStamp) {
      this.#today = today;
      this.#time = 0;
      this.#value = 0;
    }
  }
}
