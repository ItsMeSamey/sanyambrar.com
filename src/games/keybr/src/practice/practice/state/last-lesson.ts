import { Ngram2 } from "../../../keyboard/ngram.ts";
import { Histogram } from "../../../math/histogram.ts";
import { KeySet } from "../../../math/keyset.ts";
import { type Result } from "../../../result/result.ts";
import { type Step } from "../../../textinput/textinput.ts";
import { type HasCodePoint } from "../../../unicode/types.ts";

export type LastLesson = {
  readonly result: Result;
  readonly hits: Histogram<HasCodePoint>;
  readonly misses: Histogram<HasCodePoint>;
  readonly hits2: Ngram2;
  readonly misses2: Ngram2;
};

export function makeLastLesson(
  result: Result,
  steps: readonly Step[],
): LastLesson {
  const keySet = new KeySet<HasCodePoint>([]);
  const hits = new Histogram(keySet);
  const misses = new Histogram(keySet);
  for (const { codePoint, hitCount, missCount } of result.histogram) {
    hits.set({ codePoint }, hitCount);
    misses.set({ codePoint }, missCount);
  }
  const alphabet = [...new Set(steps.map(({ codePoint }) => codePoint))].sort(
    (a, b) => a - b,
  );
  const hits2 = new Ngram2(alphabet);
  const misses2 = new Ngram2(alphabet);
  for (let i = 0; i < steps.length - 1; i++) {
    hits2.add(steps[i].codePoint, steps[i + 1].codePoint, 1);
  }
  return { result, hits, misses, hits2, misses2 };
}
