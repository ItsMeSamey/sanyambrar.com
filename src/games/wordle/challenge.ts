'use strict'

import { wordAt, wordCount, type WordLength } from './word-list'

export type GameMode = 'daily' | 'random' | 'advanced'

export interface ChallengeConfig {
  mode: GameMode
  wordLength: WordLength
  maxTries: number
  disabledLetters: number
  allowAny: boolean
  dailyDate?: string
  dailyVersion?: number
  randomId?: string
  wordIndex?: number
}

export interface DailyChallenge extends ChallengeConfig {
  mode: 'daily'
  dailyDate: string
  dailyVersion: number
  word: string
  disabled: string
}

export const DAILY_CHALLENGE_VERSION = 1
export const LEGACY_DAILY_CHALLENGE_VERSION = 1

const AUTO_LENGTHS: WordLength[] = [3, 4, 5, 6, 7, 8, 9, 10]
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'

export function localDateKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function hash32(text: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h += h << 13
  h ^= h >>> 7
  h += h << 3
  h ^= h >>> 17
  h += h << 5
  return h >>> 0
}

function seeded(seed: string) {
  let value = hash32(seed) || 0x6d2b79f5
  return () => {
    value += 0x6d2b79f5
    let t = value
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function autoDifficulty(wordLength: WordLength) {
  // Short words expose less information per guess, so they get both more guesses
  // and a smaller usable alphabet. Long words need less assistance.
  if (wordLength === 3) return {maxTries: 8, disabledLetters: 9}
  if (wordLength === 4) return {maxTries: 7, disabledLetters: 7}
  if (wordLength === 5) return {maxTries: 7, disabledLetters: 5}
  if (wordLength === 6) return {maxTries: 6, disabledLetters: 4}
  if (wordLength === 7) return {maxTries: 6, disabledLetters: 3}
  if (wordLength === 8) return {maxTries: 6, disabledLetters: 2}
  if (wordLength === 9) return {maxTries: 6, disabledLetters: 1}
  return {maxTries: 6, disabledLetters: 0}
}

function weightedAutoLength(random: () => number): WordLength {
  // Keep the familiar 4–7 letter range common without making 3/8/9/10 rare curiosities.
  const weights = [7, 16, 22, 22, 16, 9, 5, 3]
  const total = weights.reduce((sum, value) => sum + value, 0)
  let pick = random() * total
  for (let i = 0; i < weights.length; i++) {
    pick -= weights[i]
    if (pick < 0) return AUTO_LENGTHS[i]
  }
  return 6
}

function wordQuality(word: string): boolean {
  const vowels = [...word].filter(char => 'aeiouy'.includes(char)).length
  const unique = new Set(word).size
  return vowels >= 1 && vowels <= Math.ceil(word.length * .7) && unique >= Math.min(3, word.length)
}

function seededWord(wordLength: WordLength, seed: string): string {
  const count = wordCount(wordLength)
  const random = seeded(seed)
  const start = Math.floor(random() * count)
  // Deterministic quality pass avoids many pathological dictionary entries while
  // still guaranteeing a result from the existing word list.
  for (let offset = 0; offset < Math.min(count, 512); offset++) {
    const candidate = wordAt(wordLength, (start + offset * 7919) % count)!
    if (wordQuality(candidate)) return candidate
  }
  return wordAt(wordLength, start)!
}

export function disabledLettersForWord(word: string, count: number, seed: string): string {
  const used = new Set(word.toLowerCase())
  const available = [...ALPHABET].filter(char => !used.has(char))
  const random = seeded(seed)
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[available[i], available[j]] = [available[j], available[i]]
  }
  return available.slice(0, Math.max(0, Math.min(count, available.length))).sort().join('')
}

function getDailyChallengeV1(date: string): DailyChallenge {
  // Version 1 intentionally preserves the original daily seed strings exactly.
  // Future daily generators must get a new version instead of changing these seeds.
  const random = seeded(`samey-wordle/daily/config/${date}`)
  const wordLength = weightedAutoLength(random)
  const difficulty = autoDifficulty(wordLength)
  const word = seededWord(wordLength, `samey-wordle/daily/word/${date}/${wordLength}`)
  return {
    mode: 'daily',
    dailyDate: date,
    dailyVersion: 1,
    wordLength,
    ...difficulty,
    allowAny: false,
    word,
    disabled: disabledLettersForWord(word, difficulty.disabledLetters, `samey-wordle/daily/disabled/${date}/${word}`),
  }
}

export function isDailyChallengeVersion(version: number): boolean {
  return version === 1
}

export function getDailyChallenge(date: string, version = DAILY_CHALLENGE_VERSION): DailyChallenge {
  if (version === 1) return getDailyChallengeV1(date)
  throw new RangeError(`Unsupported daily challenge version: ${version}`)
}

export function createRandomChallenge(): ChallengeConfig {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
  const wordLength = weightedAutoLength(Math.random)
  return {mode: 'random', randomId: id, wordLength, ...autoDifficulty(wordLength), allowAny: false}
}

export function legacyGameStorageKey(config: ChallengeConfig): string {
  if (config.mode === 'daily') return `game.wordle.daily.${(config.dailyVersion ?? DAILY_CHALLENGE_VERSION).toString(16)}.${config.dailyDate ?? localDateKey()}`
  const word = Number.isInteger(config.wordIndex) ? `.${config.wordIndex!.toString(16)}` : ''
  if (config.mode === 'random') return `game.wordle.random.${config.wordLength}.${config.maxTries}.${config.disabledLetters}.${config.allowAny ? 1 : 0}${word}`
  return `game.wordle.advanced.${config.wordLength}.${config.maxTries}.${config.disabledLetters}.${config.allowAny ? 1 : 0}${word}`
}

export function gameStorageKey(config: ChallengeConfig): string {
  if (config.mode === 'advanced' && Number.isInteger(config.wordIndex)) {
    return `game.wordle.advanced.v2.${config.wordLength}.${config.wordIndex!.toString(16)}`
  }
  return legacyGameStorageKey(config)
}


export interface UrlChallenge {
  hard: ChallengeConfig
  fastInvalidate: boolean
}

export const GAME_QUERY = 'g'
export const DEFAULT_FAST_INVALIDATE = true
export const DEFAULT_ALLOW_ANY = false

function parseHex(value: string | undefined): number | undefined {
  if (!value || !/^[0-9a-f]+$/i.test(value)) return undefined
  const parsed = Number.parseInt(value, 16)
  return Number.isSafeInteger(parsed) ? parsed : undefined
}

export function isValidDateKey(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function isChallengeSettings(value: unknown): value is ChallengeConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const config = value as Partial<ChallengeConfig>
  return ['daily', 'random', 'advanced'].includes(config.mode ?? '') &&
    Number.isInteger(config.wordLength) && config.wordLength! >= 3 && config.wordLength! <= 20 &&
    Number.isInteger(config.maxTries) && config.maxTries! >= 1 && config.maxTries! <= 50 &&
    Number.isInteger(config.disabledLetters) && config.disabledLetters! >= 0 && config.disabledLetters! <= 12 &&
    typeof config.allowAny === 'boolean'
}

export function isChallengeConfig(value: unknown): value is ChallengeConfig {
  if (!isChallengeSettings(value)) return false
  const config = value
  if (config.wordIndex !== undefined && (!Number.isInteger(config.wordIndex) || config.wordIndex < 0 || config.wordIndex >= wordCount(config.wordLength))) return false
  if (config.randomId !== undefined && typeof config.randomId !== 'string') return false
  if (config.mode === 'daily') {
    if (!isValidDateKey(config.dailyDate)) return false
    if (config.dailyVersion !== undefined && !isDailyChallengeVersion(config.dailyVersion)) return false
  }
  return true
}

function challengeFlags(fastInvalidate: boolean, allowAny: boolean): string {
  if (fastInvalidate === DEFAULT_FAST_INVALIDATE && allowAny === DEFAULT_ALLOW_ANY) return ''
  return `${fastInvalidate ? 't' : 'f'}${allowAny ? 't' : 'f'}`
}

export function serializeChallenge(config: ChallengeConfig, fastInvalidate: boolean): string | undefined {
  const flags = challengeFlags(fastInvalidate, config.allowAny)
  if (config.mode === 'daily') return `${flags},d,${(config.dailyVersion ?? DAILY_CHALLENGE_VERSION).toString(16)},${config.dailyDate ?? localDateKey()}`
  if (!Number.isInteger(config.wordIndex)) return undefined
  const mode = config.mode === 'random' ? 'r' : 'a'
  return [flags, mode, config.wordIndex!.toString(16), config.wordLength.toString(16), config.maxTries.toString(16), config.disabledLetters.toString(16)].join(',')
}

export function parseChallenge(raw: string | null): UrlChallenge | undefined {
  if (!raw) return undefined
  const parts = raw.split(',')
  const [flags = '', mode, a, b, c, d] = parts
  if (flags && !/^[tf]{1,2}$/.test(flags)) return undefined
  const fastInvalidate = flags[0] ? flags[0] === 't' : DEFAULT_FAST_INVALIDATE
  const allowAny = flags[1] ? flags[1] === 't' : DEFAULT_ALLOW_ANY
  if (mode === 'd') {
    // Legacy daily links omitted the generator version. They are permanently
    // interpreted as v1 so links copied before versioning never change meaning.
    if (parts.length === 3) {
      if (!isValidDateKey(a)) return undefined
      return {hard: getDailyChallenge(a, LEGACY_DAILY_CHALLENGE_VERSION), fastInvalidate}
    }
    if (parts.length !== 4) return undefined
    const version = parseHex(a)
    const date = b
    if (version === undefined || !isDailyChallengeVersion(version) || !isValidDateKey(date)) return undefined
    return {hard: getDailyChallenge(date, version), fastInvalidate}
  }
  if ((mode !== 'r' && mode !== 'a') || parts.length !== 6) return undefined
  const wordIndex = parseHex(a), wordLength = parseHex(b), maxTries = parseHex(c), disabledLetters = parseHex(d)
  if (wordIndex === undefined || wordLength === undefined || maxTries === undefined || disabledLetters === undefined) return undefined
  if (wordLength < 3 || wordLength > 20 || maxTries < 1 || maxTries > 50 || disabledLetters > 12) return undefined
  if (wordIndex >= wordCount(wordLength as WordLength)) return undefined
  return {
    hard: {
      mode: mode === 'r' ? 'random' : 'advanced',
      wordLength: wordLength as WordLength,
      maxTries,
      disabledLetters,
      allowAny,
      wordIndex,
      randomId: mode === 'r' ? `url-${wordIndex.toString(16)}-${wordLength.toString(16)}-${maxTries.toString(16)}-${disabledLetters.toString(16)}-${allowAny ? 1 : 0}` : undefined,
    },
    fastInvalidate,
  }
}

export function challengeUrl(config: ChallengeConfig, fastInvalidate: boolean): URL | undefined {
  const value = serializeChallenge(config, fastInvalidate)
  if (!value) return undefined
  const base = /^https?:$/.test(location.protocol) ? new URL('/wordle.html', location.origin) : new URL('https://sanyambrar.com/wordle.html')
  base.searchParams.set(GAME_QUERY, value)
  return base
}
