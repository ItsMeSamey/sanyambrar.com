'use strict'

import { createSignal, JSX, Show } from 'solid-js'
import { IconSettings, IconX } from '~/components/icons'
import { Popover, PopoverTrigger, PopoverContent } from '~/registry/ui/popover'
import { Slider, SliderFill, SliderLabel, SliderThumb, SliderTrack, SliderValueLabel } from '~/registry/ui/slider'

import ModeToggleGroup from '../components/mode_toggle_group'
import { Switch, SwitchControl, SwitchLabel, SwitchThumb } from '~/registry/ui/switch'
import { untrack } from 'solid-js/web'
import { Button } from '~/registry/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/registry/ui/tooltip'
import { Page, setP } from '../utils/navigation'
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

    <SwitchLabel class='ml-auto text-md'>
      {content}
    </SwitchLabel>
  </>
}

export default function Settings({soft, hard}: {soft: SettingsSoftProps, hard: SettingsHardProps}): JSX.Element {
  const [open, setOpen] = createSignal(false)
  const [activeGames, setActiveGames] = createSignal(false)

  const emptydiv = <div class='w-full -mt-1 mb-1'/>

  function buttonWithIcon(icon: JSX.Element) {
    return <div
      class='p-2 cursor-pointer hover:bg-muted/50 transition-all duration-300 rounded active:bg-muted-foreground/40 motion-rotate-in-45'
      onClick={() => setOpen(x => !x)}
    >
      {icon}
    </div>
  }

  return <Popover anchorRef={() => emptydiv as any} open={open()} onOpenChange={setOpen}>
    <PopoverTrigger>
      {emptydiv}
      <Show when={!open()}>
        <Tooltip>
          <TooltipTrigger onClick={e => e.stopPropagation()} class='motion-preset-slide-up-right'>
            {buttonWithIcon(<IconSettings class='size-5' />)}
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>
      </Show>
    </PopoverTrigger>
    <PopoverContent class='border-muted absolute overflow-visible motion-preset-slide-down-left space-y-5'>
      <Show when={open()}>
        <div class='flex flex-row items-end w-full h-full'>
          <ModeToggleGroup class='border border-muted rounded-lg' />
          <div class='w-full' />
          <Tooltip>
            <TooltipTrigger onClick={e => e.stopPropagation()} class='motion-preset-slide-down-left motion-delay-75 bg-warning/50 rounded'>
              {buttonWithIcon(<IconX class='size-5 stroke-red-500' />)}
            </TooltipTrigger>
            <TooltipContent>Close Settings</TooltipContent>
          </Tooltip>
        </div>
      </Show>

      <Switch class='flex items-center space-x-2' onChange={allow => hard.allowAny = allow} defaultChecked={untrack(() => hard.allowAny)}>
        {SwitchContent(TooltipWithContent('Allow Any Word', 'Allow any word to be used, even if not in the database.'))}
      </Switch>

      <Switch class='flex items-center space-x-2' onChange={allow => soft.fastInvalidate = allow} defaultChecked={untrack(() => soft.fastInvalidate)}>
        {SwitchContent(TooltipWithContent('Fast Invalidate', 'Fast invalidation of incorrect input (for words that are not in db).'))}
      </Switch>

      <div class='font-bold text-center text-1xl mx-auto w-full text-muted-foreground mb-2 mt-1'>ADVANCED</div>

      <Slider
        minValue={3}
        maxValue={20}
        defaultValue={untrack(() => [hard.wordLength])}
        getValueLabel={(params) => <strong class='mr-1'>{params.values}</strong> as any}
        onChange={([len]) => hard.wordLength = len as WordLength}
        class='space-y-3 '
      >
        <div class='flex w-full justify-between'>
          <SliderLabel>Word count</SliderLabel>
          <SliderValueLabel />
        </div>
        <SliderTrack>
          <SliderFill />
          <SliderThumb />
        </SliderTrack>
      </Slider>

      <Slider
        minValue={1}
        maxValue={50}
        defaultValue={untrack(() => [hard.maxTries])}
        getValueLabel={(params) => <strong class='mr-1'>{params.values[0] === 1? 'INF': params.values}</strong> as any}
        onChange={([len]) => hard.maxTries = len as WordLength}
        class='space-y-3 '
      >
        <div class='flex w-full justify-between'>
          <SliderLabel>Max Words</SliderLabel>
          <SliderValueLabel />
        </div>
        <SliderTrack>
          <SliderFill />
          <SliderThumb />
        </SliderTrack>
      </Slider>

      <div class='h-[1px]' />

      <div class='flex flex-row gap-2'>
        {TooltipWithContent(
          <Button class='bg-warning text-warning-foreground hover:bg-warning-foreground hover:text-warning transition-colors duration-300' onClick={() => soft.reveal = true}>
            Reveal
          </Button>,
          'Reveals and then skips the current word.'
        )}
        <ActiveGames hard={hard} trigger={
          <Button class='bg-info text-info-foreground hover:bg-info-foreground hover:text-info transition-colors duration-300'>
            Active Games
          </Button>
        }/>
      </div>
    </PopoverContent>
  </Popover>
}

