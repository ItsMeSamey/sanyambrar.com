'use strict'

import { createEffect, createMemo, createSignal, createStore, For, onCleanup, onSettled, Show, snapshot, untrack, type StoreSetter } from 'solid-js';
import { showError, showToast } from '~/registry/ui/toast'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '~/registry/ui/dialog'

import Settings, { SettingsHardProps, SettingsSoftProps } from './popup_settings'
import { calcDiff, getCompletedDailyDates, getGuessWord, getRandomWord, KindEnum, setDone } from './words'
import { binarySearch, playableNextLetters, wordAt, wordCount } from './word-list'
import { StatsPageTrigger } from './page_stats'
import { ShareTrigger } from './page_share'
import { ChallengeConfig, createRandomChallenge, DAILY_CHALLENGE_VERSION, disabledLettersForWord, gameStorageKey, legacyGameStorageKey, getDailyChallenge, isChallengeConfig, isChallengeSettings, isValidDateKey, localDateKey, GAME_QUERY, parseChallenge, serializeChallenge } from './challenge'
import { GameTopBarActions, TopBar } from '../../shared/components/TopBar.tsx'
import { WordleMark, WORDLE_WORDMARK_COLORS } from '../../shared/components/Brand.tsx'
import { WordleBackButton } from './WordleBackButton'
import { animateRootSwap } from '../../shared/transitions.ts'
import { pageRoot } from './navigation.ts'
import { WordleDatePicker } from './WordleDatePicker'

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
              onPointerDown={e => {
                if (isDisabled) return
                e.preventDefault()
                e.currentTarget.setPointerCapture?.(e.pointerId)
                dispatch('keydown')
              }}
              onPointerUp={e => {
                if (isDisabled) return
                dispatch('keyup')
                if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
              }}
              onPointerCancel={() => !isDisabled && dispatch('keyup')}
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

  render(ref?: (element: HTMLSpanElement) => void) {
    this.word = this.word.slice(0, this.wordLength)
    if (this.word.length < this.wordLength) this.word += ' '.repeat(this.wordLength - this.word.length)
    return <span ref={ref} class='wordle-row text-foreground' style={{'--wordle-length': this.wordLength}}>
      <For each={[...this.word]}>{(char, i) => (
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

interface CurrentState { keyboard: KeyboardState; showPopOver: boolean; disabled: string; history: [string, string][]; done?: KindEnum }
interface WordLocalStorageState {
  word: string
  wordIndex?: number
  history: [string, string][]
  disabled?: string
  disabledSeed?: string
  config?: SettingsHardProps
  done?: KindEnum
}

type UnknownRecord = Record<string, unknown>
const isRecord = (value: unknown): value is UnknownRecord => value !== null && typeof value === 'object' && !Array.isArray(value)
const isWordleHistory = (value: unknown): value is [string, string][] =>
  Array.isArray(value) && value.length > 0 && value.every(row =>
    Array.isArray(row) && row.length === 2 && typeof row[0] === 'string' && typeof row[1] === 'string'
  )

type StorageCell<T> = { get(): T; set(value: T): void }

function storageCell<T>(key: string, fallback: T, parse: (raw: string) => T, serialize: (value: T) => string): StorageCell<T> {
  let value = fallback
  const save = (next: T) => {
    value = next
    try { localStorage.setItem(key, serialize(next)) } catch {}
    window.dispatchEvent(new CustomEvent('wordle:storage-change', {detail: {key}}))
  }
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) save(fallback)
    else value = parse(raw)
  } catch {
    save(fallback)
  }
  return {get: () => value, set: save}
}

class GameState {
  state: CurrentState
  readonly setState: StoreSetter<CurrentState>
  readonly stored: WordLocalStorageState

  constructor(public soft: SettingsSoftProps, public hard: SettingsHardProps, public stateStore: StorageCell<WordLocalStorageState>) {
    const stored = stateStore.get()
    if (!stored) throw new Error('Wordle state store has no initial state')
    this.stored = stored

    if (!stored.word) {
      if (hard.mode === 'daily') {
        const daily = getDailyChallenge(hard.dailyDate ?? localDateKey(), hard.dailyVersion ?? DAILY_CHALLENGE_VERSION)
        stored.word = daily.word
        stored.disabled = daily.disabled
      } else {
        if (typeof hard.wordIndex === 'number' && Number.isInteger(hard.wordIndex)) stored.word = wordAt(hard.wordLength, hard.wordIndex) ?? ''
        if (!stored.word) {
          stored.word = getRandomWord(hard.wordLength)
          stored.wordIndex = binarySearch(hard.wordLength, stored.word)
        }
        stored.disabledSeed = legacyGameStorageKey(hard)
        stored.disabled = disabledLettersForWord(stored.word, hard.disabledLetters, stored.disabledSeed)
      }
      stored.config = {...hard}
    } else if (stored.disabled === undefined || hard.mode === 'daily') {
      if (hard.mode === 'daily') {
        stored.disabledSeed = undefined
        stored.disabled = getDailyChallenge(hard.dailyDate ?? localDateKey(), hard.dailyVersion ?? DAILY_CHALLENGE_VERSION).disabled
      } else {
        const disabledSeed = stored.disabledSeed ?? legacyGameStorageKey(stored.config ?? hard)
        stored.disabledSeed = disabledSeed
        stored.disabled = disabledLettersForWord(stored.word, hard.disabledLetters, disabledSeed)
      }
      stored.config = {...hard}
    } else {
      // Existing saves already contain the exact disabled set. Preserve it and
      // remember the original seed so later slider changes extend/shrink the
      // same deterministic set instead of reshuffling unrelated letters.
      stored.disabledSeed ??= legacyGameStorageKey(stored.config ?? hard)
    }

    const lastColors = (stored.history[stored.history.length - 1][1] || '').split('')
    if (stored.done === undefined && lastColors.length === hard.wordLength) {
      if (lastColors.every(s => s === 'g')) stored.done = KindEnum.Correct
      else if (lastColors.every(s => s === 'b')) stored.done = KindEnum.Revealed
      else if (hard.maxTries !== 1 && stored.history.length >= hard.maxTries) stored.done = KindEnum.Failed
    }
    [this.state, this.setState] = createStore<CurrentState>({
      keyboard: Keyboard.stateFromHistory(stored.history),
      showPopOver: stored.done !== undefined,
      disabled: stored.disabled ?? '',
      history: structuredClone(stored.history),
      done: stored.done,
    })
    // Persist legacy save migration after mount, not while constructing a scope.
    onSettled(() => this.persist(snapshot(this.state)))
  }

  get disabled() { return this.state.disabled }
  get history() { return this.state.history }
  get currentEntry(): [string, string] { return this.history[this.history.length - 1] }
  isFinished() { return this.state.done !== undefined }

  private persist(draft: CurrentState) {
    this.stored.history = snapshot(draft.history)
    this.stored.done = draft.done
    this.stored.config = snapshot(this.hard)
    this.stateStore.set(this.stored)
  }

  submit() {
    this.setState(draft => {
      if (draft.done !== undefined) return
      const last = draft.history[draft.history.length - 1]
      const guess = last[0]
      if (guess.length !== this.hard.wordLength) return
      if (!this.hard.allowAny && !getGuessWord(guess)) {
        showToast({title: 'Invalid guess', description: `${guess.toUpperCase()} is not in the dictionary.`, variant: 'error', duration: 1000})
        return
      }

      const response = calcDiff(this.stored.word, guess)
      for (let i = 0; i < this.hard.wordLength; i++) {
        const key = draft.keyboard[guess[i].toUpperCase() as Keys]
        if (key.state === 'g' || (key.state === 'y' && response[i] === 'r')) continue
        key.state = response[i] as WordleStringState
      }
      last[1] = response
      if ([...response].every(color => color === 'g')) draft.done = KindEnum.Correct
      else if (this.hard.maxTries !== 1 && draft.history.length >= this.hard.maxTries) draft.done = KindEnum.Failed
      else draft.history.push(['', ''])

      this.persist(draft)
      if (draft.done !== undefined) {
        recordDone(this.stored, this.hard, draft.done)
        draft.showPopOver = true
      }
    })
  }

  reveal() {
    this.setState(draft => {
      if (draft.done !== undefined) return
      const last = draft.history[draft.history.length - 1]
      last[0] = this.stored.word
      last[1] = 'b'.repeat(this.hard.wordLength)
      draft.done = KindEnum.Revealed
      draft.showPopOver = true
      this.persist(draft)
      recordDone(this.stored, this.hard, KindEnum.Revealed)
    })
  }

  updateAdvanced(config: SettingsHardProps) {
    if (config.mode !== 'advanced') return
    this.stored.disabledSeed ??= legacyGameStorageKey(this.stored.config ?? config)
    const disabled = disabledLettersForWord(this.stored.word, config.disabledLetters, this.stored.disabledSeed)
    this.stored.disabled = disabled
    this.setState(draft => {
      draft.disabled = disabled
      const current = draft.history.at(-1)
      if (current && !current[1]) current[0] = [...current[0]].filter(letter => !disabled.includes(letter.toLowerCase())).join('')
      this.persist(draft)
    })
  }

}

class WordleModel {
  state: GameState
  currentBlock?: HTMLSpanElement

  constructor(soft: SettingsSoftProps, hard: SettingsHardProps, stateStore: StorageCell<WordLocalStorageState>, private onNextChallenge: () => void, private onChooseMode: () => void) {
    this.state = untrack(() => new GameState(soft, hard, stateStore))
  }

  setKeyState(key: string, pressed: boolean) {
    key = key.toUpperCase()
    if (key === 'ENTER') key = '⏎'
    if (key === 'BACKSPACE') key = '⌫'
    if (key.length === 1 && ABCD.includes(key)) this.state.setState(draft => { draft.keyboard[key as Keys].pressed = pressed })
  }

  handleKeyDown(e: KeyboardEvent) {
    const target = e.target instanceof Element ? e.target : null
    const interactive = target?.closest('input, textarea, select, button, a, [contenteditable="true"], [role="dialog"], [role="slider"], [role="switch"]')
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || interactive) return
    if (this.state.isFinished()) return
    this.setKeyState(e.key, true)
    if (e.key === 'Enter') {
      e.preventDefault()
      if (!e.repeat) {
        if (this.state.currentEntry[0].length !== this.state.hard.wordLength) this.shakeCurrentBlock()
        else this.state.submit()
      }
      return
    }
    const key = e.key.toLowerCase()
    if (key !== 'backspace' && key !== 'escape' && (key.length !== 1 || !ABCD.toLowerCase().includes(key))) return
    e.preventDefault()
    this.state.setState(draft => {
      if (draft.done !== undefined) return
      const last = draft.history[draft.history.length - 1]
      if (key === 'escape') { last[0] = ''; last[1] = ''; return }
      if (key === 'backspace') { last[0] = last[0].slice(0, -1); last[1] = ''; return }
      if (draft.disabled.includes(key) || last[0].length === this.state.hard.wordLength) {
        this.shakeCurrentBlock()
        return
      }
      last[0] += key
    })
  }

  private shakeCurrentBlock() {
    this.currentBlock?.classList.remove('wordle-invalid-wiggle')
    requestAnimationFrame(() => this.currentBlock?.classList.add('wordle-invalid-wiggle'))
  }

  handleKeyUp(e: KeyboardEvent) { this.setKeyState(e.key, false) }

  render() {
    createEffect(() => this.state.soft.reveal, reveal => { if (reveal) this.state.reveal() })
    createEffect(() => ({...this.state.hard}), config => this.state.updateAdvanced(config))
    const suggested = createMemo(() => {
      if (!this.state.soft.fastInvalidate || this.state.hard.allowAny || this.state.isFinished()) return ''
      return playableNextLetters(this.state.hard.wordLength, this.state.currentEntry[0].toLowerCase(), this.state.disabled)
    })

    const handleKeyUp = (e: KeyboardEvent) => this.handleKeyUp(e)
    const handleKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e)
    const clearPressed = () => {
      this.state.setState(draft => { for (const key of Object.keys(draft.keyboard) as Keys[]) draft.keyboard[key].pressed = false })
    }
    onSettled(() => {
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
      <Dialog open={this.state.state.showPopOver} onOpenChange={value => this.state.setState(draft => { draft.showPopOver = value })}>
        <DialogContent class='result-dialog'>
          <div>
            <button type='button' class='result-close top-icon' aria-label='Close result' onClick={() => this.state.setState(draft => { draft.showPopOver = false })}>×</button>
            {(() => {
              const last = this.state.currentEntry
              const answer = this.state.stored.word
              const isCorrect = last[0] === answer && last[1].split('').every(s => s === 'g')
              const isRevealed = last[0] === answer && last[1].split('').every(s => s === 'b')
              return <>
                <span class='result-kicker'>{isCorrect ? 'Solved' : isRevealed ? 'Revealed' : 'Game over'} / {modeTitle()}</span>
                <DialogTitle class={'result-word ' + (isCorrect ? 'text-success-foreground' : isRevealed ? 'wordle-revealed-text' : 'text-error-foreground')}>
                  <span class='result-answer'>{answer?.toUpperCase()}</span> <ShareTrigger word={() => answer} soft={this.state.soft} hard={this.state.hard} />
                </DialogTitle>
                <DialogDescription class='result-copy'>
                  {isCorrect ? <>Solved in <strong>{this.state.history.length}</strong> guesses.</> :
                   isRevealed ? <>The answer has been revealed.</> : <>You used all <strong>{this.state.hard.maxTries}</strong> guesses.</>}
                </DialogDescription>
                <div class='result-actions'>
                  <Show when={this.state.hard.mode === 'random'}><button onClick={this.onNextChallenge}>Next random</button></Show>
                  <Show when={this.state.hard.mode === 'advanced'}><button onClick={this.onNextChallenge}>Play again</button></Show>
                  <button class='result-secondary' onClick={this.onChooseMode}>{this.state.hard.mode === 'daily' ? 'Choose another day' : 'Change mode'}</button>
                </div>
              </>
            })()}
          </div>
        </DialogContent>
      </Dialog>

      <div class='wordle-board mx-auto'>
        <For each={this.state.history.length ? this.state.history.slice(0, -1) : []}>{([word, mask]) => new Block(this.state.hard.wordLength, word, mask).render()}</For>
        {(() => {
          const last = this.state.currentEntry
          const currentBlock = new Block(this.state.hard.wordLength, last[0], last[1]).render(element => { this.currentBlock = element })
          onSettled(() => { this.currentBlock?.scrollIntoView({behavior: 'smooth', block: 'nearest'}) })
          return currentBlock
        })()}
        <Show when={this.state.hard.maxTries !== 1}>
          <For each={Array.from({length: Math.max(0, this.state.hard.maxTries - this.state.history.length)}).fill(undefined)}>{() => new Block(this.state.hard.wordLength, '', '').render()}</For>
        </Show>
      </div>
      <div class='wordle-keyboard justify-center justify-items-center overflow-visible'>{new Keyboard(this.state.state.keyboard, this.state.disabled, suggested()).render()}</div>
    </div>
  }
}

function RenderWordleModel(hard: SettingsHardProps, soft: SettingsSoftProps, onNextChallenge: () => void, onChooseMode: () => void) {
  const fromStorage = (raw: string): WordLocalStorageState => {
    const value: unknown = JSON.parse(raw)
    if (!isRecord(value) || !isWordleHistory(value.history) ||
      (value.word !== undefined && typeof value.word !== 'string') ||
      (value.wordIndex !== undefined && (typeof value.wordIndex !== 'number' || !Number.isInteger(value.wordIndex) || value.wordIndex < 0)) ||
      (value.disabled !== undefined && typeof value.disabled !== 'string') ||
      (value.disabledSeed !== undefined && typeof value.disabledSeed !== 'string') ||
      (value.done !== undefined && value.done !== KindEnum.Correct && value.done !== KindEnum.Failed && value.done !== KindEnum.Revealed)) {
      throw new Error('Invalid saved Wordle state')
    }
    const savedConfig = value.config
    if (savedConfig !== undefined && !isRecord(savedConfig)) throw new Error('Invalid saved Wordle config')
    // Fill fields that did not exist in older saves from the current challenge.
    const config = {...hard, ...(savedConfig ?? {})}
    if (!isChallengeConfig(config)) throw new Error('Invalid saved Wordle config')
    const stored: WordLocalStorageState = {
      word: typeof value.word === 'string' ? value.word : '',
      wordIndex: typeof value.wordIndex === 'number' ? value.wordIndex : undefined,
      history: value.history,
      disabled: typeof value.disabled === 'string' ? value.disabled : undefined,
      disabledSeed: typeof value.disabledSeed === 'string' ? value.disabledSeed : undefined,
      config,
      done: value.done,
    }

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
    const last = stored.history[stored.history.length - 1]
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
      } else if (typeof stored.wordIndex === 'number' && Number.isInteger(stored.wordIndex)) {
        stored.word = wordAt(config.wordLength, stored.wordIndex) ?? ''
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
  const stateStore = storageCell<WordLocalStorageState>(
    storageKey,
    {word: '', history: [['', '']], config: {...hard}},
    fromStorage,
    toStorage,
  )
  return new WordleModel(soft, hard, stateStore, onNextChallenge, onChooseMode).render()
}

function getSettingsStore(): {softStore: StorageCell<SettingsSoftProps>, hardStore: StorageCell<SettingsHardProps>} {
  const daily = getDailyChallenge(localDateKey())
  const hardDefault: SettingsHardProps = {
    mode: 'daily', wordLength: daily.wordLength, maxTries: daily.maxTries,
    disabledLetters: daily.disabledLetters, allowAny: daily.allowAny,
  }
  const parseSoft = (raw: string): SettingsSoftProps => {
    const value: unknown = JSON.parse(raw)
    if (!isRecord(value) || typeof value.fastInvalidate !== 'boolean') throw new Error('Invalid Wordle soft settings')
    return {reveal: false, fastInvalidate: value.fastInvalidate}
  }
  const parseHard = (raw: string): SettingsHardProps => {
    const value: unknown = JSON.parse(raw)
    if (!isChallengeSettings(value)) throw new Error('Invalid Wordle hard settings')
    return {mode: value.mode, wordLength: value.wordLength, maxTries: value.maxTries, disabledLetters: value.disabledLetters, allowAny: value.allowAny}
  }
  return {
    softStore: storageCell('game.wordle.settings.soft', {reveal: false, fastInvalidate: true}, parseSoft, value => JSON.stringify({fastInvalidate: value.fastInvalidate})),
    hardStore: storageCell('game.wordle.settings.hard', hardDefault, parseHard, JSON.stringify),
  }
}

function OpeningScreen({date, setDate, startDaily, startRandom, startAdvanced}: {date: () => string, setDate: (value: string) => void, startDaily: () => void, startRandom: () => void, startAdvanced: () => void}) {
  const [completedDates, setCompletedDates] = createSignal<ReadonlySet<string>>(new Set())
  const validDate = () => isValidDateKey(date()) && date() <= localDateKey()
  const preview = () => validDate() ? getDailyChallenge(date()) : undefined
  const previewText = () => {
    const challenge = preview()
    return challenge ? `${challenge.wordLength} letters · ${challenge.maxTries} guesses · ${challenge.disabledLetters} disabled` : 'Choose a valid date.'
  }
  const refreshCompletedDates = () => void getCompletedDailyDates().then(setCompletedDates).catch(() => setCompletedDates(new Set<string>()))
  onSettled(() => {
    refreshCompletedDates()
    window.addEventListener('wordle:stats-change', refreshCompletedDates)
  })
  onCleanup(() => window.removeEventListener('wordle:stats-change', refreshCompletedDates))
  return <main class='wordle-opening'>
    <div class='wordle-opening-inner'>
      <h1>Pick a game.</h1>
      <div class='wordle-mode-grid'>
        <section class='wordle-mode-card wordle-mode-card-primary'>
          <h2>Daily</h2><p>New words, daily.</p>
          <div class='wordle-date-control'>
            <span>Date</span>
            <WordleDatePicker value={date()} max={localDateKey()} completedDates={completedDates()} onValueChange={setDate} />
          </div>
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
  const {softStore, hardStore} = getSettingsStore()
  const savedHard = hardStore.get()!
  const savedSoft = softStore.get()!
  const urlChallenge = parseChallenge(new URL(location.href).searchParams.get(GAME_QUERY))
  const initialHard = materializeChallenge(urlChallenge?.hard ?? savedHard)
  const [hard, setHard] = createStore({...initialHard})
  const [soft, setSoft] = createStore({...savedSoft, fastInvalidate: urlChallenge?.fastInvalidate ?? savedSoft.fastInvalidate})
  const [showOpening, setShowOpening] = createSignal(!urlChallenge)
  const [dailyDate, setDailyDate] = createSignal(initialHard.dailyDate ?? localDateKey())

  createEffect(() => ({...hard}), config => {
    hardStore.set(config)
    if (config.mode === 'advanced') try {
      localStorage.setItem('game.wordle.settings.advanced', JSON.stringify({...config, dailyDate: undefined, dailyVersion: undefined, randomId: undefined, wordIndex: undefined}))
    } catch {}
  })
  createEffect(() => ({...soft}), config => softStore.set(config))
  createEffect(() => ({opening: showOpening(), config: {...hard}, fastInvalidate: soft.fastInvalidate}), value => {
    if (!value.opening) setChallengeQuery(value.config, value.fastInvalidate, true)
  })

  const updateSoft = (patch: Partial<SettingsSoftProps>) => setSoft(draft => { Object.assign(draft, patch) })
  const commitConfig = (raw: ChallengeConfig) => {
    const config = materializeChallenge(raw)
    setHard(draft => {
      Object.assign(draft, {dailyDate: undefined, dailyVersion: undefined, randomId: undefined, wordIndex: undefined}, config)
    })
    updateSoft({reveal: false})
    setChallengeQuery(config, soft.fastInvalidate, true)
    setShowOpening(false)
  }
  const swapWordleView = (commit: () => void, direction: 'forward' | 'back') => animateRootSwap(pageRoot(), commit, pageRoot, direction)
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
      const stored: unknown = JSON.parse(localStorage.getItem('game.wordle.settings.advanced') ?? '{}')
      const candidate = {...saved, ...(isRecord(stored) ? stored : {}), mode: 'advanced'}
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

  const gameActions = () => <GameTopBarActions ariaLabel='Wordle'>
    <StatsPageTrigger />
    {!showOpening() && <Settings soft={soft} hard={hard} showActive={true} showWordLength={true} onHardChange={updateAdvancedSetting} onSoftChange={updateSoft} onSelectActiveGame={selectActiveGame} />}
  </GameTopBarActions>

  return <>
    <TopBar
      start={!showOpening() ? <WordleBackButton onClick={chooseMode}/> : undefined}
      contextClass='wordle-topbar-context'
      context={!showOpening() ? <WordleModeMark mode={hard.mode}/> : undefined}
      nav={gameActions()}
    />
    <Show when={!showOpening()} fallback={<OpeningScreen date={dailyDate} setDate={setDailyDate} startDaily={startDaily} startRandom={startRandom} startAdvanced={startAdvanced} />}>
      {/* The key owns game lifetime; construction reads a settings snapshot. */}
      <For each={[gameKey()]}>{() => untrack(() => RenderWordleModel(hard, soft, nextChallenge, chooseMode))}</For>
    </Show>
  </>
}
