'use strict'

import { createSignal, JSX, Show } from 'solid-js'
import { IconSettings, IconX } from '~/components/icons'
import { Popover, PopoverTrigger, PopoverContent } from '~/registry/ui/popover'
import { Slider, SliderFill, SliderLabel, SliderThumb, SliderTrack, SliderValueLabel } from '~/registry/ui/slider'

import { Switch, SwitchControl, SwitchLabel, SwitchThumb } from '~/registry/ui/switch'
import { untrack } from 'solid-js/web'
import { Button } from '~/registry/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/registry/ui/tooltip'
import { WordLength } from './words'
import { ActiveGames } from './popup_active_games'

// Props that can be changed without a re-render
export interface SettingsSoftProps {
  // when this is set to true, latest word is revealed and then skipped
  reveal: boolean
  // weather fast invalidation is enabled
  fastInvalidate: boolean
}

// Props that on change should trigger a re-render
export interface SettingsHardProps {
  // The length of the word
  wordLength: WordLength

  // Allow any word, even if not in dictionary
  allowAny: boolean

  // The max number of words that can be guessed
  maxTries: number
}

function TooltipWithContent(trigger: JSX.Element, content: JSX.Element) {
  return <Tooltip>
    <TooltipTrigger>{trigger}</TooltipTrigger>
    <TooltipContent>{content}</TooltipContent>
  </Tooltip>
}

function SwitchContent(content: JSX.Element) {
  return <>
    <SwitchControl>
      <SwitchThumb />
    </SwitchControl>

    <SwitchLabel class='settings-switch-label'>
      {content}
    </SwitchLabel>
  </>
}

export function SettingsKnobs({soft, hard, showWordLength}: {soft: SettingsSoftProps, hard: SettingsHardProps, showWordLength: boolean}) {
  return <>
    <Switch class='settings-switch' onChange={allow => hard.allowAny = allow} defaultChecked={untrack(() => hard.allowAny)}>
      {SwitchContent(TooltipWithContent('Allow Any Word', 'Allow any word to be used, even if not in the database.'))}
    </Switch>

    <Switch class='settings-switch' onChange={allow => soft.fastInvalidate = allow} defaultChecked={untrack(() => soft.fastInvalidate)}>
      {SwitchContent(TooltipWithContent('Fast Invalidate', 'Fast invalidation of incorrect input (for words that are not in db).'))}
    </Switch>

    <div class='settings-section-title'>ADVANCED</div>

    <Show when={showWordLength}>
      <Slider
        minValue={3}
        maxValue={20}
        defaultValue={untrack(() => [hard.wordLength])}
        getValueLabel={(params) => <strong class='mr-1'>{params.values}</strong> as any}
        onChange={([len]) => hard.wordLength = len as WordLength}
        class='settings-slider'
      >
        <div class='flex w-full justify-between'>
          <SliderLabel>Word length</SliderLabel>
          <SliderValueLabel />
        </div>
        <SliderTrack>
          <SliderFill />
          <SliderThumb />
        </SliderTrack>
      </Slider>
    </Show>

    <Slider
      minValue={1}
      maxValue={50}
      defaultValue={untrack(() => [hard.maxTries])}
      getValueLabel={(params) => <strong class='mr-1'>{params.values[0] === 1? 'INF': params.values}</strong> as any}
      onChange={([len]) => hard.maxTries = len}
      class='settings-slider'
    >
      <div class='flex w-full justify-between'>
        <SliderLabel>Max guesses</SliderLabel>
        <SliderValueLabel />
      </div>
      <SliderTrack>
        <SliderFill />
        <SliderThumb />
      </SliderTrack>
    </Slider>
  </>
}

export default function Settings({soft, hard, showActive, showWordLength}: {soft: SettingsSoftProps, hard: SettingsHardProps, showActive: boolean, showWordLength: boolean}) {
  const [open, setOpen] = createSignal(false)

  return <Popover open={open()} onOpenChange={setOpen}>
    <PopoverTrigger class='wordle-nav-button settings-trigger' aria-label='Settings'>
      <IconSettings class='size-5' />
    </PopoverTrigger>
    <PopoverContent class='settings-popover border-muted'>
      <button type='button' class='wordle-nav-button settings-close' onClick={() => setOpen(false)} aria-label='Close settings'>
        <IconX class='size-5 stroke-red-500' />
      </button>

      <div class='settings-body'>
        <SettingsKnobs soft={soft} hard={hard} showWordLength={showWordLength} />

        <div class='settings-actions flex flex-wrap gap-2'>
        {TooltipWithContent(
          <Button class='bg-warning text-warning-foreground hover:bg-warning-foreground hover:text-warning transition-colors duration-300' onClick={() => soft.reveal = true}>
            Reveal
          </Button>,
          'Reveals and then skips the current word.'
        )}
        <Show when={showActive}>
          <ActiveGames hard={hard} trigger={
            <Button class='bg-info text-info-foreground hover:bg-info-foreground hover:text-info transition-colors duration-300'>
              Active Games
            </Button>
          }/>
        </Show>
        </div>
      </div>
    </PopoverContent>
  </Popover>
}
