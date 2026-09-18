import { type LessonKey } from "../../lesson/key.ts";

 type NewLetterEvent = {
  readonly type: "new-letter";
  readonly lessonKey: LessonKey;
};

 type TopSpeedEvent = {
  readonly type: "top-speed";
  readonly speed: number;
  readonly previous: number;
};

 type TopScoreEvent = {
  readonly type: "top-score";
  readonly score: number;
  readonly previous: number;
};

 type DailyGoalEvent = {
  readonly type: "daily-goal";
};

export type LessonEvent =
  | NewLetterEvent
  | TopSpeedEvent
  | TopScoreEvent
  | DailyGoalEvent;

export type LessonEventListener = (event: LessonEvent) => void;
