import * as names from "./names.module.css";
export { names };

export type Names = {
  readonly speed?: string;
  readonly accuracy?: string;
  readonly score?: string;
  readonly keySet?: string;
  readonly currentKey?: string;
  readonly streakList?: string;
  readonly dailyGoal?: string;
};
