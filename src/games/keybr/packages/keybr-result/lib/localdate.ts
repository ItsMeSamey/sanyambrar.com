import { isNumber } from "@keybr/lang";

export enum Month {
  January = 1,
  February = 2,
  March = 3,
  April = 4,
  May = 5,
  June = 6,
  July = 7,
  August = 8,
  September = 9,
  October = 10,
  November = 11,
  December = 12,
}

export enum DayOfWeek {
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6,
  Sunday = 7,
}

/**
 * A tuple consisting of a year, a month, and a day of the month,
 * all in the local timezone.
 */
export class LocalDate {
  /** The year number in a local timezone, four digits. */
  readonly year: number;
  /** The month number in a local timezone, 1-12. */
  readonly month: Month;
  /** The day of month number in a local timezone, 1-31. */
  readonly dayOfMonth: number;
  /** The day of week number in a local timezone, 1-7. */
  readonly dayOfWeek: DayOfWeek;
  /** The timestamp of midnight in the UTC timezone, milliseconds. */
  readonly timeStamp: number;
  /** The string value formatted as YYYY-MM-DD. */
  readonly value: string;

  static now(): LocalDate {
    return new LocalDate(Date.now());
  }

  /**
   * Creates a local date with the given year, month, and day.
   * @param year A year number, four digits.
   * @param month A month number, 1-12.
   * @param day A day of the month number, 1-31.
   */
  constructor(year: number, month: number, day: number);
  /**
   * Creates a local date from the given timestamp in the UTC zone.
   * @param timeStamp A timestamp in the UTC timezone, milliseconds.
   */
  constructor(timeStamp: number);
  /**
   * Creates a local date from the given date instance.
   * @param date A date instance.
   */
  constructor(date: Date);
  constructor(...args: unknown[]) {
    let date: Date;
    if (args.length === 3 && isNumber(args[0]) && isNumber(args[1]) && isNumber(args[2])) {
      const [year, month, day] = args;
      date = new Date(year, month - 1, day);
      if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        throw new Error(process.env.NODE_ENV !== "production" ? "Invalid local date arguments" : undefined);
      }
    } else if (args.length === 1 && isNumber(args[0])) {
      date = new Date(args[0]);
    } else if (args.length === 1 && args[0] instanceof Date) {
      date = new Date(args[0].getTime());
    } else {
      throw new TypeError(process.env.NODE_ENV !== "production" ? "Invalid local date arguments" : undefined);
    }
    date.setHours(0, 0, 0, 0);
    this.year = date.getFullYear();
    this.month = date.getMonth() + 1;
    this.dayOfMonth = date.getDate();
    const dayOfWeek = date.getDay() || 7;
    this.dayOfWeek = dayOfWeek;
    this.timeStamp = date.getTime();
    this.value = `${this.year}-${String(this.month).padStart(2, "0")}-${String(this.dayOfMonth).padStart(2, "0")}`;
    Object.freeze(this);
  }

  plusDays(days: number): LocalDate {
    const date = new Date(this.timeStamp);
    date.setDate(date.getDate() + days);
    return new LocalDate(date);
  }

  minusDays(days: number): LocalDate {
    const date = new Date(this.timeStamp);
    date.setDate(date.getDate() - days);
    return new LocalDate(date);
  }

  toString() {
    return this.value;
  }

  valueOf() {
    return this.timeStamp;
  }
}

export class LocalDateRange {
  readonly #from: LocalDate;
  readonly #to: LocalDate;

  constructor(from: LocalDate, to: LocalDate) {
    this.#from = from;
    this.#to = to;
  }

  get from(): LocalDate {
    return this.#from;
  }

  get to(): LocalDate {
    return this.#to;
  }

  includes(timeStamp: number): boolean {
    return this.#from.timeStamp <= timeStamp && timeStamp < this.#to.timeStamp;
  }

  toString() {
    return `${this.#from} - ${this.#to}`;
  }
}

export class Today extends LocalDateRange {
  constructor(now = LocalDate.now()) {
    super(now, now.plusDays(1));
  }
}
