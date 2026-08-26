'use strict'

import { WORDS } from './words/words'
import type { WordLength } from './words'

export type GameMode = 'daily' | 'random' | 'advanced'

export interface ChallengeConfig {
  mode: GameMode
  wordLength: WordLength
  maxTries: number
  disabledLetters: number
  allowAny: boolean
  dailyDate?: string
  randomId?: string
}

export interface DailyChallenge extends ChallengeConfig {
  mode: 'daily'
  dailyDate: string
  word: string
  disabled: string
}

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
  const words = WORDS['w' + wordLength]
  const random = seeded(seed)
  const start = Math.floor(random() * words.length)
  // Deterministic quality pass avoids many pathological dictionary entries while
  // still guaranteeing a result from the existing word list.
  for (let offset = 0; offset < Math.min(words.length, 512); offset++) {
    const candidate = words[(start + offset * 7919) % words.length]
    if (wordQuality(candidate)) return candidate
  }
  return words[start]
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

export function getDailyChallenge(date: string): DailyChallenge {
  const random = seeded(`samey-wordle/daily/config/${date}`)
  const wordLength = weightedAutoLength(random)
  const difficulty = autoDifficulty(wordLength)
  const word = seededWord(wordLength, `samey-wordle/daily/word/${date}/${wordLength}`)
  return {
    mode: 'daily',
    dailyDate: date,
    wordLength,
    ...difficulty,
    allowAny: false,
    word,
    disabled: disabledLettersForWord(word, difficulty.disabledLetters, `samey-wordle/daily/disabled/${date}/${word}`),
  }
}

export function createRandomChallenge(): ChallengeConfig {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
  const wordLength = weightedAutoLength(Math.random)
  return {mode: 'random', randomId: id, wordLength, ...autoDifficulty(wordLength), allowAny: false}
}

export function gameStorageKey(config: ChallengeConfig): string {
  if (config.mode === 'daily') return `game.wordle.daily.${config.dailyDate}`
  if (config.mode === 'random') return `game.wordle.random.${config.randomId}`
  return `game.wordle.advanced.${config.allowAny ? 'any.' : ''}${config.wordLength}.${config.maxTries}.${config.disabledLetters}`
}
