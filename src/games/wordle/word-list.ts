import { WORDS } from './words/words.ts'

export type WordLength = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20

const bucket = (wlen: WordLength) => WORDS['w' + wlen]

export const wordCount = (wlen: WordLength) => bucket(wlen).length / wlen

export function wordAt(wlen: WordLength, index: number): string | undefined {
  if (!Number.isInteger(index) || index < 0) return undefined
  const words = bucket(wlen), start = index * wlen
  return start + wlen <= words.length ? words.slice(start, start + wlen) : undefined
}

export function binarySearch(wlen: WordLength, value: string): number {
  const words = bucket(wlen)
  let lo = 0, hi = wordCount(wlen) - 1
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1
    const word = words.slice(mid * wlen, (mid + 1) * wlen)
    if (word === value) return mid
    if (word < value) lo = mid + 1
    else hi = mid - 1
  }
  return -1
}

export function hasPrefix(wlen: WordLength, prefix: string): boolean {
  const words = bucket(wlen), count = wordCount(wlen)
  let lo = 0, hi = count
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (words.slice(mid * wlen, (mid + 1) * wlen) < prefix) lo = mid + 1
    else hi = mid
  }
  return lo < count && words.slice(lo * wlen, (lo + 1) * wlen).startsWith(prefix)
}
