'use strict'

import { batch, createEffect, createSignal, For, JSX, onCleanup, onMount, Show } from 'solid-js'
import { createMutable, unwrap } from 'solid-js/store'
import { showToast } from '~/registry/ui/toast'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '~/registry/ui/drawer'

import { showError } from '../../utils/toast'
import { LocalstorageStore } from '../../utils/store'
import Settings, { SettingsHardProps, SettingsSoftProps } from './popup_settings'
import { calcDiff, getGuessWord, getRandomWord, KindEnum, setDone } from './words'
import { binarySearch, hasPrefix, wordAt, wordCount } from './word-list'
import { StatsPageTrigger } from './page_stats'
import { ShareTrigger } from './page_share'
import { ChallengeConfig, createRandomChallenge, DAILY_CHALLENGE_VERSION, disabledLettersForWord, gameStorageKey, legacyGameStorageKey, getDailyChallenge, isChallengeConfig, isChallengeSettings, isValidDateKey, localDateKey, GAME_QUERY, parseChallenge, serializeChallenge } from './challenge'
import { BackLink, TopBar } from '../../shared/components/TopBar.tsx'
import { WordleMark, WORDLE_WORDMARK_COLORS } from '../../shared/components/Brand.tsx'
import { animateRootSwap } from '../../shared/transitions.ts'

type WordleStringState = 'g' | 'y' | 'r'
type Keys = 'Q' | 'W' | 'E' | 'R' | 'T' | 'Y' | 'U' | 'I' | 'O' | 'P' | 'A' | 'S' | 'D' | 'F' | 'G' | 'H' | 'J' | 'K' | 'L' | 'Z' | 'X' | 'C' | 'V' | 'B' | 'N' | 'M' | '⏎' | '⌫'

interface KeyState { state: WordleStringState | undefined; pressed: boolean }
interface KeyboardState extends Record<Keys, KeyState> {}

const ABCD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ⏎⌫'
const defaultKeyboardState = {} as KeyboardState
for (const key of ABCD) defaultKeyboardState[key as Keys] = {state: undefined, pressed: false}

function recordDone(entry: WordLocalStorageState, hard: SettingsHardProps, kind: KindEnum) {
  void setDone(entry, hard, kind).catch(error =>
    showError(error instanceof Error ? error : new Error('Could not save Wordle statistics'))
  )
}

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
            const dispatch = (type: 'keydown' | 'keyup') => document.dispatchEvent(new KeyboardEvent(type, evObj))
            return <button
              type='button'
              disabled={isDisabled}
              aria-label={isDisabled ? `${key} disabled for this game` : key}
              onpointerdown={e => {
                if (isDisabled) return
                e.preventDefault()
                e.currentTarget.setPointerCapture?.(e.pointerId)
                dispatch('keydown')
              }}
              onpointerup={e => {
                if (isDisabled) return
                dispatch('keyup')
                if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
              }}
              onpointercancel={() => !isDisabled && dispatch('keyup')}
              onClick={e => {
                // Native keyboard activation emits click with detail=0. Pointer input
                // is already handled on down/up so it must not insert twice.
                if (!isDisabled && e.detail === 0) { dispatch('keydown'); dispatch('keyup') }
              }}
              class={'wordle-key text-center ' + (
                key.length === 1 ? '' : 'wordle-key-wide ' 
              ) + (
                isDisabled ? 'wordle-key-disabled ' :
                this.state[char as Keys].state === 'g' ? 'wordle-state-g ' :
                this.state[char as Keys].state === 'y' ? 'wordle-state-y ' :
                this.state[char as Keys].state === 'r' ? 'wordle-state-r ' : 'wordle-key-neutral '
              ) + (!isDisabled && key.length === 1 && this.suggested.includes(key.toLowerCase()) ? 'wordle-key-suggested ' : '') + (this.state[char as Keys].pressed ? 'wordle-key-pressed' : '')}
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
            this.mask[i()] === 'r' ? 'wordle-state-r' :
            this.mask[i()] === 'y' ? 'wordle-state-y' :
            this.mask[i()] === 'g' ? 'wordle-state-g' :
            this.mask[i()] === 'b' ? 'wordle-state-b' :
            'wordle-state-empty'
          )}
        ><span class='wordle-cell-letter font-extrabold'>{char}</span></div>
      )}</For>
    </span>
  }
}

interface CurrentState { keyboard: KeyboardState; showPopOver: boolean; suggested: string; disabled: string }
export interface WordLocalStorageState {
  word: string
  wordIndex?: number
  history: [string, string][]
  disabled?: string
  disabledSeed?: string
  config?: SettingsHardProps
  done?: KindEnum
}

