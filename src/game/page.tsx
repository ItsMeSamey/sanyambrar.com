'use strict'

import { batch, createEffect, createSignal, For, JSX, onCleanup, onMount, Show } from 'solid-js'
import { createMutable, unwrap } from 'solid-js/store'
import { showToast } from '~/registry/ui/toast'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '~/registry/ui/drawer'

import { showError } from '../utils/toast'
import { LocalstorageStore } from '../utils/store'
import Settings, { SettingsHardProps, SettingsSoftProps } from './popup_settings'
import { binarySearch, calcDiff, getGuessWord, getRandomWord, hasPrefix, KindEnum, setDone } from './words'
import { WORDS } from './words/words'
import { StatsPageTrigger } from './page_stats'
import { ShareTrigger } from './page_share'
import { ChallengeConfig, createRandomChallenge, DAILY_CHALLENGE_VERSION, disabledLettersForWord, gameStorageKey, getDailyChallenge, localDateKey, GAME_QUERY, parseChallenge, serializeChallenge } from './challenge'
import { HomeBrand, HomeIconLink, WordleMark } from '../shared/components/Brand.tsx'
import { animateRootSwap } from '../shared/transitions.ts'

type WordleStringState = 'g' | 'y' | 'r'
type Keys = 'Q' | 'W' | 'E' | 'R' | 'T' | 'Y' | 'U' | 'I' | 'O' | 'P' | 'A' | 'S' | 'D' | 'F' | 'G' | 'H' | 'J' | 'K' | 'L' | 'Z' | 'X' | 'C' | 'V' | 'B' | 'N' | 'M' | 'BACKSPACE'

interface KeyState { state: WordleStringState | undefined; pressed: boolean }
interface KeyboardState extends Record<Keys, KeyState> {}

const ABCD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ⏎⌫'
const defaultKeyboardState: KeyboardState = {BACKSPACE: {state: undefined, pressed: false}} as any
for (const key of ABCD) defaultKeyboardState[key as Keys] = {state: undefined, pressed: false}

class Keyboard {
  constructor(public state: KeyboardState, public disabled: string, public suggested: string) {}

  static stateFromHistory(history: [string, string][]): KeyboardState {
    const state = structuredClone(defaultKeyboardState)
    for (const [guess, response] of history) {
      for (let i = 0; i < guess.length; i++) {
        const key = guess[i].toUpperCase() as keyof KeyboardState
        const obj: KeyState = state[key] ?? {pressed: false, state: undefined}
        if (obj.state === 'g' || (obj.state === 'y' && response[i] === 'r')) continue
        obj.state = response[i] as WordleStringState
        state[key] = obj
      }
    }
    return state
  }

  render() {
    return <div class='wordle-keyboard-inner select-none'>
      {['QWERTYUIOP', 'ASDFGHJKL', '⏎ZXCVBNM⌫'].map((text, row) => (
        <div class={'wordle-key-row ' + (row === 1 ? 'wordle-key-row-offset' : '')}>
          {text.split('').map(char => {
            const key = char === '⏎' ? 'Enter' : char === '⌫' ? 'Backspace' : char
            const isDisabled = key.length === 1 && this.disabled.includes(key.toLowerCase())
            const evObj = {key, code: key, location: 0, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, repeat: false}
            return <button
              type='button'
              disabled={isDisabled}
              aria-label={isDisabled ? `${key} disabled for this game` : key}
              onpointerdown={e => {
                if (isDisabled) return
                e.preventDefault()
                e.currentTarget.setPointerCapture?.(e.pointerId)
                document.dispatchEvent(new KeyboardEvent('keydown', evObj))
              }}
              onpointerup={e => {
                if (isDisabled) return
                document.dispatchEvent(new KeyboardEvent('keyup', evObj))
                if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
              }}
              onpointercancel={() => !isDisabled && document.dispatchEvent(new KeyboardEvent('keyup', evObj))}
              class={'wordle-key text-center content-center rounded transition-all will-change-transform ' + (
                key.length === 1 ? '' : 'wordle-key-wide ' 
              ) + (
                isDisabled ? 'wordle-key-disabled ' :
                this.state[char as Keys].state === 'g' ? 'bg-green-600/60 ' :
                this.state[char as Keys].state === 'y' ? 'bg-yellow-500/70 ' :
                this.state[char as Keys].state === 'r' ? 'bg-red-700/50 ' : 'bg-muted '
              ) + (!isDisabled && key.length === 1 && this.suggested.includes(key.toLowerCase()) ? 'wordle-key-suggested ' : '') + (this.state[char as Keys].pressed ? 'scale-105 invert' : '')}
            >{char}</button>
          })}
        </div>
      ))}
    </div>
  }
}

