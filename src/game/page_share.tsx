'use strict'

import ShareIcon from 'lucide-solid/icons/share'
import { Accessor, createSignal, JSX } from 'solid-js'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/registry/ui/tooltip'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTrigger } from '~/registry/ui/dialog'
import { SettingsKnobs, SettingsHardProps, SettingsSoftProps } from './popup_settings'
import { Button } from '~/registry/ui/button'
import { createMutable, unwrap } from 'solid-js/store'
import { WORDS } from './words/words'
import { showError } from '../utils/toast'
import { WordLength, binarySearch } from './words'
import { challengeUrl } from './challenge'

export function ShareTrigger(props: {word: Accessor<string>, soft: SettingsSoftProps, hard: SettingsHardProps}): JSX.Element {
  const [open, setOpen] = createSignal(false)
  const [copyButtonText, setCopyButtonText] = createSignal<string>('Copy')
  const soft: SettingsSoftProps = createMutable(unwrap(props.soft))
  const hard: SettingsHardProps = createMutable(unwrap(props.hard))

  let idx: number = -1

  return <Dialog open={open()} onOpenChange={setOpen}>
    <DialogTrigger>
      <Tooltip>
      <TooltipTrigger onClick={e => { e.stopPropagation(); setOpen(true) }} class='wordle-share-trigger'>
        <ShareIcon class='size-5 stroke-foreground' />
      </TooltipTrigger>
      <TooltipContent>Share</TooltipContent>
    </Tooltip>
    </DialogTrigger>
    <DialogContent class='wordle-share-dialog flex flex-col gap-2 p-4 bg-background rounded'>
      <DialogHeader class='wordle-share-header flex flex-row gap-2 items-center'>
        <span>Share</span> <span class='wordle-share-word text-blue-500 font-bold uppercase'>{props.word()}</span>
      </DialogHeader>

      <SettingsKnobs soft={soft} hard={hard} showWordLength={false} />

      <DialogFooter class='wordle-share-footer flex flex-row gap-2 items-center mt-4'>
        <Button
          class='bg-success text-success-foreground hover:bg-success-foreground hover:text-success duration-200 active:scale-90 transition-all'
          onClick={async () => {
            const wlen = props.word().length
            if (idx === -1) {
              idx = binarySearch(WORDS['w' + wlen], props.word().toLowerCase())

              if (idx === -1) {
                return showError(new Error('Word not found in the database'))
              }
            }

            const config: SettingsHardProps = {...hard, wordLength: wlen as WordLength, wordIndex: idx}
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
                input.select()
                if (!document.execCommand('copy')) throw new Error('Copy failed')
                input.remove()
              }
              setCopyButtonText('Copied!')
              setTimeout(() => setCopyButtonText('Copy'), 1000)
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

