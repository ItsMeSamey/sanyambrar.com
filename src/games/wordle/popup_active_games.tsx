'use strict'

import { batch, createSignal, For, JSX, onCleanup, onMount, Show } from 'solid-js'
import { Dialog, DialogContent, DialogTrigger } from '~/registry/ui/dialog'
import { Block, WordLocalStorageState } from './page'
import { SettingsHardProps } from './popup_settings'
import { getDailyChallenge, LEGACY_DAILY_CHALLENGE_VERSION, isChallengeConfig, isDailyChallengeVersion } from './challenge'
import { binarySearch, wordCount } from './word-list'

interface ActiveGame {
  key: string
  config: SettingsHardProps
  history: [string, string][]
}

const LEGACY_RE = /^game\.wordle\.(any\.)?(\d+)\.(\d+)$/
const ADVANCED_RE = /^game\.wordle\.advanced\.(any\.)?(\d+)\.(\d+)\.(\d+)$/
const MODERN_ADVANCED_RE = /^game\.wordle\.advanced\.(\d+)\.(\d+)\.(\d+)\.([01])(?:\.([0-9a-f]+))?$/i
const DAILY_RE = /^game\.wordle\.daily\.([0-9a-f]+)\.(\d{4}-\d{2}-\d{2})$/i
const LEGACY_DAILY_RE = /^game\.wordle\.daily\.(\d{4}-\d{2}-\d{2})$/

function readConfig(key: string, value: WordLocalStorageState): SettingsHardProps | undefined {
  let config: SettingsHardProps | undefined
  if (value.config?.mode) config = value.config.mode === 'daily'
    ? {...value.config, dailyVersion: value.config.dailyVersion ?? LEGACY_DAILY_CHALLENGE_VERSION}
    : {...value.config}

  if (!config) {
    let match = MODERN_ADVANCED_RE.exec(key)
    if (match) config = {
      mode: 'advanced', wordLength: Number(match[1]) as any, maxTries: Number(match[2]),
      disabledLetters: Number(match[3]), allowAny: match[4] === '1',
      wordIndex: match[5] ? Number.parseInt(match[5], 16) : undefined,
    }

    match = ADVANCED_RE.exec(key)
    if (!config && match) config = {
      mode: 'advanced', allowAny: !!match[1], wordLength: Number(match[2]) as any,
      maxTries: Number(match[3]), disabledLetters: Number(match[4]),
    }

    match = DAILY_RE.exec(key)
    if (!config && match) {
      const version = Number.parseInt(match[1], 16)
      if (isDailyChallengeVersion(version)) config = getDailyChallenge(match[2], version)
    }

    match = LEGACY_DAILY_RE.exec(key)
    if (!config && match) config = getDailyChallenge(match[1], LEGACY_DAILY_CHALLENGE_VERSION)

    match = LEGACY_RE.exec(key)
    if (!config && match) config = {
      mode: 'advanced', allowAny: !!match[1], wordLength: Number(match[2]) as any,
      maxTries: Number(match[3]), disabledLetters: 0,
    }
  }

  if (!config || config.mode === 'daily' || Number.isInteger(config.wordIndex)) return config
  const index = Number.isInteger(value.wordIndex) ? value.wordIndex! : typeof value.word === 'string' ? binarySearch(config.wordLength, value.word.toLowerCase()) : -1
  if (index >= 0 && index < wordCount(config.wordLength)) config.wordIndex = index
  return config
}

const sortGames = (games: ActiveGame[]) => games.sort((a, b) => a.config.mode.localeCompare(b.config.mode) || a.config.wordLength - b.config.wordLength || a.config.maxTries - b.config.maxTries)

function readActiveGame(key: string): ActiveGame | undefined {
  if (!key.startsWith('game.wordle.') || key.startsWith('game.wordle.settings.')) return
  try {
    const value = JSON.parse(localStorage.getItem(key)!) as WordLocalStorageState
    if (!Array.isArray(value?.history) || value.history.length <= 1) return
    const config = readConfig(key, value)
    if (!isChallengeConfig(config) || value.done !== undefined) return
    const current = value.history.at(-1)!
    const played = value.history.slice(0, -1)
    if (played.some(row => !Array.isArray(row) || row.length !== 2 || typeof row[0] !== 'string' || typeof row[1] !== 'string' ||
      row[0].length !== config.wordLength || row[1].length !== config.wordLength || !/^[gyr]+$/.test(row[1])) ||
      !Array.isArray(current) || current.length !== 2 || typeof current[0] !== 'string' || typeof current[1] !== 'string' ||
      current[0].length > config.wordLength || current[1] !== '') return
    return {key, config, history: played}
  } catch {}
}

