'use strict'

import { ShareIcon } from 'lucide-solid';
import { Accessor, createSignal, JSX } from 'solid-js'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/registry/ui/tooltip'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTrigger } from '~/registry/ui/dialog';
import Settings, { SettingsKnobs } from './popup_settings';
import { Button } from '~/registry/ui/button';
import { createMutable, unwrap } from 'solid-js/store';
import { SettingsHardProps, SettingsSoftProps } from './popup_settings';
import { WORDS } from './words/words';
import bsearch from 'binary-search-bounds';
import { Page, setP, setPageError } from '../utils/navigation';
import { showError } from '../utils/toast';
import { LocalstorageStore, UrlSearchStore } from '../utils/store';
import { WordLength } from './words';
import { WordleModel, WordLocalStorageState } from './page';
import { IconHome } from '~/components/icons';

export default function SharePage() {
  const valueStore = new UrlSearchStore('v', '')
  const value = valueStore.get()
  if (!value) {
    setPageError(new Error('No value provided'))
    return
  }

  const [flags, ...rest] = value.split(',')
  const fastInvalidate = flags.charAt(0) === 't'
  const allowAny = flags.charAt(1) === 't'
  const [idx, wordLength, maxTries] = rest.slice(0, 3).map(s => parseInt(s, 36))

  if (wordLength < 3 || wordLength > 20 || maxTries < 1 || maxTries > 50) {
    setPageError(new Error('Invalid value provided'))
    return
  }

  const soft: SettingsSoftProps = createMutable({
    reveal: false,
    fastInvalidate,
  })
  const hard: SettingsHardProps = createMutable({
    wordLength: wordLength as WordLength,
    allowAny,
    maxTries,
  })

  const all = WORDS['w' + wordLength]
  if (idx < 0 || idx >= all.length) {
    setPageError(new Error('Invalid word index'))
    return
  }
  const word = all[idx]

  let isFirst = true
  const stateStore = new LocalstorageStore<WordLocalStorageState>(
    'none',
    { word, history: [['', '']]},
    () => {throw new Error('Cannot Be Called')},
    (state: WordLocalStorageState) => {
      if (isFirst) {
        isFirst = false
        return undefined
      }
      stateStore.current_value!.word = word
      stateStore.current_value!.history = state.history
      return undefined
    }
  )

  return <div class='mx-auto p-4 h-full w-full min-md:container'>
    <nav class='flex flex-row p-2 w-full absolute items-end top-0 left-0'>
      <div>
        <div class='-mt-1 mb-1' />
        <div
          class='absolute top-2 left-2 p-2 cursor-pointer hover:bg-muted/50 transition-all duration-300 rounded active:bg-muted-foreground/40 motion-rotate-in-45'
          onClick={() => {
            setP(Page.Wordle)
            valueStore.set(undefined)
          }}
        >
          <IconHome class='size-5' />
        </div>
      </div>
      <div class='w-full' />
      <Settings soft={soft} hard={hard} showActive={false} showWordLength={false} />
    </nav>
    {new WordleModel(soft, hard, stateStore).render()}
  </div>
}

export function ShareTrigger(props: {word: Accessor<string>, soft: SettingsSoftProps, hard: SettingsHardProps}): JSX.Element {
  const [open, setOpen] = createSignal(false)
  const soft: SettingsSoftProps = createMutable(unwrap(props.soft))
  const hard: SettingsHardProps = createMutable(unwrap(props.hard))

  return <Dialog open={open()} onOpenChange={setOpen}>
    <DialogTrigger>
      <Tooltip>
      <TooltipTrigger onClick={e => e.stopPropagation()} class='motion-preset-slide-up-right'>
        <div
          class='p-2 cursor-pointer hover:bg-muted/50 transition-all duration-300 rounded active:bg-muted-foreground/40 motion-rotate-in-45'
          onClick={() => setOpen(true)}
        >
          <ShareIcon class='size-5 stroke-foreground' />
        </div>
      </TooltipTrigger>
      <TooltipContent>Share</TooltipContent>
    </Tooltip>
    </DialogTrigger>
    <DialogContent class='flex flex-col gap-2 p-4 bg-background-muted/50 rounded-none'>
      <DialogHeader class='flex flex-row gap-2 items-center'>
        {props.word()}
      </DialogHeader>

      <SettingsKnobs soft={soft} hard={hard} showWordLength={false} />

      <DialogFooter class='flex flex-row gap-2 items-center'>
        <Button
          class='bg-success text-success-foreground hover:bg-success-foreground hover:text-success transition-colors duration-300'
          onClick={() => {
            const idx: number = bsearch.eq(WORDS['w' + hard.wordLength], props.word(), (a, b) => {
              if (a === b) return 0
              return a < b? -1: 1
            })
            if (idx === -1) {
              return showError(new Error('Word not found in the database'))
            }
            const btos = (b: boolean) => (b? 't': 'f')
            const serialized = `${btos(soft.fastInvalidate)}${btos(hard.allowAny)},${idx.toString(36)},${hard.wordLength.toString(36)},${hard.maxTries.toString(16)}`
            navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?p=${Page.Share}&v=${serialized}`)
          }}
        >
          Copy
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}

