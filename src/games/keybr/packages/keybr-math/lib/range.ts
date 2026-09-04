export class Range {
  static from(values: Iterable<number>, ...rest: Iterable<number>[]): Range {
    const range = new Range();
    range.adjust(values);
    for (const values of rest) {
      range.adjust(values);
    }
    return range;
  }

  #min: number = NaN;
  #max: number = NaN;

  constructor();
  constructor(that: Range);
  constructor(min: number, max: number);
  constructor(...args: unknown[]) {
    if (args.length === 0) return;
    if (args.length === 1 && args[0] instanceof Range) {
      this.#min = args[0].#min;
      this.#max = args[0].#max;
      return;
    }
    if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
      this.#min = args[0];
      this.#max = args[1];
      return;
    }
    throw new TypeError();
  }

  get defined(): boolean {
    return this.#min === this.#min && this.#max === this.#max;
  }

  get min(): number {
    return this.#min;
  }

  set min(value: number) {
    this.#min = this.#min === this.#min ? Math.min(this.#min, value) : value;
  }

  get max(): number {
    return this.#max;
  }

  set max(value: number) {
    this.#max = this.#max === this.#max ? Math.max(this.#max, value) : value;
  }

  adjust(values: Iterable<number>): this {
    for (const value of values) {
      this.min = value;
      this.max = value;
    }
    return this;
  }

  get span(): number {
    if (!this.defined) {
      throw new RangeError();
    }
    return this.#max - this.#min;
  }

  normalize(value: number, width: number = 0): number {
    if (!this.defined) {
      throw new RangeError();
    }
    if (this.#max === this.#min) {
      return this.#min;
    } else {
      return (value - this.#min) / (this.#max - this.#min + width);
    }
  }

  round(step: number): this {
    if (!this.defined) {
      throw new RangeError();
    }
    const t0 = this.#max / step;
    const r0 = Math.floor(t0);
    if (t0 !== r0) {
      this.#max = (r0 + 1) * step;
    }
    const t1 = this.#min / step;
    const r1 = Math.ceil(t1);
    if (t1 !== r1) {
      this.#min = (r1 - 1) * step;
    }
    return this;
  }

  *steps(): IterableIterator<number> {
    if (!this.defined) {
      throw new RangeError();
    }
    for (let index = this.#min; index <= this.#max; index++) {
      yield index;
    }
  }
}
