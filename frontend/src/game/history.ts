'use strict'

import { IDBPDatabase, openDB } from 'idb'
import { Options } from './types'

export type WordLength = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20

// IDK if indexgb compresses key names so shorter names are used here
export interface HistoryEntry {
  t: number // Timestamp ms

  s: number // Speed
  d: string // Data

  // history
  k: string // KeyPresses
  p: number[] // KeyPress Times

  o: Options // Rules
}

interface Schema {
  'history': {
    key: 't'
    value: HistoryEntry
    indexes: {'s': 's'},
  },
}

let db: IDBPDatabase<Schema>
openDB<Schema>('game.typing', 1, {
  upgrade(db) {
    const store = db.createObjectStore('history', {keyPath: 's'})
    store.createIndex('s', 's', {unique: false})
  }
}).then(_db => db = _db).catch(console.error)

export function getDB(): typeof db { return db }

export async function addCompletion(text: string, keypresses: [string, number][], options: Options) {
  let k = ''
  let p: number[] = []

  for (const kp of keypresses) {
    k += kp[0]
    p.push(kp[1])
  }

  const store = db.transaction('history', 'readwrite').objectStore('history')
  store.add({
    t: new Date().getTime(),
    s: p.at(-1)! / (1000*options.wordCount),
    d: text,
    k,
    p,
    o: options,
  })
}

