'use strict'

import { batch, createEffect, For, JSX, onCleanup, onMount } from 'solid-js'
import { createMutable, unwrap } from 'solid-js/store'
import { showToast } from '~/registry/ui/toast'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '~/registry/ui/drawer'

import { showError } from '../utils/toast'
import { LocalstorageStore } from '../utils/store'
import { Settings, SettingsHardProps, SettingsSoftProps } from './page_settings'
import { calcDiff, getGuessWord, getRandomWord, KindEnum, setDone } from './words'
import { WORDS } from './words/words'
import bsearch from 'binary-search-bounds'

// Green, Yellow, Red respectively
type WordleStringState = 'g' | 'y' | 'r'

// All possible keys for the keyboard
type Keys = 'Q' | 'W' | 'E' | 'R' | 'T' | 'Y' | 'U' | 'I' | 'O' | 'P' | 'A' | 'S' | 'D' | 'F' | 'G' | 'H' | 'J' | 'K' | 'L' | 'Z' | 'X' | 'C' | 'V' | 'B' | 'N' | 'M' | 'BACKSPACE'

interface KeyState {
  state: WordleStringState | undefined
  pressed: boolean
}

interface KeyboardState extends Record<Keys, KeyState> {}

const ABCD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ⏎⌫'

const defaultKeyboardState: KeyboardState = {
  BACKSPACE: {state: undefined, pressed: false}
} as any
for (const key of ABCD) {
  defaultKeyboardState[key as Keys] = {state: undefined, pressed: false}
}

class Keyboard {
  public state: KeyboardState

  constructor(state: KeyboardState) {
    this.state = state
  }

  static stateFromHistory(history: [string, string][]): KeyboardState {
    const state = structuredClone(defaultKeyboardState)
    for (const [guess, response] of history) {
      for (let i = 0; i < guess.length; i += 1) {
        const key = guess[i].toUpperCase() as keyof KeyboardState
        const obj = state[key] ?? {pressed: false}
        if (obj.state === 'g' || (obj.state === 'y' && response[i] === 'r')) continue
        obj.state = response[i] as WordleStringState
        state[key] = obj
      }
    }

    return state
  }

  render() {
    return <div class='flex flex-col select-none'>
      {['QWERTYUIOP', 'ASDFGHJKL', '⏎ZXCVBNM⌫'].map((text, row) => (
        <div
          class='flex flex-row mx-auto'
          style={{
          'padding-left': `${row%2}rem`,
        }}>
          {text.split('').map(char => {
            const key = char === '⏎' ? 'Enter' : char === '⌫' ? 'Backspace' : char
            const evObj = {key: key, code: key, location: 0, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, repeat: false}
            return <div
              onmousedown={() => document.dispatchEvent(new KeyboardEvent('keydown', evObj))}
              onmouseup={() => document.dispatchEvent(new KeyboardEvent('keyup', evObj))}
              onmouseleave={() => document.dispatchEvent(new KeyboardEvent('keyup', evObj))}
              class={'text-center content-center size-10 rounded transition-all will-change-transform ' + (
                this.state[char as Keys].state === 'g' ? 'bg-green-600/60':
                this.state[char as Keys].state === 'y' ? 'bg-yellow-500/70':
                this.state[char as Keys].state === 'r' ? 'bg-red-700/50': 'bg-muted'
                ) + ' ' + (this.state[char as Keys].pressed ? 'scale-105 invert': '')
              }
              style={{
                'height': `min(3.5rem, 10vw)`,
                'width' : key.length === 1? `min(3.5rem, ${100/11.6}vw)`: `calc(1.6 * min(3.5rem, ${100/11.6}vw))`,
                'margin': `min(0.25rem, ${10/32}vw)`,
              }}
            >{char}</div>
          })}
        </div>
      ))}
    </div>
  }
}

class Block {
  public wordLength: number
  public word: string
  public mask: string

  constructor(wordLength: number, word: string, mask: string) {
    this.wordLength = wordLength
    this.word = word
    this.mask = mask
  }

  render() {
    this.word = this.word.slice(0, this.wordLength)
    if (this.word.length < this.wordLength) this.word += ' '.repeat(this.wordLength - this.word.length)
    return <span
      class='flex flex-row text-foreground overflow-visible mx-auto'
      style={{
        'margin': `-min(0.25rem, ${100/(this.wordLength*this.wordLength)}vw)`
      }}
    >
      <For each={this.word as unknown as string[]}>
        {(char, i) => (
          <div
            class={'border border-muted-foreground/50 capitalize relative ' + (
              this.mask[i()] === 'r' ? 'bg-red-700/50':
              this.mask[i()] === 'y' ? 'bg-yellow-500/70':
              this.mask[i()] === 'g' ? 'bg-green-600/60':
              this.mask[i()] === 'b' ? 'bg-blue-600/60':
              'bg-transparent'
            )}
            style={{
              'height': `min(3.5rem, calc(${100/(this.wordLength + 1)}vw - min(0.25rem, ${200/(this.wordLength*this.wordLength)}vw)))`,
              'width':  `min(3.5rem, calc(${100/(this.wordLength + 1)}vw - min(0.25rem, ${200/(this.wordLength*this.wordLength)}vw)))`,
              'margin': `min(0.125rem, ${100/(this.wordLength*this.wordLength)}vw)`,
              'font-size': `min(min(2.5rem, calc(${100/(this.wordLength + 1)}vw - min(0.25rem, ${200/(this.wordLength*this.wordLength)}vw))), 1.875rem)`,
            }}
          >
            <span class='absolute top-1/2 left-0 right-0 -translate-y-1/2 text-center font-extrabold'>{char}</span>
          </div>
        )}
      </For>
    </span>
  }
}

