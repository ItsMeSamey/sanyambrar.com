export type RNG = {
  /** Generates next pseudo-random number in range 0 <= value < 1. */
  (): number;
};

export type RNGStream = RNG;
