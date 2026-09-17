import { type RNG } from "./types.ts";

/**
 * Selects a random element from the given list of uniform elements.
 * @param list A list of uniform elements to sample from.
 * @param random A random number generator function.
 * @return A random element sampled from the list.
 */
export function randomSample<T>(
  list: readonly T[],
  random: RNG = Math.random,
): T {
  const { length } = list;
  if (length === 0) {
    throw new Error();
  }
  return list[(random() * length) | 0];
}

/**
 * Selects a random element from the given list of weighted elements.
 * @param list A list of weighted elements to sample from.
 * @param weight A function that gives weights to elements.
 * @param random A random number generator function.
 * @return A random element sampled from the list.
 */
export function weightedRandomSample<T>(
  list: readonly T[],
  weight: (v: T) => number,
  random: RNG = Math.random,
): T {
  const { length } = list;
  if (length === 0) {
    throw new Error();
  }
  let sum = 0;
  for (const v of list) {
    sum += weight(v);
  }
  let r = random() * sum;
  for (const v of list) {
    const w = weight(v);
    if (r <= w) {
      return v;
    }
    r -= w;
  }
  throw new Error();
}