export class Block {
  constructor(public wordLength: number, public word: string, public mask: string) {}

  render() {
    this.word = this.word.slice(0, this.wordLength)
    if (this.word.length < this.wordLength) this.word += ' '.repeat(this.wordLength - this.word.length)
    return <span class='wordle-row text-foreground' style={{'--wordle-length': this.wordLength}}>
      <For each={this.word as unknown as string[]}>{(char, i) => (
        <div
          class={'wordle-cell border capitalize relative ' + (
            this.mask[i()] === 'r' ? 'border-muted-foreground/50 bg-red-700/50' :
            this.mask[i()] === 'y' ? 'border-muted-foreground/50 bg-yellow-500/70' :
            this.mask[i()] === 'g' ? 'border-muted-foreground/50 bg-green-600/60' :
            this.mask[i()] === 'b' ? 'border-muted-foreground/50 bg-blue-600/60' :
            'border-muted-foreground/50 bg-transparent'
          )}
        ><span class='wordle-cell-letter font-extrabold'>{char}</span></div>
      )}</For>
    </span>
  }
}

interface CurrentState { keyboard: KeyboardState; showPopOver: boolean; suggested: string }
export interface WordLocalStorageState {
  word: string
  wordIndex?: number
  history: [string, string][]
  disabled?: string
  config?: SettingsHardProps
  done?: KindEnum
}

class GameState {
  allWords: string[]
  state: CurrentState
  history: [string, string][]

  constructor(public soft: SettingsSoftProps, public hard: SettingsHardProps, public stateStore: LocalstorageStore<WordLocalStorageState>) {
    this.allWords = WORDS['w' + hard.wordLength]
    const stored = this.stateStore.current_value!

    if (!stored.word) {
      if (hard.mode === 'daily') {
        const daily = getDailyChallenge(hard.dailyDate ?? localDateKey(), hard.dailyVersion ?? DAILY_CHALLENGE_VERSION)
        stored.word = daily.word
        stored.disabled = daily.disabled
      } else {
        if (Number.isInteger(hard.wordIndex)) stored.word = this.allWords[hard.wordIndex!] ?? ''
        if (!stored.word) {
          stored.word = getRandomWord(hard.wordLength)
          hard.wordIndex = this.allWords.indexOf(stored.word)
        }
        stored.disabled = disabledLettersForWord(stored.word, hard.disabledLetters, gameStorageKey(hard))
      }
      stored.config = {...hard}
      this.stateStore.set(stored)
    } else if (stored.disabled === undefined) {
      stored.disabled = disabledLettersForWord(stored.word, hard.disabledLetters, gameStorageKey(hard))
      stored.config = {...hard}
      this.stateStore.set(stored)
    }
    // Rewrite legacy plaintext-answer state through the compact serializer.
    // Daily games need only the date; random/advanced games persist a word-list index.
    this.stateStore.set(stored)

    this.history = createMutable<[string, string][]>(stored.history)
    const lastColors = ((stored.history.at(-1) ?? ['', ''])![1] || '').split('')
    if (stored.done === undefined && lastColors.length === hard.wordLength) {
      if (lastColors.every(s => s === 'g')) stored.done = KindEnum.Correct
      else if (lastColors.every(s => s === 'b')) stored.done = KindEnum.Revealed
      else if (hard.maxTries !== 1 && stored.history.length >= hard.maxTries) stored.done = KindEnum.Failed
    }
    this.state = createMutable<CurrentState>({
      keyboard: Keyboard.stateFromHistory(stored.history),
      showPopOver: stored.done !== undefined,
      suggested: '',
    })
    this.state.keyboard = createMutable(this.state.keyboard)
  }

  get disabled() { return this.stateStore.current_value!.disabled ?? '' }

