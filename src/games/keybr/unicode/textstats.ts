import { toCodePoints } from "./codepoints.ts";
import { isWhitespace } from "./whitespace.ts";

export type TextStats = {
  readonly numWhitespace: number;
  readonly numCharacters: number;
  readonly numWords: number;
  readonly numUniqueWords: number;
  readonly avgWordLength: number;
  readonly wordCount: readonly WordCount[];
};

type WordCount = {
  readonly word: string;
  readonly count: number;
};

function createTextStats(locale: string | Intl.Locale) {
  if (typeof locale === "string") {
    locale = new Intl.Locale(locale);
  }
  const words = new Intl.Segmenter(locale, { granularity: "word" });
  const graphemes = new Intl.Segmenter(locale, { granularity: "grapheme" });
  const collator = new Intl.Collator(locale);
  const counts = new Map<string, number>();
  const lengths = new Map<string, number>();
  let numWhitespace = 0;
  let numCharacters = 0;
  let numWords = 0;
  let lenWords = 0;

  const wordLength = (word: string): number => {
    let length = lengths.get(word);
    if (length == null) {
      length = 0;
      for (const _grapheme of graphemes.segment(word)) {
        length += 1;
      }
      lengths.set(word, length);
    }
    return length;
  };

  const append = (text: string): void => {
    for (const { segment, isWordLike } of words.segment(text.normalize())) {
      if (isWordLike) {
        numWords += 1;
        const word = segment.toLocaleLowerCase(locale);
        counts.set(word, (counts.get(word) ?? 0) + 1);
        const length = wordLength(word);
        lenWords += length;
        numCharacters += length;
      } else {
        if (segment === " ") {
          numWhitespace += 1;
        } else {
          for (const codePoint of toCodePoints(segment)) {
            if (isWhitespace(codePoint)) {
              numWhitespace += 1;
            } else {
              numCharacters += 1;
            }
          }
        }
      }
    }
  };

  const finish = (): TextStats => ({
    numWhitespace,
    numCharacters,
    numWords,
    numUniqueWords: counts.size,
    avgWordLength: numWords > 0 ? lenWords / numWords : 0,
    wordCount: Array.from(counts.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count || collator.compare(a.word, b.word)),
  });
  return { append, finish };
}

export const textStatsOf = (
  locale: string | Intl.Locale,
  text: string | readonly string[],
): TextStats => {
  const stats = createTextStats(locale);
  if (Array.isArray(text)) {
    for (const item of text) stats.append(item as string);
  } else {
    stats.append(text as string);
  }
  return stats.finish();
};

const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Computes the same statistics as textStatsOf without monopolizing the main
 * thread for large books. Paragraph boundaries are already semantic token
 * boundaries, so yielding between them preserves exact results.
 */
export async function textStatsOfAsync(
  locale: string | Intl.Locale,
  text: readonly string[],
  budgetMs = 8,
): Promise<TextStats> {
  const stats = createTextStats(locale);
  let sliceStarted = performance.now();
  for (const item of text) {
    stats.append(item);
    if (performance.now() - sliceStarted < budgetMs) continue;
    await yieldToMain();
    sliceStarted = performance.now();
  }
  return stats.finish();
}