interface CurrentState {
  keyboard: KeyboardState
  showPopOver: boolean
}

class GameState {
  soft: SettingsSoftProps
  hard: SettingsHardProps
  allWords: string[]

  stateStore: LocalstorageStore<{
    word: string
    history: [string, string][]
  }>

  state: CurrentState
  history: [string, string][]

  constructor(soft: SettingsSoftProps, hard: SettingsHardProps) {
    this.soft = soft
    this.hard = hard
    this.allWords = WORDS['w' + hard.wordLength]

    this.stateStore = new LocalstorageStore<{
      word: string
      history: [string, string][]
    }>(
      'game.wordle.' + (hard.allowAny? 'any.': '') + hard.wordLength + '.' + hard.maxTries,
      { word: '', history: [['', '']]},
        JSON.parse, JSON.stringify
    )

    if (!this.stateStore.current_value!.word) {
      this.stateStore.current_value!.word = getRandomWord(hard.wordLength)
      this.stateStore.set(this.stateStore.current_value!)
    }

    this.history = createMutable<[string, string][]>(this.stateStore.current_value!.history)
    const lastColors = ((this.stateStore.current_value!.history.at(-1) ?? ['', 'r'])![1] || 'r').split('');
    this.state = createMutable<CurrentState>({
      keyboard: Keyboard.stateFromHistory(this.stateStore.current_value!.history),
      showPopOver: lastColors.every(s => s === 'g') || lastColors.every(s => s === 'b'),
    })

    this.state.keyboard = createMutable(this.state.keyboard)
  }

  existsPrefix(prefix: string) {
    return -1 !== bsearch.eq(this.allWords, prefix, (a, b) => {
      if (a.startsWith(b)) return 0
      return a < b? -1: 1
    })
  }

  submit() {
    const last = this.history.at(-1)!
    const guess = unwrap(last)[0]
    if (guess.length !== this.hard.wordLength) return showError(new Error('Invalid length'))

    if (!this.hard.allowAny && !getGuessWord(guess)) {
      showToast({title: 'Invalid Guess 😕', description: guess + ' is not present in dictionary', variant: 'error', duration: 1000})
      return
    }

    const response = calcDiff(this.stateStore.current_value!.word, guess)

    for (let i = 0; i < this.hard.wordLength; i += 1) {
      const old = this.state.keyboard[guess[i].toUpperCase() as Keys];
      if (old.state === 'g' || (old.state === 'y' && response[i] === 'r')) continue;
      old.state = response[i] as WordleStringState
    }

    last[1] = response
    this.stateStore.set(this.stateStore.current_value!)

    if (response.split('').every(s => s === 'g')) {
      setDone(this.stateStore.current_value!, this.hard, KindEnum.Correct)
      this.state.showPopOver = true
    } else if (this.hard.maxTries !== 1 && this.history.length === this.hard.maxTries) {
      setDone(this.stateStore.current_value!, this.hard, KindEnum.Failed)
      this.state.showPopOver = true
    } else {
      this.history.push(['', ''])
    }
  }

  fastInvalidate() {
    if (!this.soft.fastInvalidate || this.hard.allowAny) return

    const last = this.history.at(-1)!
    const [word, color] = last
    last[1] = color + (this.existsPrefix(word) ? 'b': 'r')
  }

  resetState() {
    if (this.soft.reveal) {
      this.soft.reveal = false
    }

    this.history.length = 0
    this.history.push(['', ''])
    this.state.keyboard = structuredClone(defaultKeyboardState)

    this.stateStore.current_value!.word = getRandomWord(this.hard.wordLength)
    this.stateStore.set(this.stateStore.current_value!)
  }
}