  isFinished() { return this.stateStore.current_value!.done !== undefined }

  existsPrefix(prefix: string) {
    return hasPrefix(this.allWords, prefix)
  }

  persist() {
    this.stateStore.current_value!.history = unwrap(this.history)
    this.stateStore.current_value!.config = {...this.hard}
    this.stateStore.set(this.stateStore.current_value!)
  }

  submit() {
    if (this.isFinished()) return
    const last = this.history.at(-1)!
    const guess = unwrap(last)[0]
    if (guess.length !== this.hard.wordLength) return showError(new Error('Invalid length'))
    if (!this.hard.allowAny && !getGuessWord(guess)) {
      showToast({title: 'Invalid guess', description: `${guess.toUpperCase()} is not in the dictionary.`, variant: 'error', duration: 1000})
      return
    }

    const response = calcDiff(this.stateStore.current_value!.word, guess)
    for (let i = 0; i < this.hard.wordLength; i++) {
      const old = this.state.keyboard[guess[i].toUpperCase() as Keys]
      if (old.state === 'g' || (old.state === 'y' && response[i] === 'r')) continue
      old.state = response[i] as WordleStringState
    }
    last[1] = response

    if (response.split('').every(s => s === 'g')) {
      this.stateStore.current_value!.done = KindEnum.Correct
      this.persist()
      void setDone(this.stateStore.current_value!, this.hard, KindEnum.Correct)
      this.state.showPopOver = true
    } else if (this.hard.maxTries !== 1 && this.history.length === this.hard.maxTries) {
      this.stateStore.current_value!.done = KindEnum.Failed
      this.persist()
      void setDone(this.stateStore.current_value!, this.hard, KindEnum.Failed)
      this.state.showPopOver = true
    } else {
      this.history.push(['', ''])
      this.persist()
    }
  }

  fastInvalidate() {
    if (!this.soft.fastInvalidate || this.hard.allowAny || this.isFinished()) { this.state.suggested = ''; return }
    const prefix = (this.history.at(-1)?.[0] ?? '').toLowerCase()
    if (prefix.length >= this.hard.wordLength || !this.existsPrefix(prefix)) { this.state.suggested = ''; return }
    let next = ''
    for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
      if (this.disabled.includes(letter)) continue
      if (this.existsPrefix(prefix + letter)) next += letter
    }
    this.state.suggested = next
  }

}

export class WordleModel {
  state: GameState
  currentBlock: HTMLDivElement = undefined as any

  constructor(soft: SettingsSoftProps, hard: SettingsHardProps, stateStore: LocalstorageStore<WordLocalStorageState>, private onNextChallenge: () => void, private onChooseMode: () => void) {
    this.state = new GameState(soft, hard, stateStore)
  }

  setKeyState(key: string, pressed: boolean) {
    key = key.toUpperCase()
    if (key === 'ENTER') key = '⏎'
    if (key === 'BACKSPACE') key = '⌫'
    if (key.length === 1 && ABCD.includes(key)) this.state.state.keyboard[key as Keys].pressed = pressed
  }

