'use strict'

import { appendFileSync, readFileSync, writeFileSync } from 'fs'

const words = readFileSync('./words.txt', 'utf8').split('\n')

const sized = new Map<number, string[]>()
for (let i = 3; i <= 20; i++) sized.set(i, [])
for (const word of words) {
  if (word.length < 3 || word.length > 20) continue
  sized.get(word.length)!.push(word.toLowerCase())
}

const fileName = `words.ts`

writeFileSync(fileName, `'use strict'\nexport const WORDS: {[key: string]: string[]} = {\n`)
for (const [size, words] of sized.entries()) {
  appendFileSync(fileName, `  w${size}: ${JSON.stringify(words.sort())},\n`)
}
appendFileSync(fileName, `}\n`)