function WordleModel(soft: SettingsSoftProps, hard: SettingsHardProps): JSX.Element {
  const gameState = new GameState(soft, hard)

  createEffect(() => {
    if (soft.reveal) batch(() => {
      setDone(gameState.stateStore.current_value!, hard, KindEnum.Revealed)
      const last = gameState.history.at(-1)!
      last[0] = gameState.stateStore.current_value!.word
      last[1] = Array.from({length: hard.wordLength}).fill('b').join('')
      gameState.stateStore.set(gameState.stateStore.current_value!)
      gameState.state.showPopOver = true
    })
  })

  // The block that is currently being inputted in
  let currentBlock: HTMLDivElement = undefined as any

  function setKeyState(key: string, pressed: boolean) {
    key = key.toUpperCase()
    if (key === 'ENTER') key = '⏎'
    if (key === 'BACKSPACE') key = '⌫'
    if (key.length === 1 && ABCD.includes(key)) {
      gameState.state.keyboard[key as Keys].pressed = pressed
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    batch(() => {
      const last = gameState.history.at(-1)!
      if (e.key === 'Escape') {
        last[0] = ''
        last[1] = ''
        return
      }

      setKeyState(e.key, true)
      if (e.key === 'Enter') {
        gameState.submit()
        return
      }

      if (e.key === 'Backspace') {
        last[0] = (last[0] ?? '').slice(0, -1)
        last[1] = (last[1] ?? '').slice(0, -1)
        return
      }

      const key = e.key.toUpperCase()
      if (key.length !== 1 || !ABCD.includes(key)) return
      if (last[0].length === hard.wordLength) {
        currentBlock.classList.remove('motion-preset-wiggle')
        setTimeout(() => currentBlock.classList.add('motion-preset-wiggle'), 0)
        return
      }

      last[0] = last[0] + e.key.toLowerCase()
      gameState.fastInvalidate()
    })
  }

  function handleKeyUp(e: KeyboardEvent) {
    setKeyState(e.key, false)
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
  })

  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('keyup', handleKeyUp)
  })

  return <div class='flex flex-col h-full p-6 max-sm:p-1 sm:content-center sm:justify-center'>
    <Drawer open={gameState.state.showPopOver} onOpenChange={state => batch(() => {
      gameState.resetState()
      gameState.state.showPopOver = state
    })}>
      <DrawerContent>
        <DrawerHeader>
            {(() => {
              const last = gameState.history.at(-1)!
              const isCorrect = last[0] === gameState.stateStore.current_value!.word && last[1].split('').every(s => s === 'g')
              const isReveled = last[0] === gameState.stateStore.current_value!.word && last[1].split('').every(s => s === 'b')
              const str = isCorrect? 'Correctly guessed in ': isReveled? 'Revealed after ': 'Failed after ';
              return <>
                <DrawerTitle class={'text-4xl tracking-widest ' + (
                  isCorrect? 'text-success-foreground':
                  isReveled? 'text-blue-500': 'text-error-foreground'
                )}>{gameState.stateStore.current_value!.word?.toUpperCase()}</DrawerTitle>
                <DrawerDescription class='text-2xl'>
                  {str}
                  <span class={
                    !isCorrect || gameState.history.length > hard.wordLength? 'text-error-foreground':
                      gameState.history.length < hard.wordLength? 'text-success-foreground': 'text-warning-foreground'
                  }>{gameState.history.length}</span> attempts
                </DrawerDescription>
              </>
            })()}
        </DrawerHeader>
      </DrawerContent>
    </Drawer>
    <div class='flex flex-col max-h-auto overflow-y-auto overflow-visible mx-auto p-0 max-sm:mt-auto scrollbar-none w-full'>
      <For each={gameState.history.length? gameState.history.slice(0, -1): []}>
        {([word, mask]) => new Block(hard.wordLength, word, mask).render()}
      </For>
      {(() => {
        const last = gameState.history.at(-1)!
        currentBlock = new Block(hard.wordLength, last[0], last[1]).render() as HTMLDivElement
        onMount(() => currentBlock.scrollIntoView({behavior: 'smooth', block: 'start'}))
        return currentBlock as JSX.Element
      })()}
      <For each={Array.from({length: hard.maxTries - gameState.history.length}).fill(undefined)}>
        {() => new Block(hard.wordLength, '', '').render()}
      </For>
    </div>
    <div class='mt-10 justify-center justify-items-center overflow-visible max-sm:mt-auto max-sm:mb-4 max-sm:pt-4'>
      {new Keyboard(gameState.state.keyboard).render()}
    </div>
  </div>
}

export default function Wordle() {
  const hardStore = new LocalstorageStore<SettingsHardProps>('game.wordle.settings.hard', {
    wordLength: 6,
    maxTries: 6,
    allowAny: false,
  }, JSON.parse, JSON.stringify)
  const hard = createMutable(hardStore.get()!)
  createEffect(() => hardStore.set(hard))

  const softStore = new LocalstorageStore<SettingsSoftProps>('game.wordle.settings.soft', {
    reveal: false,
    fastInvalidate: false,
  }, JSON.parse, val => JSON.stringify(val, (k, v) => {
    if (['reveal'].includes(k)) return undefined
    return v
  }))
  const soft = createMutable(softStore.get()!)
  createEffect(() => softStore.set(soft))

  return <>
    <nav class='flex flex-col p-2 ml-auto absolute align-middle items-end top-0 left-0 w-full'>
      <Settings soft={soft} hard={hard} />
    </nav>
    {WordleModel(soft, {...hard})}
  </>
}

