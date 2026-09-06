'use strict'

import { Share as ShareIcon } from '../../ui-kit/components/lucide.tsx'
import { type Accessor, createSignal, createStore, onCleanup, snapshot, untrack } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTrigger } from '~/registry/ui/dialog'
import { SettingsKnobs, SettingsHardProps, SettingsSoftProps } from './popup_settings'
import { Button } from '~/registry/ui/button'
import { showError } from '../../utils/toast'
import { binarySearch } from './word-list'
import { challengeUrl, isWordLength } from './challenge'

export function ShareTrigger(props: {word: Accessor<string>, soft: SettingsSoftProps, hard: SettingsHardProps}): JSX.Element {
  const [open, setOpen] = createSignal(false)
  const [copyButtonText, setCopyButtonText] = createSignal<string>('Copy')
  const [soft, setSoft] = createStore(snapshot(untrack(() => props.soft)))
  const [hard, setHard] = createStore(snapshot(untrack(() => props.hard)))

  let idx: number = -1
  let copyResetTimer: ReturnType<typeof setTimeout> | undefined
  onCleanup(() => clearTimeout(copyResetTimer))

  return <Dialog open={open()} onOpenChange={setOpen}>
    <DialogTrigger type='button' class='wordle-share-trigger' aria-label='Share' title='Share' onClick={event => event.stopPropagation()}>
      <ShareIcon class='size-5 stroke-foreground' />
    </DialogTrigger>
    <DialogContent aria-label='Share Wordle challenge' class='wordle-share-dialog flex flex-col gap-2 p-4 bg-background rounded'>
      <DialogHeader class='wordle-share-header flex flex-row gap-2 items-center'>
        <span>Share</span> <span class='wordle-share-word wordle-revealed-text font-bold uppercase'>{props.word()}</span>
      </DialogHeader>

      <SettingsKnobs soft={soft} hard={hard} showWordLength={false}
        onSoftChange={patch => setSoft(draft => { Object.assign(draft, patch) })}
        onHardChange={patch => setHard(draft => { Object.assign(draft, patch) })}
      />

      <DialogFooter class='wordle-share-footer flex flex-row gap-2 items-center mt-4'>
        <Button
          class='wordle-copy-button'
          onClick={async () => {
            const wlen = props.word().length
            if (!isWordLength(wlen)) return showError(new Error('Invalid word length'))
            if (idx === -1) {
              idx = binarySearch(wlen, props.word().toLowerCase())

              if (idx === -1) {
                return showError(new Error('Word not found in the database'))
              }
            }

            const config: SettingsHardProps = {...hard, wordLength: wlen, wordIndex: idx}
            const url = challengeUrl(config, soft.fastInvalidate)
            if (!url) return showError(new Error('Could not create share URL'))
            try {
              if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url.href)
              else {
                const input = document.createElement('textarea')
                input.value = url.href
                input.style.position = 'fixed'
                input.style.opacity = '0'
                document.body.append(input)
                try {
                  input.select()
                  if (!document.execCommand('copy')) throw new Error('Copy failed')
                } finally { input.remove() }
              }
              setCopyButtonText('Copied!')
              clearTimeout(copyResetTimer)
              copyResetTimer = setTimeout(() => setCopyButtonText('Copy'), 1000)
            } catch (error) {
              showError(error instanceof Error ? error : new Error('Could not copy share URL'))
            }
          }}
        >
          {copyButtonText()}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}

