/* Pair object artwork: Microsoft Fluent Emoji Color.
Source: https://github.com/microsoft/fluentui-emoji/tree/1ffb34c752ecf5d402f04cfb4b392c77f57c54bc
    MIT License

    Copyright (c) Microsoft Corporation.

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE

*/
import artwork from './pair-artwork.json';

export type PairObject = { name: string; viewBox?: string; svg?: string; number?: number };
export type PairCard = { index: number; value: number; object: PairObject; artwork: string };
let instance = 0;

export function shufflePairs<T>(values: readonly T[], random: () => number = Math.random): T[] {
  const shuffled = [...values];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function selectPairObjects(count: number, random: () => number = Math.random): PairObject[] {
  const pool = shufflePairs(artwork, random);
  return Array.from({ length: count }, (_, index) => pool[index] ?? {
    name: String(index - pool.length + 1), number: index - pool.length + 1,
  });
}

export function pairArtwork(object: PairObject): string {
  // The trusted bundled artwork namespaces filters and gradients per mounted face.
  return object.svg?.replaceAll('__PAIR_ID__', `pair-art-${++instance}-`) ?? '';
}

export function createPairDeck(round: number, random: () => number = Math.random): PairCard[] {
  const objects = selectPairObjects(round + 2, random);
  return shufflePairs(Array.from({ length: objects.length * 2 }, (_, index) => index % objects.length), random)
    .map((value, index) => ({ index, value, object: objects[value], artwork: pairArtwork(objects[value]) }));
}
