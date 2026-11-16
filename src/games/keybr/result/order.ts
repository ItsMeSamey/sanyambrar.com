import { type Result } from "./result.ts";

// Stable sorting preserves duplicate lessons and the import order of equal timestamps.
export function orderResults(results: readonly Result[]): Result[] {
  return [...results].sort((a, b) => a.timeStamp - b.timeStamp);
}