function sameGame(a: ActiveGame, b: ActiveGame) {
  if (a.config.mode !== b.config.mode || a.config.wordLength !== b.config.wordLength || a.config.maxTries !== b.config.maxTries ||
    a.config.allowAny !== b.config.allowAny || a.config.disabledLetters !== b.config.disabledLetters ||
    a.config.dailyDate !== b.config.dailyDate || a.config.dailyVersion !== b.config.dailyVersion ||
    a.config.wordIndex !== b.config.wordIndex || a.history.length !== b.history.length) return false
  return a.history.every((row, index) => row[0] === b.history[index][0] && row[1] === b.history[index][1])
}

export function getActiveGames(): ActiveGame[] {
  const games: ActiveGame[] = []
  try {
    for (let n = 0; n < localStorage.length; n++) {
      const key = localStorage.key(n)
      if (!key) continue
      const game = readActiveGame(key)
      if (game) games.push(game)
    }
  } catch {}
  return sortGames(games)
}

export function ActiveGames({hard, onSelect}: {hard: SettingsHardProps, onSelect?: (config: SettingsHardProps) => void}): JSX.Element {
  const [open, setOpen] = createSignal(false)
  const [games, setGames] = createSignal(getActiveGames())
  const refresh = () => setGames(getActiveGames())
  const refreshKey = (key: string) => {
    if (!key.startsWith('game.wordle.') || key.startsWith('game.wordle.settings.')) return
    const game = readActiveGame(key)
    setGames(current => {
      const index = current.findIndex(item => item.key === key)
      if (!game) return index < 0 ? current : [...current.slice(0, index), ...current.slice(index + 1)]
      if (index >= 0 && sameGame(current[index], game)) return current
      const next = [...current]
      if (index < 0) next.push(game); else next[index] = game
      return sortGames(next)
    })
  }
  const onStorage = (event: StorageEvent) => event.key ? refreshKey(event.key) : refresh()
  const onWordleStorage = (event: Event) => {
    const key = (event as CustomEvent<{key?: string}>).detail?.key
    if (key) refreshKey(key); else refresh()
  }

  onMount(() => { window.addEventListener('storage', onStorage); window.addEventListener('wordle:storage-change', onWordleStorage) })
  onCleanup(() => { window.removeEventListener('storage', onStorage); window.removeEventListener('wordle:storage-change', onWordleStorage) })

  const current = (game: ActiveGame) => {
    const c = game.config
    return hard.mode === c.mode && hard.wordLength === c.wordLength && hard.maxTries === c.maxTries && hard.allowAny === c.allowAny &&
      hard.disabledLetters === c.disabledLetters && hard.dailyDate === c.dailyDate && hard.dailyVersion === c.dailyVersion && hard.wordIndex === c.wordIndex
  }

  return <Show when={games().length > 0}>
    <Dialog open={open()} onOpenChange={value => { if (value) refresh(); setOpen(value) }}>
      <DialogTrigger as='button' type='button' class='game-settings-action'>Active Games</DialogTrigger>
      <DialogContent class='active-games-dialog'>
        <Show when={open()}>
          <div class='active-games-header'><strong>Active games</strong><span>{games().length}</span></div>
          <div class='active-games-list'>
            <For each={games()}>{game => <button
              type='button' class='active-game-card' data-current={current(game) ? '' : undefined}
              onClick={() => batch(() => {
                if (current(game)) return setOpen(false)
                if (onSelect) onSelect({...game.config})
                else {
                  hard.mode = game.config.mode
                  hard.wordLength = game.config.wordLength
                  hard.maxTries = game.config.maxTries
                  hard.allowAny = game.config.allowAny
                  hard.disabledLetters = game.config.disabledLetters
                  hard.dailyDate = game.config.dailyDate
                  hard.dailyVersion = game.config.dailyVersion
                  hard.randomId = game.config.randomId
                  hard.wordIndex = game.config.wordIndex
                }
                setOpen(false)
              })}
            >
              <div class='active-game-meta'>
                <span>{game.config.mode}</span>
                <Show when={game.config.dailyDate}><span>{game.config.dailyDate}</span><span>v{(game.config.dailyVersion ?? LEGACY_DAILY_CHALLENGE_VERSION).toString(16)}</span></Show>
                <span>{game.config.wordLength} letters</span>
                <span>{game.config.maxTries === 1 ? '∞' : game.config.maxTries} guesses</span>
                <Show when={game.config.disabledLetters}><span>{game.config.disabledLetters} disabled</span></Show>
              </div>
              <div class='active-game-board'><For each={game.history}>{([word, mask]) => new Block(game.config.wordLength, word, mask).render()}</For></div>
            </button>}</For>
          </div>
        </Show>
      </DialogContent>
    </Dialog>
  </Show>
}