class GameState {
  state: CurrentState
  history: [string, string][]

  constructor(public soft: SettingsSoftProps, public hard: SettingsHardProps, public stateStore: LocalstorageStore<WordLocalStorageState>) {
    const stored = this.stateStore.current_value!

    if (!stored.word) {
      if (hard.mode === 'daily') {
        const daily = getDailyChallenge(hard.dailyDate ?? localDateKey(), hard.dailyVersion ?? DAILY_CHALLENGE_VERSION)
        stored.word = daily.word
        stored.disabled = daily.disabled
      } else {
        if (Number.isInteger(hard.wordIndex)) stored.word = wordAt(hard.wordLength, hard.wordIndex!) ?? ''
        if (!stored.word) {
          stored.word = getRandomWord(hard.wordLength)
          hard.wordIndex = binarySearch(hard.wordLength, stored.word)
        }
        stored.disabledSeed = legacyGameStorageKey(hard)
        stored.disabled = disabledLettersForWord(stored.word, hard.disabledLetters, stored.disabledSeed)
      }
      stored.config = {...hard}
    } else if (stored.disabled === undefined || hard.mode === 'daily') {
      stored.disabledSeed ??= hard.mode === 'daily' ? undefined : legacyGameStorageKey(stored.config ?? hard)
      stored.disabled = hard.mode === 'daily'
        ? getDailyChallenge(hard.dailyDate ?? localDateKey(), hard.dailyVersion ?? DAILY_CHALLENGE_VERSION).disabled
        : disabledLettersForWord(stored.word, hard.disabledLetters, stored.disabledSeed!)
      stored.config = {...hard}
    } else {
      // Existing saves already contain the exact disabled set. Preserve it and
      // remember the original seed so later slider changes extend/shrink the
      // same deterministic set instead of reshuffling unrelated letters.
      stored.disabledSeed ??= legacyGameStorageKey(stored.config ?? hard)
    }

    const lastColors = ((stored.history.at(-1) ?? ['', ''])![1] || '').split('')
    if (stored.done === undefined && lastColors.length === hard.wordLength) {
      if (lastColors.every(s => s === 'g')) stored.done = KindEnum.Correct
      else if (lastColors.every(s => s === 'b')) stored.done = KindEnum.Revealed
      else if (hard.maxTries !== 1 && stored.history.length >= hard.maxTries) stored.done = KindEnum.Failed
    }
    // One write per mount migrates legacy plaintext state and persists inferred completion.
    this.stateStore.set(stored)
    this.history = createMutable<[string, string][]>(stored.history)
    this.state = createMutable<CurrentState>({
      keyboard: Keyboard.stateFromHistory(stored.history),
      showPopOver: stored.done !== undefined,
      suggested: '',
      disabled: stored.disabled ?? '',
    })
    this.state.keyboard = createMutable(this.state.keyboard)
  }

  get disabled() { return this.state.disabled }

  isFinished() { return this.stateStore.current_value!.done !== undefined }