  handleKeyDown(e: KeyboardEvent) {
    const target = e.target instanceof Element ? e.target : null
    const interactive = target?.closest('input, textarea, select, button, a, [contenteditable="true"], [role="dialog"], [role="slider"], [role="switch"]')
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || interactive) return
    batch(() => {
      if (this.state.isFinished()) return
      const last = this.state.history.at(-1)!
      if (e.key === 'Escape') { last[0] = ''; last[1] = ''; this.state.fastInvalidate(); return }

      this.setKeyState(e.key, true)
      if (e.key === 'Enter') return this.state.submit()
      if (e.key === 'Backspace') { last[0] = (last[0] ?? '').slice(0, -1); last[1] = ''; this.state.fastInvalidate(); return }

      const key = e.key.toLowerCase()
      if (key.length !== 1 || !ABCD.toLowerCase().includes(key)) return
      if (this.state.disabled.includes(key)) {
        this.currentBlock.classList.remove('wordle-invalid-wiggle')
        setTimeout(() => this.currentBlock.classList.add('wordle-invalid-wiggle'), 0)
        return
      }
      if (last[0].length === this.state.hard.wordLength) {
        this.currentBlock.classList.remove('wordle-invalid-wiggle')
        setTimeout(() => this.currentBlock.classList.add('wordle-invalid-wiggle'), 0)
        return
      }
      last[0] += key
      this.state.fastInvalidate()
    })
  }

  handleKeyUp(e: KeyboardEvent) { this.setKeyState(e.key, false) }

  render() {
    createEffect(() => {
      if (this.state.soft.reveal && !this.state.isFinished()) batch(() => {
        this.state.stateStore.current_value!.done = KindEnum.Revealed
        void setDone(this.state.stateStore.current_value!, this.state.hard, KindEnum.Revealed)
        const last = this.state.history.at(-1)!
        last[0] = this.state.stateStore.current_value!.word
        last[1] = 'b'.repeat(this.state.hard.wordLength)
        this.state.persist()
        this.state.state.showPopOver = true
      })
    })

    createEffect(() => batch(() => {
      if (this.state.soft.fastInvalidate) this.state.fastInvalidate()
      else this.state.state.suggested = ''
    }))

    const handleKeyUp = (e: KeyboardEvent) => this.handleKeyUp(e)
    const handleKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e)
    const clearPressed = () => {
      for (const key of Object.keys(this.state.state.keyboard) as Keys[]) this.state.state.keyboard[key].pressed = false
    }
    onMount(() => {
      document.addEventListener('keydown', handleKeyDown)
      document.addEventListener('keyup', handleKeyUp)
      window.addEventListener('blur', clearPressed)
      document.addEventListener('visibilitychange', clearPressed)
    })
    onCleanup(() => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', clearPressed)
      document.removeEventListener('visibilitychange', clearPressed)
    })

    const modeTitle = () => this.state.hard.mode === 'daily' ? 'Word of the day' : this.state.hard.mode === 'random' ? 'Random' : 'Advanced'

    return <div class='wordle-game-shell'>
      <Drawer open={this.state.state.showPopOver} onOpenChange={value => this.state.state.showPopOver = value}>
        <DrawerContent class='result-dialog'>
          <DrawerHeader>
            {(() => {
              const last = this.state.history.at(-1)!
              const answer = this.state.stateStore.current_value!.word
              const isCorrect = last[0] === answer && last[1].split('').every(s => s === 'g')
              const isRevealed = last[0] === answer && last[1].split('').every(s => s === 'b')
              return <>
                <span class='result-kicker'>{isCorrect ? 'Solved' : isRevealed ? 'Revealed' : 'Game over'} / {modeTitle()}</span>
                <DrawerTitle class={'result-word ' + (isCorrect ? 'text-success-foreground' : isRevealed ? 'text-blue-500' : 'text-error-foreground')}>
                  <span class='result-answer'>{answer?.toUpperCase()}</span> <ShareTrigger word={() => answer} soft={this.state.soft} hard={this.state.hard} />
                </DrawerTitle>
                <DrawerDescription class='result-copy'>
                  {isCorrect ? <>Solved in <strong>{this.state.history.length}</strong> guesses.</> :
                   isRevealed ? <>The answer has been revealed.</> : <>You used all <strong>{this.state.hard.maxTries}</strong> guesses.</>}
                </DrawerDescription>
                <div class='result-board'><For each={this.state.history}>{([word, mask]) => new Block(this.state.hard.wordLength, word, mask || calcDiff(answer, word)).render()}</For></div>
                <div class='result-actions'>
                  <Show when={this.state.hard.mode === 'random'}><button onClick={this.onNextChallenge}>Next random</button></Show>
                  <Show when={this.state.hard.mode === 'advanced'}><button onClick={this.onNextChallenge}>Play again</button></Show>
                  <button class='result-secondary' onClick={this.onChooseMode}>{this.state.hard.mode === 'daily' ? 'Choose another day' : 'Change mode'}</button>
                </div>
              </>
            })()}
          </DrawerHeader>
        </DrawerContent>
      </Drawer>

      <div class='wordle-board mx-auto'>
        <For each={this.state.history.length ? this.state.history.slice(0, -1) : []}>{([word, mask]) => new Block(this.state.hard.wordLength, word, mask).render()}</For>
        {(() => {
          const last = this.state.history.at(-1)!
this.currentBlock = new Block(this.state.hard.wordLength, last[0], last[1]).render() as HTMLDivElement
          onMount(() => this.currentBlock.scrollIntoView({behavior: 'smooth', block: 'nearest'}))
          return this.currentBlock as JSX.Element
        })()}
        <Show when={this.state.hard.maxTries !== 1}>
          <For each={Array.from({length: Math.max(0, this.state.hard.maxTries - this.state.history.length)}).fill(undefined)}>{() => new Block(this.state.hard.wordLength, '', '').render()}</For>
        </Show>
      </div>
      <div class='wordle-keyboard justify-center justify-items-center overflow-visible'>{new Keyboard(this.state.state.keyboard, this.state.disabled, this.state.state.suggested).render()}</div>
    </div>
  }
}

