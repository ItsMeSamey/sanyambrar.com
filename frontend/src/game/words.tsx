'use strict'

import { IDBPDatabase, openDB } from 'idb'
import { WORDS } from './words/words.ts'
import bsearch from 'binary-search-bounds'

export type WordLength = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20

export interface HistoryEntry {
  a: boolean // allowAny
  h: string // history
}

export interface Value {
  i: number // Idx
  w: string // Word
  a: boolean // AllowAny
  h: HistoryEntry[] // Histories
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
openDB<Schema>('game.wordle', 1, {
  upgrade(db) {
    // Delete old data
    for (const store of db.objectStoreNames) db.deleteObjectStore(store);

    for (let i = 3; i <= 20; i++) {
      const store = db.createObjectStore('w' + i, {autoIncrement: true, keyPath: 'i'})
      store.createIndex('wordIndex', 'w', {unique: true})
    }
  }
}).then(_db => db = _db).catch(console.error)

export function getDB(): typeof db { return db }

// Calculates the diff (coloring) from a word and a guess
// assumes that word and guess are of the same length
export function calcDiff(word: string, guess: string): string {
  if (word.length !== guess.length) throw new Error('Length mismatch')

  const og = word.split('')
  const retval = Array.from({length: guess.length}).fill('r')

  for (let i = 0; i < guess.length; i++) {
    if (guess[i].toLowerCase() == og[i].toLowerCase()) {
      retval[i] = 'g'
      og[i] = ''
    }
  }

  for (let i = 0; i < guess.length; i++) {
    if (retval[i] === 'g') continue
    const idx = og.indexOf(guess[i])
    if (idx === -1) continue
    retval[i] = 'y'
    og[idx] = ''
  }

  return retval.join('')
}

// Gets and returns the record of the word if it exists in db
export function getGuessWord(guess: string): boolean {
  if (guess.length < 3 || guess.length > 20) throw new Error('Invalid guess length')
  return -1 !== bsearch.eq(WORDS['w' + guess.length], guess.toLowerCase(), (a, b) => a === b? 0: a < b? -1: 1)
}

// Get a random word of length wlen
export function getRandomWord(wlen: WordLength): string {
  const words = WORDS['w' + wlen]
  const idx = Math.floor(Math.random() * words.length)
  return words[idx]
}

// Sets the word as done, adding the history to the record
export async function setDone(word: string, h: [string, string][], allowAny: boolean): Promise<void> {
  if (word.length < 3 || word.length > 20) throw new Error('Invalid word length')
  const store = db.transaction('w' + word.length, 'readwrite').objectStore('w' + word.length)

  const record: Value = await store.index('wordIndex').get(word) ?? {word}
  record.h.push({
    a: allowAny,
    h: h.map(([w, _]) => w).join(),
  })

  await store.put(record)
  store.transaction.commit()
}

// Get all the words that have been done
export async function getDoneWords(wlen: WordLength): Promise<Value[]> {
  const store = db.transaction('w' + wlen, 'readonly').objectStore('w' + wlen).index('doneIndex')
  return await store.getAll(1)
}

