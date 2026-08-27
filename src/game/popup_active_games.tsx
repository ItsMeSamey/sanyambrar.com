'use strict'

import { batch, createSignal, For, JSX, onCleanup, onMount, Show } from 'solid-js'
import { Dialog, DialogContent, DialogTrigger } from '~/registry/ui/dialog'
import { Block, WordLocalStorageState } from './page'
import { SettingsHardProps } from './popup_settings'
import { getDailyChallenge, LEGACY_DAILY_CHALLENGE_VERSION, isDailyChallengeVersion } from './challenge'

interface ActiveGame {
  key: string
  config: SettingsHardProps
  history: [string, string][]
}

const LEGACY_RE = /^game\.wordle\.(any\.)?(\d+)\.(\d+)$/
const ADVANCED_RE = /^game\.wordle\.advanced\.(any\.)?(\d+)\.(\d+)\.(\d+)$/
const DAILY_RE = /^game\.wordle\.daily\.([0-9a-f]+)\.(\d{4}-\d{2}-\d{2})$/i
const LEGACY_DAILY_RE = /^game\.wordle\.daily\.(\d{4}-\d{2}-\d{2})$/

function readConfig(key: string, value: WordLocalStorageState): SettingsHardProps | undefined {
  if (value.config?.mode) return value.config.mode === 'daily'
    ? {...value.config, dailyVersion: value.config.dailyVersion ?? LEGACY_DAILY_CHALLENGE_VERSION}
    : value.config

  let match = ADVANCED_RE.exec(key)
  if (match) return {
    mode: 'advanced', allowAny: !!match[1], wordLength: Number(match[2]) as any,
    maxTries: Number(match[3]), disabledLetters: Number(match[4]),
  }

  match = DAILY_RE.exec(key)
  if (match) {
    const version = Number.parseInt(match[1], 16)
    if (isDailyChallengeVersion(version)) return getDailyChallenge(match[2], version)
  }

  match = LEGACY_DAILY_RE.exec(key)
  if (match) return getDailyChallenge(match[1], LEGACY_DAILY_CHALLENGE_VERSION)

  match = LEGACY_RE.exec(key)
  if (match) return {
    mode: 'advanced', allowAny: !!match[1], wordLength: Number(match[2]) as any,
    maxTries: Number(match[3]), disabledLetters: 0,
  }
}

export function getActiveGames(): ActiveGame[] {
  const games: ActiveGame[] = []
  for (let n = 0; n < localStorage.length; n++) {
    const key = localStorage.key(n)
    if (!key?.startsWith('game.wordle.')) continue
    try {
      const value = JSON.parse(localStorage.getItem(key)!) as WordLocalStorageState
      if (!Array.isArray(value?.history) || value.history.length <= 1) continue
      const config = readConfig(key, value)
      if (!config || config.wordLength < 3 || config.wordLength > 20 || config.maxTries < 1 || config.maxTries > 50) continue
      if (value.done !== undefined) continue
      games.push({key, config, history: value.history.slice(0, -1)})
    } catch {}
  }
  return games.sort((a, b) => a.config.mode.localeCompare(b.config.mode) || a.config.wordLength - b.config.wordLength || a.config.maxTries - b.config.maxTries)
}

export function ActiveGames({hard, trigger, onSelect}: {hard: SettingsHardProps, trigger: JSX.Element, onSelect?: (config: SettingsHardProps) => void}): JSX.Element {
  const [open, setOpen] = createSignal(false)
  const [games, setGames] = createSignal(getActiveGames())
  const refresh = () => setGames(getActiveGames())

  onMount(() => { window.addEventListener('storage', refresh); window.addEventListener('wordle:storage-change', refresh) })
  onCleanup(() => { window.removeEventListener('storage', refresh); window.removeEventListener('wordle:storage-change', refresh) })

  const current = (game: ActiveGame) => {
    const c = game.config
    return hard.mode === c.mode && hard.wordLength === c.wordLength && hard.maxTries === c.maxTries && hard.allowAny === c.allowAny &&
      hard.disabledLetters === c.disabledLetters && hard.dailyDate === c.dailyDate && hard.dailyVersion === c.dailyVersion && hard.wordIndex === c.wordIndex
  }

  return <Show when={games().length > 0}>
    <Dialog open={open()} onOpenChange={value => { if (value) refresh(); setOpen(value) }}>
      <DialogTrigger>{trigger}</DialogTrigger>
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
