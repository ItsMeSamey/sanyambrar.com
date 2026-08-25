import { type CodePoint, toCodePoints } from "@keybr/unicode";
import { Chain, TransitionTable } from "./transitiontable.ts";

type Entry = { codePoint: CodePoint; frequency: number };

type Segment = Entry[];

function scaleRough(segment: Segment): void {
  const sum = sumFrequencies(segment);
  for (const entry of segment) {
    entry.frequency = Math.max(1, Math.round((255 / sum) * entry.frequency));
  }
}

function scaleFine(segment: Segment): void {
  let sum = sumFrequencies(segment);
  while (sum > 255) {
    let i = 0;
    while (sum > 255 && i < segment.length) {
      const entry = segment[i];
      if (entry.frequency > 1) {
        entry.frequency--;
        sum--;
      }
      i++;
    }
  }
  while (sum < 255) {
    let i = 0;
    while (sum < 255 && i < segment.length) {
      const entry = segment[i];
      entry.frequency++;
      sum++;
      i++;
    }
  }
}

function sumFrequencies(segment: Segment): number {
  let sum = 0;
  for (const entry of segment) {
    sum += entry.frequency;
  }
  return sum;
}

function push(chain: CodePoint[], codePoint: CodePoint): boolean {
  const { length } = chain;
  if (codePoint === 0x0020 && chain[length - 1] === 0x0020) {
    return false;
  }
  for (let i = 0; i < length - 1; i++) {
    chain[i] = chain[i + 1];
  }
  chain[length - 1] = codePoint;
  return true;
}