function RenderWordleModel(hard: SettingsHardProps, soft: SettingsSoftProps, onNextChallenge: () => void, onChooseMode: () => void) {
  const fromStorage = (raw: string): WordLocalStorageState => {
    const stored = JSON.parse(raw) as WordLocalStorageState
    const config = stored.config ?? hard
    if (!stored.word) {
      if (config.mode === 'daily' && config.dailyDate) {
        stored.word = getDailyChallenge(config.dailyDate, config.dailyVersion ?? DAILY_CHALLENGE_VERSION).word
      } else if (Number.isInteger(stored.wordIndex)) {
        stored.word = WORDS['w' + config.wordLength][stored.wordIndex!] ?? ''
      }
    }
    return stored
  }
  const toStorage = (state: WordLocalStorageState): string => {
    const stored: Partial<WordLocalStorageState> = {...state}
    const config = stored.config ?? hard
    if (config.mode === 'daily') {
      delete stored.wordIndex
    } else if (stored.word) {
      const words = WORDS['w' + config.wordLength]
      const index = binarySearch(words, stored.word.toLowerCase())
      if (index >= 0) stored.wordIndex = index
    }
    delete stored.word
    return JSON.stringify(stored)
  }
  const storageKey = gameStorageKey(hard)
  if (hard.mode === 'daily' && (hard.dailyVersion ?? DAILY_CHALLENGE_VERSION) === 1 && hard.dailyDate && !localStorage.getItem(storageKey)) {
    const legacyKey = `game.wordle.daily.${hard.dailyDate}`
    const legacy = localStorage.getItem(legacyKey)
    if (legacy) {
      localStorage.setItem(storageKey, legacy)
      localStorage.removeItem(legacyKey)
      window.dispatchEvent(new Event('wordle:storage-change'))
    }
  }
  const stateStore = new LocalstorageStore<WordLocalStorageState>(
    storageKey,
    {word: '', history: [['', '']], config: {...hard}},
    fromStorage,
    toStorage,
  )
  return new WordleModel(soft, hard, stateStore, onNextChallenge, onChooseMode).render()
}

export function GetSettingsStore(): {softStore: LocalstorageStore<SettingsSoftProps>, hardStore: LocalstorageStore<SettingsHardProps>} {
  const today = localDateKey()
  const daily = getDailyChallenge(today)
  return {
    softStore: new LocalstorageStore<SettingsSoftProps>('game.wordle.settings.soft', {reveal: false, fastInvalidate: true}, JSON.parse, val => JSON.stringify(val, (k, v) => ['reveal'].includes(k) ? undefined : v)),
    hardStore: new LocalstorageStore<SettingsHardProps>('game.wordle.settings.hard', {...daily}, JSON.parse, value => JSON.stringify(value, (key, item) => ['dailyDate', 'dailyVersion', 'randomId', 'wordIndex'].includes(key) ? undefined : item)),
  }
}

