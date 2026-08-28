'use strict'

import { IDBPDatabase, openDB } from 'idb'
import { binarySearch, wordAt, wordCount, type WordLength } from './word-list'
export type { WordLength } from './word-list'
import { SettingsHardProps } from './popup_settings'
import type { GameMode } from './challenge'

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
  i: number // Idx
  w: string // Word
  h: HistoryEntry[] // The history for this word
}

type schemaValue = {
  key: 'i'
  value: Value
  indexes: {'wordIndex': 'w'}
}
interface Schema {
  'w3' : schemaValue
  'w4' : schemaValue
  'w5' : schemaValue
  'w6' : schemaValue
  'w7' : schemaValue
  'w8' : schemaValue
  'w9' : schemaValue
  'w10': schemaValue
  'w11': schemaValue
  'w12': schemaValue
  'w13': schemaValue
  'w14': schemaValue
  'w15': schemaValue
  'w16': schemaValue
  'w17': schemaValue
  'w18': schemaValue
  'w19': schemaValue
  'w20': schemaValue
}

let db: IDBPDatabase<Schema>
const dbReady = openDB<Schema>('game.wordle', 1, {
  upgrade(db) {
    // Delete old data
    for (const store of db.objectStoreNames) db.deleteObjectStore(store);

    for (let i = 3; i <= 20; i++) {
      const store = db.createObjectStore('w' + i, {autoIncrement: true, keyPath: 'i'})
      store.createIndex('wordIndex', 'w', {unique: true})
    }
  }
}).then(_db => db = _db)

export function getDB(): typeof db { return db }

// Calculates the diff (coloring) from a word and a guess
// assumes that word and guess are of the same length
export function calcDiff(word: string, guess: string): string {
  if (word.length !== guess.length) throw new Error('Length mismatch')

  const normalizedGuess = guess.toLowerCase()
  const og = word.toLowerCase().split('')
  const result = Array(guess.length).fill('r')
  for (let i = 0; i < normalizedGuess.length; i++) {
    if (normalizedGuess[i] === og[i]) {
      result[i] = 'g'
      og[i] = '\0'
    }
  }
  for (let i = 0; i < normalizedGuess.length; i++) {
    if (result[i] === 'g') continue
    const idx = og.indexOf(normalizedGuess[i])
    if (idx !== -1) {
      result[i] = 'y'
      og[idx] = '\0'
    }
  }
  return result.join('')
}

// Gets and returns the record of the word if it exists in db
export function getGuessWord(guess: string): boolean {
  if (guess.length < 3 || guess.length > 20) throw new Error('Invalid guess length')
  return binarySearch(guess.length as WordLength, guess.toLowerCase()) !== -1
}

// Get a random word of length wlen
export function getRandomWord(wlen: WordLength): string {
  return wordAt(wlen, Math.floor(Math.random() * wordCount(wlen)))!
}

// Sets the word as done, adding the history to the record
export async function setDone(entry: {word: string, history: [string, string][]}, hard: SettingsHardProps, kind: KindEnum): Promise<void> {
  if (entry.word.length < 3 || entry.word.length > 20) throw new Error('Invalid word length')
  const readyDb = db ?? await dbReady
  const store = readyDb.transaction('w' + entry.word.length, 'readwrite').objectStore('w' + entry.word.length)

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
  store.transaction.commit()
  window.dispatchEvent(new Event('wordle:stats-change'))
}

// Get all the words that have been done
export async function getDoneWords(wlen: WordLength): Promise<Value[]> {
  const readyDb = db ?? await dbReady
  return await readyDb.transaction('w' + wlen, 'readonly').objectStore('w' + wlen).getAll()
}

