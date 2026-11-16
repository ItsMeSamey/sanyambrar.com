'use strict'

import { Share as ShareIcon } from '../../shared/components/Icons.tsx';
import { Accessor, createSignal, createStore, onCleanup, snapshot, untrack } from 'solid-js';
import { type JSX } from '@solidjs/web';
import { Dialog, DialogContent, DialogTrigger } from '../../shared/components/Dialog.tsx'
import { SettingsKnobs, SettingsHardProps, SettingsSoftProps } from './popup_settings'
import { Button } from '../../shared/components/Button.tsx'
import { showError } from '../../shared/components/Toast.tsx'
import { writeClipboardText } from '../../shared/clipboard.ts'
import { binarySearch } from './word-list'
import { challengeUrl, isWordLength } from './challenge'

export function ShareTrigger(props: {word: Accessor<string>, soft: SettingsSoftProps, hard: SettingsHardProps}): JSX.Element {
  const [open, setOpen] = createSignal(false)
  const [copyButtonText, setCopyButtonText] = createSignal<string>('Copy')
  const [soft, setSoft] = createStore(untrack(() => snapshot(props.soft)))
  const [hard, setHard] = createStore(untrack(() => snapshot(props.hard)))

  let copyResetTimer: ReturnType<typeof setTimeout> | undefined
  let copyAttempt = 0
  onCleanup(() => { ++copyAttempt; clearTimeout(copyResetTimer) })

  function changeOpen(next: boolean) {
    if (!next) { ++copyAttempt; clearTimeout(copyResetTimer); setCopyButtonText('Copy') }
    setOpen(next)
  }

  return <Dialog open={open()} onOpenChange={changeOpen}>
      <DialogTrigger title='Share' type='button' class='wordle-share-trigger' aria-label='Share' onClick={e => e.stopPropagation()}>
        <ShareIcon class='size-5 stroke-foreground' />
      </DialogTrigger>
    <DialogContent aria-label='Share challenge' class='wordle-share-dialog flex flex-col gap-2 p-4 bg-background rounded'>
      <div class='wordle-share-header flex flex-row gap-2 items-center'>
        <span>Share</span> <span class='wordle-share-word wordle-revealed-text font-bold uppercase'>{props.word()}</span>
      </div>

      <SettingsKnobs soft={soft} hard={hard} showWordLength={false} onSoftChange={patch => setSoft(draft => { Object.assign(draft, patch) })} onHardChange={patch => setHard(draft => { Object.assign(draft, patch) })} />

      <div class='wordle-share-footer flex flex-row gap-2 items-center mt-4'>
        <Button
          class='wordle-copy-button'
          aria-live='polite'
          aria-atomic='true'
          onClick={async () => {
            const attempt = ++copyAttempt
            clearTimeout(copyResetTimer)
            setCopyButtonText('Copying...')
            try {
              const wlen = props.word().length
              if (!isWordLength(wlen)) throw new Error('Invalid word length')
              const idx = binarySearch(wlen, props.word().toLowerCase())
              if (idx === -1) throw new Error('Word not found in the database')

              const config: SettingsHardProps = {...hard, wordLength: wlen, wordIndex: idx}
              const url = challengeUrl(config, soft.fastInvalidate)
              if (!url) throw new Error('Could not create share URL')
              if (!await writeClipboardText(url.href)) throw new Error('Copy failed')
              if (attempt !== copyAttempt) return
              setCopyButtonText('Copied!')
              copyResetTimer = setTimeout(() => { if (attempt === copyAttempt) setCopyButtonText('Copy') }, 1000)
            } catch (error) {
              if (attempt !== copyAttempt) return
              setCopyButtonText('Copy failed')
              showError(error instanceof Error ? error : new Error('Could not copy share URL'))
            }
          }}
        >
          {copyButtonText()}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
}