function OpeningScreen({date, setDate, startDaily, startRandom, startAdvanced}: {date: () => string, setDate: (value: string) => void, startDaily: () => void, startRandom: () => void, startAdvanced: () => void}) {
  const preview = () => getDailyChallenge(date())
  return <main class='wordle-opening'>
    <div class='wordle-opening-inner'>
      <WordleMark class='wordle-opening-mark' />
      <h1>Pick a game.</h1>
      <p class='wordle-opening-lede'>Daily is deterministic. Random tunes itself every game. Advanced exposes the knobs.</p>
      <div class='wordle-mode-grid'>
        <section class='wordle-mode-card wordle-mode-card-primary'>
          <span class='wordle-mode-eyebrow'>DAILY</span><h2>Word of the day</h2>
          <p>Same challenge for the same local calendar date, including word, length, guesses, and disabled letters.</p>
          <label class='wordle-date-control'>Date<input type='date' value={date()} max={localDateKey()} onInput={e => setDate(e.currentTarget.value)} /></label>
          <div class='wordle-mode-spec'>{preview().wordLength} letters / {preview().maxTries} guesses / {preview().disabledLetters} disabled</div>
          <button class='wordle-mode-action' onClick={startDaily}>Play {date() === localDateKey() ? 'today' : date()}</button>
        </section>
        <section class='wordle-mode-card'>
          <span class='wordle-mode-eyebrow'>AUTOMATIC</span><h2>Random</h2>
          <p>Each new game chooses a fresh word length and a matching difficulty profile.</p>
          <button class='wordle-mode-action' onClick={startRandom}>Start random</button>
        </section>
        <section class='wordle-mode-card'>
          <span class='wordle-mode-eyebrow'>CUSTOM</span><h2>Advanced</h2>
          <p>Word length, guess limit, disabled-letter count, and dictionary rules are all configurable.</p>
          <button class='wordle-mode-action' onClick={startAdvanced}>Open advanced</button>
        </section>
      </div>
    </div>
  </main>
}

function setChallengeQuery(config: SettingsHardProps | undefined, fastInvalidate: boolean, replace = true) {
  const url = new URL(location.href)
  url.searchParams.delete('p')
  url.searchParams.delete('v')
  if (!config) url.searchParams.delete(GAME_QUERY)
  else {
    const value = serializeChallenge(config, fastInvalidate)
    if (value) url.searchParams.set(GAME_QUERY, value)
  }
  history[replace ? 'replaceState' : 'pushState'](history.state, '', url)
}

function materializeChallenge(config: ChallengeConfig): SettingsHardProps {
  if (config.mode === 'daily') return {...config, dailyVersion: config.dailyVersion ?? DAILY_CHALLENGE_VERSION}
  const words = WORDS['w' + config.wordLength]
  const wordIndex = Number.isInteger(config.wordIndex) ? config.wordIndex! : Math.floor(Math.random() * words.length)
  return {...config, wordIndex, randomId: config.mode === 'random' ? (config.randomId ?? `url-${wordIndex.toString(16)}`) : undefined}
}

function WordleModeMark(props:{mode: SettingsHardProps['mode']}) {
  const label = () => props.mode === 'daily' ? 'DAILY' : props.mode === 'random' ? 'RANDOM' : 'ADVANCED'
  return <span class='wordle-mode-mark' aria-label={`${label()} mode`}>{label().split('').map(letter => <i>{letter}</i>)}</span>
}

