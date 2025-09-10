'use strict'

import { batch, createSignal, For, JSX, Show } from 'solid-js'
import { Dialog, DialogContent, DialogTrigger } from '~/registry/ui/dialog'
import { WordLength } from './words'
import { Block } from './page'
import { SettingsHardProps } from './popup_settings'

export function ActiveGames({hard, trigger}: {hard: SettingsHardProps, trigger: JSX.Element}): JSX.Element {
  const [open, setOpen] = createSignal(false)

  return <Dialog open={open()} onOpenChange={setOpen}>
    <DialogTrigger>
      {trigger}
    </DialogTrigger>
    <DialogContent class='flex flex-col w-max px-1 pb-1 max-w-[95vw] max-h-[95dvh]'>
      {/* <DialogHeader class='text-center font-bold mx-4 mt-[-0.75rem]'>Active Games: Click to Switch</DialogHeader> */}
      <Show when={open()}>
        <div class='justify-items-center w-max grid grid-cols-1 gap-1 overflow-y-auto scrollbar-thin scrollbar-track-muted/50 scrollbar-thumb-muted-foreground/30'>
          <For each={Array.from({length: 1 + 50 - 1}).fill(0).map((_, i) => i + 1)}>
            {i => <For each={Array.from({length: 1 + 20 - 3}).fill(0).map((_, j) => j + 3)}>
              {j => <For each={Array.from({length: 2}).fill(0).map((_, k) => k)}>
                {k => {
                  const val = localStorage.getItem(`game.wordle.${k? 'any.': ''}${j}.${i}`)
                  if (!val) return
                  const jsonVal = JSON.parse(val)
                  if (jsonVal?.history?.length <= 1) return;
                  const history = jsonVal.history.slice(0, -1)
                  {/* if (!jsonVal?.history) return; */}
                  {/* const history = jsonVal.history */}
                  return <div
                    class='border border-muted rounded-lg p-2 text-center w-fit'
                    onClick={() => batch(() => {
                      if (hard.maxTries === i && hard.wordLength === j && hard.allowAny === (k === 1)) return
                      hard.maxTries = i
                      hard.wordLength = j as WordLength
                      hard.allowAny = k === 1
                      setOpen(false)
                    })}
                  >
                    <span class={'font-bold text-xl ' +
                      ((hard.maxTries === i && hard.wordLength === j && hard.allowAny === (k === 1))? 'text-success-foreground': 'text-muted-foreground')}
                    >
                      {`${k? 'Any Word, ': ''}${j} Chars, ${i === 1? 'Inf': i} Guesses Allowed`}
                    </span>
                    <For each={history}>
                      {([word, mask]) => new Block(j, word, mask).render()}
                    </For>
                  </div>
                }}
              </For>}
            </For>}
          </For>
        </div>
      </Show>
    </DialogContent>
  </Dialog>
}

