'use strict'

import { batch, createSignal, For, JSX, onCleanup, onMount, Show } from 'solid-js'
import { Dialog, DialogContent, DialogTrigger } from '~/registry/ui/dialog'
import { WordLength } from './words'
import { Block } from './page'
import { SettingsHardProps } from './popup_settings'

type ActiveGame = {
  allowAny: boolean
  wordLength: WordLength
  maxTries: number
  history: [string, string][]
}

const ACTIVE_GAME_RE = /^game\.wordle\.(any\.)?(\d+)\.(\d+)$/

export function getActiveGames(): ActiveGame[] {
  const games: ActiveGame[] = []
  for (let n = 0; n < localStorage.length; n++) {
    const key = localStorage.key(n)
    if (!key) continue
    const match = ACTIVE_GAME_RE.exec(key)
    if (!match) continue

    try {
      const value = JSON.parse(localStorage.getItem(key)!)
      if (!Array.isArray(value?.history) || value.history.length <= 1) continue
      const wordLength = Number(match[2])
      const maxTries = Number(match[3])
      if (wordLength < 3 || wordLength > 20 || maxTries < 1 || maxTries > 50) continue
      games.push({
        allowAny: !!match[1],
        wordLength: wordLength as WordLength,
        maxTries,
        history: value.history.slice(0, -1),
      })
    } catch {
      // Ignore stale/corrupt game entries instead of breaking settings.
    }
  }
  return games.sort((a, b) => a.wordLength - b.wordLength || a.maxTries - b.maxTries || Number(a.allowAny) - Number(b.allowAny))
}

export function ActiveGames({hard, trigger}: {hard: SettingsHardProps, trigger: JSX.Element}): JSX.Element {
  const [open, setOpen] = createSignal(false)
  const [games, setGames] = createSignal(getActiveGames())
  const refresh = () => setGames(getActiveGames())

  onMount(() => {
    window.addEventListener('storage', refresh)
    window.addEventListener('wordle:storage-change', refresh)
  })
  onCleanup(() => {
    window.removeEventListener('storage', refresh)
    window.removeEventListener('wordle:storage-change', refresh)
  })

  return <Show when={games().length > 0}>
    <Dialog open={open()} onOpenChange={value => {
      if (value) refresh()
      setOpen(value)
    }}>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent class='active-games-dialog'>
        <Show when={open()}>
          <div class='active-games-header'>
            <strong>Active games</strong>
            <span>{games().length}</span>
          </div>
          <div class='active-games-list'>
            <For each={games()}>{game => {
              const current = () => hard.maxTries === game.maxTries && hard.wordLength === game.wordLength && hard.allowAny === game.allowAny
              return <button
                type='button'
                class='active-game-card'
                data-current={current() ? '' : undefined}
                onClick={() => batch(() => {
                  if (current()) return setOpen(false)
                  hard.maxTries = game.maxTries
                  hard.wordLength = game.wordLength
                  hard.allowAny = game.allowAny
                  setOpen(false)
                })}
              >
                <div class='active-game-meta'>
                  <span>{game.wordLength} letters</span>
                  <span>{game.maxTries === 1 ? '∞' : game.maxTries} guesses</span>
                  <Show when={game.allowAny}><span>any word</span></Show>
                </div>
                <div class='active-game-board' style={{'--word-length': game.wordLength}}>
                  <For each={game.history}>{([word, mask]) => new Block(game.wordLength, word, mask).render()}</For>
                </div>
              </button>
            }}</For>
          </div>
        </Show>
      </DialogContent>
    </Dialog>
  </Show>
}
