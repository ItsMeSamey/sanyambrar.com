export type Sample = Readonly<{ index: number; pmf: number; cdf: number }>;

/** Empirical discrete distribution used by the original Keybr charts. */
export class Distribution implements Iterable<Sample> {
  readonly #samples: Float64Array;
  readonly #pmf: Float64Array;
  readonly #cdf: Float64Array;

  constructor(samples: readonly number[]) {
    this.#samples = new Float64Array(samples);
    this.#pmf = new Float64Array(samples.length);
    this.#cdf = new Float64Array(samples.length);
    const total = samples.reduce((sum, value) => sum + value, 0);
    let running = 0;
    for (let i = 0; i < samples.length; i++) {
      this.#pmf[i] = total > 0 ? samples[i] / total : 0;
      this.#cdf[i] = running += this.#pmf[i];
    }
  }

  *[Symbol.iterator](): IterableIterator<Sample> {
    for (let i = 0; i < this.#samples.length; i++) {
      yield { index: i, pmf: this.pmf(i), cdf: this.cdf(i) };
    }
  }

  get length(): number {
    return this.#samples.length;
  }

  pmf(index: number): number {
    index = Math.round(index);
    return index >= 0 && index < this.length ? this.#pmf[index] : 0;
  }

  cdf(index: number): number {
    index = Math.round(index);
    if (index < 0) return 0;
    if (index >= this.length) return 1;
    return this.#cdf[index];
  }
}
