'use strict'

import { IDBPDatabase, openDB } from 'idb'
import { binarySearch, wordAt, wordCount, type WordLength } from './word-list'
export type { WordLength } from './word-list'
import { SettingsHardProps } from './popup_settings'
import { isWordLength, type GameMode } from './challenge'

export enum KindEnum {
  Correct = 0,
  Failed = 1,
  Revealed = 2,
}

export interface HistoryEntry {
  a: boolean // AllowAny
  k: KindEnum // Kind
  m: number // maxTries
  t: number // Timestamp
  h: string // Histories
  o?: GameMode // mode (legacy rows omit this)
  d?: number // disabled-letter count
  q?: string // daily date
  v?: number // daily generator version (legacy rows imply v1)
}

export interface Value {
  i?: number // Auto-incremented primary key
  w: string // Word
  h: HistoryEntry[] // The history for this word
}

type WordStore = `w${WordLength}`
type Schema = Record<WordStore, {
  key: number
  value: Value
  indexes: {wordIndex: string}
}>
export const WORD_STORES = ([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] as const).map(length => `w${length}` as const)

let db: IDBPDatabase<Schema>
const dbReady = openDB<Schema>('game.wordle', 1, {
  upgrade(db) {
    // Delete old data
    for (const store of db.objectStoreNames) db.deleteObjectStore(store);

    for (const name of WORD_STORES) {
      const store = db.createObjectStore(name, {autoIncrement: true, keyPath: 'i'})
      store.createIndex('wordIndex', 'w', {unique: true})
    }
  }
}).then(_db => db = _db)

export function getReadyDB(): Promise<IDBPDatabase<Schema>> { return db ? Promise.resolve(db) : dbReady }

// Calculates the diff (coloring) from a word and a guess
// assumes that word and guess are of the same length
export function calcDiff(word: string, guess: string): string {
  if (word.length !== guess.length) throw new Error('Length mismatch')

  const normalizedGuess = guess.toLowerCase()
  const og = word.toLowerCase().split('')
  const retval = Array.from({length: guess.length}).fill('r')

  for (let i = 0; i < normalizedGuess.length; i++) {
    if (normalizedGuess[i] === og[i]) {
      retval[i] = 'g'
      og[i] = ''
    }
  }

  for (let i = 0; i < normalizedGuess.length; i++) {
    if (retval[i] === 'g') continue
    const idx = og.indexOf(normalizedGuess[i])
    if (idx === -1) continue
    retval[i] = 'y'
    og[idx] = ''
  }

  return retval.join('')
}

// Gets and returns the record of the word if it exists in db
export function getGuessWord(guess: string): boolean {
  if (!isWordLength(guess.length)) throw new Error('Invalid guess length')
  return binarySearch(guess.length, guess.toLowerCase()) !== -1
}

// Get a random word of length wlen
export function getRandomWord(wlen: WordLength): string {
  const word = wordAt(wlen, Math.floor(Math.random() * wordCount(wlen)))
  if (!word) throw new Error(`No ${wlen}-letter words are available`)
  return word
}


// Sets the word as done, adding the history to the record
export async function setDone(entry: {word: string, history: [string, string][]}, hard: SettingsHardProps, kind: KindEnum): Promise<void> {
  const length = entry.word.length
  if (!isWordLength(length)) throw new Error('Invalid word length')
  const readyDb = db ?? await dbReady
  const store = readyDb.transaction(`w${length}`, 'readwrite').objectStore(`w${length}`)

  const record: Value = await store.index('wordIndex').get(entry.word) ?? {w: entry.word, h: []}
  record.h.push({
    a: hard.allowAny,
    k: kind,
    m: hard.maxTries,
    t: Date.now(),
    h: entry.history.map(([w, _]) => w).join(''),
    o: hard.mode,
    d: hard.disabledLetters,
    q: hard.mode === 'daily' ? hard.dailyDate : undefined,
    v: hard.mode === 'daily' ? hard.dailyVersion : undefined,
  })

  await store.put(record)
  await store.transaction.done
  window.dispatchEvent(new Event('wordle:stats-change'))
}


// Daily completion is stored alongside the regular word history. Scan every
// word-length bucket so the date picker can mark all completed Daily dates.
export async function getCompletedDailyDates(): Promise<Set<string>> {
  const readyDb = db ?? await dbReady
  const dates = new Set<string>()
  for (const storeName of WORD_STORES) {
    const values = await readyDb.transaction(storeName, 'readonly').objectStore(storeName).getAll()
    for (const value of values) for (const entry of value.h) if (entry.q) dates.add(entry.q)
  }
  return dates
}