export default function Wordle() {
  const {softStore, hardStore} = GetSettingsStore()
  const savedHard = hardStore.get()!
  const savedSoft = softStore.get()!
  const urlChallenge = parseChallenge(new URL(location.href).searchParams.get(GAME_QUERY))
  const initialHard = urlChallenge?.hard ?? savedHard
  const hard = createMutable({...initialHard})
  const soft = createMutable({...savedSoft, fastInvalidate: urlChallenge?.fastInvalidate ?? savedSoft.fastInvalidate})
  const [showOpening, setShowOpening] = createSignal(!urlChallenge)
  const [dailyDate, setDailyDate] = createSignal(hard.dailyDate ?? localDateKey())

  createEffect(() => hardStore.set({...hard}))
  createEffect(() => softStore.set({...soft}))
  createEffect(() => {
    if (hard.mode === 'advanced') localStorage.setItem('game.wordle.settings.advanced', JSON.stringify({...hard, dailyDate: undefined, dailyVersion: undefined, randomId: undefined, wordIndex: undefined}))
  })
  createEffect(() => {
    if (!showOpening()) setChallengeQuery(hard, soft.fastInvalidate, true)
  })

  const commitConfig = (raw: ChallengeConfig) => batch(() => {
    const config = materializeChallenge(raw)
    hard.mode = config.mode
    hard.wordLength = config.wordLength
    hard.maxTries = config.maxTries
    hard.disabledLetters = config.disabledLetters
    hard.allowAny = config.allowAny
    hard.dailyDate = config.dailyDate
    hard.dailyVersion = config.dailyVersion
    hard.randomId = config.randomId
    hard.wordIndex = config.wordIndex
    soft.reveal = false
    setChallengeQuery(hard, soft.fastInvalidate, true)
    setShowOpening(false)
  })
  const swapWordleView = (commit: () => void, direction: 'forward' | 'back') => animateRootSwap(
    document.getElementById('wordle-root'),
    commit,
    () => document.getElementById('wordle-root'),
    direction,
  )
  const applyConfig = (config: ChallengeConfig) => swapWordleView(() => commitConfig(config), 'forward')

  const startDaily = () => void applyConfig(getDailyChallenge(dailyDate()))
  const startRandom = () => void applyConfig(createRandomChallenge())
  const startAdvanced = () => {
    let saved: SettingsHardProps = {mode: 'advanced', wordLength: 6, maxTries: 6, disabledLetters: 0, allowAny: false}
    try { saved = {...saved, ...JSON.parse(localStorage.getItem('game.wordle.settings.advanced') ?? '{}'), mode: 'advanced'} } catch {}
    void applyConfig({...saved, wordIndex: undefined})
  }
  const nextChallenge = () => {
    const next: ChallengeConfig = hard.mode === 'random'
      ? createRandomChallenge()
      : {...hard, mode: 'advanced', dailyDate: undefined, dailyVersion: undefined, randomId: undefined, wordIndex: undefined}
    void swapWordleView(() => commitConfig(next), 'forward')
  }
  const chooseMode = () => {
    void swapWordleView(() => {
      setChallengeQuery(undefined, soft.fastInvalidate, true)
      setDailyDate(hard.dailyDate ?? localDateKey())
      setShowOpening(true)
    }, 'back')
  }
  const updateAdvancedSetting = (patch: Partial<SettingsHardProps>) => {
    if (hard.mode !== 'advanced') return
    const next: SettingsHardProps = {...hard, ...patch, mode: 'advanced'}
    if (patch.wordLength !== undefined && patch.wordLength !== hard.wordLength) next.wordIndex = undefined
    // Every hard-setting combination identifies a distinct challenge. Keep the
    // current word where it remains valid, but materialize a fresh word when the
    // word length itself changes.
    void swapWordleView(() => commitConfig(next), 'forward')
  }
  const selectActiveGame = (config: SettingsHardProps) => {
    void swapWordleView(() => commitConfig(config), 'forward')
  }
  const gameKey = () => gameStorageKey({...hard})

  return <>
    <nav class='wordle-nav absolute items-center top-0'>
      <Show when={!showOpening()} fallback={<HomeBrand class='wordle-home-brand'/>}>
        <button type='button' class='wordle-nav-title wordle-logo-button' onClick={chooseMode} aria-label='Choose Wordle mode'><WordleMark class='wordle-logo'/></button><HomeIconLink class='wordle-home-icon'/>
      </Show>
      <Show when={!showOpening()}>
        <button type='button' class='wordle-mode-switch' onClick={chooseMode} aria-label='Change Wordle mode'><WordleModeMark mode={hard.mode}/></button>
      </Show>
      <div class='wordle-nav-spacer' />
      <Show when={!showOpening()}><StatsPageTrigger /></Show>
      <button type='button' class='wordle-nav-button wordle-appearance-trigger' data-samey-appearance aria-label='Appearance' aria-expanded='false'>
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><circle cx='12' cy='12' r='3'/><path d='M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12'/></svg>
      </button>
      <Show when={!showOpening()}>{Settings({soft, hard, showActive: true, showWordLength: true, onHardChange: updateAdvancedSetting, onSelectActiveGame: selectActiveGame})}</Show>
    </nav>
    <Show when={!showOpening()} fallback={<OpeningScreen date={dailyDate} setDate={setDailyDate} startDaily={startDaily} startRandom={startRandom} startAdvanced={startAdvanced} />}>
      <For each={[gameKey()]}>{() => RenderWordleModel({...hard}, soft, nextChallenge, chooseMode)}</For>
    </Show>
  </>
}
