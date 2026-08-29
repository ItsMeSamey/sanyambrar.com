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

function lowerBound(wlen: WordLength, value: string): number {
  const words = bucket(wlen), count = wordCount(wlen)
  let lo = 0, hi = count
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (words.slice(mid * wlen, (mid + 1) * wlen) < value) lo = mid + 1
    else hi = mid
  }
  return lo
}

export function hasPrefix(wlen: WordLength, prefix: string): boolean {
  const index = lowerBound(wlen, prefix)
  const word = wordAt(wlen, index)
  return word?.startsWith(prefix) ?? false
}

/**
 * Returns next letters that have at least one complete dictionary continuation
 * which does not use an excluded letter anywhere in the resulting word.
 *
 * This is stricter than a prefix-only lookup: a prefix such as `ca` is not
 * considered playable through `r` if every `car..` word later requires a
 * disabled key.
 */
export function playableNextLetters(wlen: WordLength, prefix: string, excluded: string): string {
  const normalizedPrefix = prefix.toLowerCase()
  const excludedSet = new Set(excluded.toLowerCase())
  if (normalizedPrefix.length >= wlen || [...normalizedPrefix].some(letter => excludedSet.has(letter))) return ''

  const words = bucket(wlen), count = wordCount(wlen)
  const next = new Set<string>()
  for (let index = lowerBound(wlen, normalizedPrefix); index < count; index++) {
    const start = index * wlen
    const word = words.slice(start, start + wlen)
    if (!word.startsWith(normalizedPrefix)) break
    if ([...word].some(letter => excludedSet.has(letter))) continue
    next.add(word[normalizedPrefix.length])
    if (next.size === 26) break
  }
  return [...next].sort().join('')
}