  existsPrefix(prefix: string) {
    return hasPrefix(this.hard.wordLength, prefix)
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
    if (guess.length !== this.hard.wordLength) return
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
      recordDone(this.stateStore.current_value!, this.hard, KindEnum.Correct)
      this.state.showPopOver = true
    } else if (this.hard.maxTries !== 1 && this.history.length >= this.hard.maxTries) {
      this.stateStore.current_value!.done = KindEnum.Failed
      this.persist()
      recordDone(this.stateStore.current_value!, this.hard, KindEnum.Failed)
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
      if (e.key === 'Enter') {
        if (!e.repeat) {
          if ((last[0] ?? '').length !== this.state.hard.wordLength) this.shakeCurrentBlock()
          else this.state.submit()
        }
        return
      }
      if (e.key === 'Backspace') { last[0] = (last[0] ?? '').slice(0, -1); last[1] = ''; this.state.fastInvalidate(); return }

      const key = e.key.toLowerCase()
      if (key.length !== 1 || !ABCD.toLowerCase().includes(key)) return
      if (this.state.disabled.includes(key)) {
        this.shakeCurrentBlock()
        return
      }
      if (last[0].length === this.state.hard.wordLength) {
        this.shakeCurrentBlock()
        return
      }
      last[0] += key
      this.state.fastInvalidate()
    })
  }

  private shakeCurrentBlock() {
    this.currentBlock?.classList.remove('wordle-invalid-wiggle')
    requestAnimationFrame(() => this.currentBlock?.classList.add('wordle-invalid-wiggle'))
  }

  handleKeyUp(e: KeyboardEvent) { this.setKeyState(e.key, false) }

  render() {
    createEffect(() => {
      if (this.state.soft.reveal && !this.state.isFinished()) batch(() => {
        this.state.stateStore.current_value!.done = KindEnum.Revealed
        recordDone(this.state.stateStore.current_value!, this.state.hard, KindEnum.Revealed)
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

    createEffect(() => {
      if (this.state.hard.mode !== 'advanced') return
      const stored = this.state.stateStore.current_value!
      const config = {...this.state.hard}
      stored.disabledSeed ??= legacyGameStorageKey(stored.config ?? config)
      const disabled = disabledLettersForWord(stored.word, config.disabledLetters, stored.disabledSeed)
      stored.disabled = disabled
      stored.config = config
      this.state.state.disabled = disabled
      const current = this.state.history.at(-1)
      if (current && !current[1] && [...current[0]].some(letter => disabled.includes(letter.toLowerCase()))) {
        current[0] = [...current[0]].filter(letter => !disabled.includes(letter.toLowerCase())).join('')
      }
      this.state.persist()
      this.state.fastInvalidate()
    })

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
                <DrawerTitle class={'result-word ' + (isCorrect ? 'text-success-foreground' : isRevealed ? 'wordle-revealed-text' : 'text-error-foreground')}>
                  <span class='result-answer'>{answer?.toUpperCase()}</span> <ShareTrigger word={() => answer} soft={this.state.soft} hard={this.state.hard} />
                </DrawerTitle>
                <DrawerDescription class='result-copy'>
                  {isCorrect ? <>Solved in <strong>{this.state.history.length}</strong> guesses.</> :
                   isRevealed ? <>The answer has been revealed.</> : <>You used all <strong>{this.state.hard.maxTries}</strong> guesses.</>}
                </DrawerDescription>
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
    if (!stored || typeof stored !== 'object' || !Array.isArray(stored.history) || stored.history.length === 0 ||
      stored.history.some(row => !Array.isArray(row) || row.length !== 2 || typeof row[0] !== 'string' || typeof row[1] !== 'string') ||
      (stored.word !== undefined && typeof stored.word !== 'string') ||
      (stored.wordIndex !== undefined && (!Number.isInteger(stored.wordIndex) || stored.wordIndex < 0)) ||
      (stored.disabled !== undefined && typeof stored.disabled !== 'string') ||
      (stored.disabledSeed !== undefined && typeof stored.disabledSeed !== 'string') ||
      (stored.done !== undefined && ![KindEnum.Correct, KindEnum.Failed, KindEnum.Revealed].includes(stored.done))) {
      throw new Error('Invalid saved Wordle state')
    }
    const savedConfig = (stored as {config?: unknown}).config
    if (savedConfig !== undefined && (!savedConfig || typeof savedConfig !== 'object' || Array.isArray(savedConfig))) {
      throw new Error('Invalid saved Wordle config')
    }
    // Fill fields that did not exist in older saves from the current challenge.
    const config = {...hard, ...(savedConfig as Partial<SettingsHardProps> | undefined)}
    if (!isChallengeConfig(config)) throw new Error('Invalid saved Wordle config')
    stored.config = config

    const lastIndex = stored.history.length - 1
    for (let index = 0; index < stored.history.length; index++) {
      const [guess, mask] = stored.history[index]
      const last = index === lastIndex
      if (guess.length > config.wordLength || (mask && (guess.length !== config.wordLength || mask.length !== config.wordLength))) {
        throw new Error('Invalid saved Wordle history')
      }
      if (!last && (guess.length !== config.wordLength || !/^[gyr]+$/.test(mask))) throw new Error('Invalid saved Wordle history')
      if (last && mask && !/^(?:[gyr]+|b+)$/.test(mask)) throw new Error('Invalid saved Wordle history')
      if (!last && mask.includes('b')) throw new Error('Invalid saved Wordle history')
    }
    const last = stored.history.at(-1)!
    const solved = last[1] === 'g'.repeat(config.wordLength)
    const revealed = last[1] === 'b'.repeat(config.wordLength)
    if (stored.done === KindEnum.Correct && !solved || stored.done === KindEnum.Revealed && !revealed ||
      stored.done === KindEnum.Failed && (config.maxTries === 1 || stored.history.length < config.maxTries || solved || revealed)) {
      throw new Error('Invalid saved Wordle completion')
    }
    if (stored.done === undefined && last[1] && !solved && !revealed && (config.maxTries === 1 || stored.history.length < config.maxTries)) {
      // A crash between evaluating a valid guess and appending the next blank row
      // should resume at the next guess instead of reopening a full, uneditable row.
      stored.history.push(['', ''])
    }

    if (!stored.word) {
      if (config.mode === 'daily' && config.dailyDate) {
        stored.word = getDailyChallenge(config.dailyDate, config.dailyVersion ?? DAILY_CHALLENGE_VERSION).word
      } else if (Number.isInteger(stored.wordIndex)) {
        stored.word = wordAt(config.wordLength, stored.wordIndex!) ?? ''
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
      const index = binarySearch(config.wordLength, stored.word.toLowerCase())
      if (index >= 0) stored.wordIndex = index
    }
    delete stored.word
    return JSON.stringify(stored)
  }
  const storageKey = gameStorageKey(hard)
  if (hard.mode === 'advanced' && Number.isInteger(hard.wordIndex)) try {
    if (!localStorage.getItem(storageKey)) {
      const legacyKey = legacyGameStorageKey(hard)
      const legacy = localStorage.getItem(legacyKey)
      if (legacy) {
        localStorage.setItem(storageKey, legacy)
        localStorage.removeItem(legacyKey)
        window.dispatchEvent(new CustomEvent('wordle:storage-change', {detail: {key: legacyKey}}))
        window.dispatchEvent(new CustomEvent('wordle:storage-change', {detail: {key: storageKey}}))
      }
    }
  } catch {}
  if (hard.mode === 'daily' && (hard.dailyVersion ?? DAILY_CHALLENGE_VERSION) === 1 && hard.dailyDate) try {
    if (!localStorage.getItem(storageKey)) {
      const legacyKey = `game.wordle.daily.${hard.dailyDate}`
      const legacy = localStorage.getItem(legacyKey)
      if (legacy) {
        localStorage.setItem(storageKey, legacy)
        localStorage.removeItem(legacyKey)
        window.dispatchEvent(new CustomEvent('wordle:storage-change', {detail: {key: storageKey}}))
      }
    }
  } catch {}
  const stateStore = new LocalstorageStore<WordLocalStorageState>(
    storageKey,
    {word: '', history: [['', '']], config: {...hard}},
    fromStorage,
    toStorage,
  )
  return new WordleModel(soft, hard, stateStore, onNextChallenge, onChooseMode).render()
}

export function GetSettingsStore(): {softStore: LocalstorageStore<SettingsSoftProps>, hardStore: LocalstorageStore<SettingsHardProps>} {
  const daily = getDailyChallenge(localDateKey())
  const hardDefault: SettingsHardProps = {
    mode: 'daily', wordLength: daily.wordLength, maxTries: daily.maxTries,
    disabledLetters: daily.disabledLetters, allowAny: daily.allowAny,
  }
  const parseSoft = (raw: string): SettingsSoftProps => {
    const value = JSON.parse(raw) as Partial<SettingsSoftProps>
    if (!value || typeof value !== 'object' || typeof value.fastInvalidate !== 'boolean') throw new Error('Invalid Wordle soft settings')
    return {reveal: false, fastInvalidate: value.fastInvalidate}
  }
  const parseHard = (raw: string): SettingsHardProps => {
    const value = JSON.parse(raw)
    if (!isChallengeSettings(value)) throw new Error('Invalid Wordle hard settings')
    return {mode: value.mode, wordLength: value.wordLength, maxTries: value.maxTries, disabledLetters: value.disabledLetters, allowAny: value.allowAny}
  }
  return {
    softStore: new LocalstorageStore('game.wordle.settings.soft', {reveal: false, fastInvalidate: true}, parseSoft, value => JSON.stringify({fastInvalidate: value.fastInvalidate})),
    hardStore: new LocalstorageStore('game.wordle.settings.hard', hardDefault, parseHard, JSON.stringify),
  }
}

function OpeningScreen({date, setDate, startDaily, startRandom, startAdvanced}: {date: () => string, setDate: (value: string) => void, startDaily: () => void, startRandom: () => void, startAdvanced: () => void}) {
  const validDate = () => isValidDateKey(date()) && date() <= localDateKey()
  const preview = () => validDate() ? getDailyChallenge(date()) : undefined
  const previewText = () => {
    const challenge = preview()
    return challenge ? `${challenge.wordLength} letters · ${challenge.maxTries} guesses · ${challenge.disabledLetters} disabled` : 'Choose a valid date.'
  }
  return <main class='wordle-opening'>
    <div class='wordle-opening-inner'>
      <h1>Pick a game.</h1>
      <div class='wordle-mode-grid'>
        <section class='wordle-mode-card wordle-mode-card-primary'>
          <h2>Daily</h2><p>New words, daily.</p>
          <label class='wordle-date-control'><span>Date</span><input type='date' value={date()} max={localDateKey()} onInput={e => setDate(e.currentTarget.value)} /></label>
          <div class='wordle-mode-spec'>{previewText()}</div>
          <button class='wordle-mode-action' disabled={!validDate()} onClick={startDaily}>Play</button>
        </section>
        <section class='wordle-mode-card'>
          <h2>Random</h2><p>You never know what to expect.</p>
          <button class='wordle-mode-action' onClick={startRandom}>Play</button>
        </section>
        <section class='wordle-mode-card'>
          <h2>Advanced</h2><p>Unparalleled customization.</p>
          <button class='wordle-mode-action' onClick={startAdvanced}>Configure</button>
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
  const wordIndex = Number.isInteger(config.wordIndex) ? config.wordIndex! : Math.floor(Math.random() * wordCount(config.wordLength))
  return {...config, wordIndex, randomId: config.mode === 'random' ? (config.randomId ?? `url-${wordIndex.toString(16)}`) : undefined}
}

function WordleModeMark(props:{mode: SettingsHardProps['mode']}) {
  const label = () => props.mode === 'daily' ? 'DAILY' : props.mode === 'random' ? 'RANDOM' : 'ADVANCED'
  return <WordleMark text={label()} colors={WORDLE_WORDMARK_COLORS} class='wordle-mode-mark' ariaLabel={`${label()} mode`}/>
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
    if (hard.mode === 'advanced') try {
      localStorage.setItem('game.wordle.settings.advanced', JSON.stringify({...hard, dailyDate: undefined, dailyVersion: undefined, randomId: undefined, wordIndex: undefined}))
    } catch {}
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

  const startDaily = () => {
    const date = dailyDate()
    if (!isValidDateKey(date) || date > localDateKey()) return
    void applyConfig(getDailyChallenge(date))
  }
  const startRandom = () => void applyConfig(createRandomChallenge())
  const startAdvanced = () => {
    let saved: SettingsHardProps = {mode: 'advanced', wordLength: 6, maxTries: 6, disabledLetters: 0, allowAny: false}
    try {
      const candidate = {...saved, ...JSON.parse(localStorage.getItem('game.wordle.settings.advanced') ?? '{}'), mode: 'advanced'}
      if (isChallengeSettings(candidate)) saved = candidate
    } catch {}
    void applyConfig({...saved, dailyDate: undefined, dailyVersion: undefined, randomId: undefined, wordIndex: undefined})
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
    if (hard.mode !== 'advanced' || (Object.entries(patch) as [keyof SettingsHardProps, unknown][]).every(([key, value]) => hard[key] === value)) return
    const next: SettingsHardProps = {...hard, ...patch, mode: 'advanced'}
    if (patch.wordLength !== undefined && patch.wordLength !== hard.wordLength) next.wordIndex = undefined
    // Settings are edited from an open popover. Apply them directly so the
    // game surface updates under the pointer instead of animating the whole
    // Wordle root on every slider step.
    commitConfig(next)
  }
  const selectActiveGame = (config: SettingsHardProps) => {
    void swapWordleView(() => commitConfig(config), 'forward')
  }
  const gameKey = () => gameStorageKey({...hard})

  const gameContext = () => <><WordleModeMark mode={hard.mode}/><span class='wordle-topbar-actions'><StatsPageTrigger />{Settings({soft, hard, showActive: true, showWordLength: true, onHardChange: updateAdvancedSetting, onSelectActiveGame: selectActiveGame})}</span></>
  const wordleBack = () => <BackLink onClick={chooseMode} class='wordle-wordle-back'><WordleMark text='WORDLE' colors={WORDLE_WORDMARK_COLORS} class='wordle-back-wordmark' ariaLabel='Wordle'/></BackLink>

  return <>
    <TopBar start={!showOpening() ? wordleBack() : undefined} contextClass='wordle-topbar-context' context={showOpening() ? <span class='wordle-topbar-actions'><StatsPageTrigger /></span> : gameContext()}/>
    <Show when={!showOpening()} fallback={<OpeningScreen date={dailyDate} setDate={setDailyDate} startDaily={startDaily} startRandom={startRandom} startAdvanced={startAdvanced} />}>
      <For each={[gameKey()]}>{() => RenderWordleModel(hard, soft, nextChallenge, chooseMode)}</For>
    </Show>
  </>
}
