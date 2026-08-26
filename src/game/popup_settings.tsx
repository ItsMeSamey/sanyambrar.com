'use strict'

import { createSignal, JSX, Show } from 'solid-js'
import { IconSettings, IconX } from '~/components/icons'
import { Popover, PopoverTrigger, PopoverContent } from '~/registry/ui/popover'
import { Slider, SliderFill, SliderLabel, SliderThumb, SliderTrack, SliderValueLabel } from '~/registry/ui/slider'
import { Switch, SwitchControl, SwitchLabel, SwitchThumb } from '~/registry/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/registry/ui/tooltip'
import { WordLength } from './words'
import { ActiveGames } from './popup_active_games'
import type { GameMode } from './challenge'

export interface SettingsSoftProps {
  reveal: boolean
  fastInvalidate: boolean
}

export interface SettingsHardProps {
  mode: GameMode
  wordLength: WordLength
  allowAny: boolean
  maxTries: number
  disabledLetters: number
  dailyDate?: string
  randomId?: string
}

function TooltipWithContent(trigger: JSX.Element, content: JSX.Element) {
  return <Tooltip>
    <TooltipTrigger>{trigger}</TooltipTrigger>
    <TooltipContent>{content}</TooltipContent>
  </Tooltip>
}

function SwitchContent(label: string, description: string) {
  return <>
    <SwitchControl><SwitchThumb /></SwitchControl>
    <SwitchLabel class='settings-switch-label' title={description}>{label}</SwitchLabel>
  </>
}

export function SettingsKnobs({soft, hard, showWordLength}: {soft: SettingsSoftProps, hard: SettingsHardProps, showWordLength: boolean}) {
  const advanced = () => hard.mode === 'advanced'
  return <>
    <Switch class='settings-switch' onChange={allow => soft.fastInvalidate = allow} checked={soft.fastInvalidate}>
      {SwitchContent('Fast Invalidate', 'Marks each typed prefix as usable or impossible immediately.')}
    </Switch>

    <Show when={advanced()} fallback={
      <div class='wordle-settings-fixed'>
        <span>Automatic challenge</span>
        <strong>{hard.wordLength} letters / {hard.maxTries === 1 ? '∞' : hard.maxTries} guesses / {hard.disabledLetters} disabled</strong>
        <small>Daily and Random tune difficulty automatically. Use Advanced for manual controls.</small>
      </div>
    }>
      <Switch class='settings-switch' onChange={allow => hard.allowAny = allow} checked={hard.allowAny}>
        {SwitchContent('Allow Any Word', 'Allow guesses that are not in the dictionary.')}
      </Switch>

      <div class='game-settings-section-title'>ADVANCED</div>

      <Show when={showWordLength}>
        <Slider minValue={3} maxValue={20} value={[hard.wordLength]} getValueLabel={(params) => <strong class='mr-1'>{params.values}</strong> as any} onChange={([len]) => hard.wordLength = len as WordLength} class='game-settings-slider'>
          <div class='flex w-full justify-between'><SliderLabel>Word length</SliderLabel><SliderValueLabel /></div>
          <SliderTrack><SliderFill /><SliderThumb /></SliderTrack>
        </Slider>
      </Show>

      <Slider minValue={1} maxValue={50} value={[hard.maxTries]} getValueLabel={(params) => <strong class='mr-1'>{params.values[0] === 1 ? 'INF' : params.values}</strong> as any} onChange={([len]) => hard.maxTries = len} class='game-settings-slider'>
        <div class='flex w-full justify-between'><SliderLabel>Max guesses</SliderLabel><SliderValueLabel /></div>
        <SliderTrack><SliderFill /><SliderThumb /></SliderTrack>
      </Slider>

      <Slider minValue={0} maxValue={12} value={[hard.disabledLetters]} getValueLabel={(params) => <strong class='mr-1'>{params.values}</strong> as any} onChange={([count]) => hard.disabledLetters = count} class='game-settings-slider'>
        <div class='flex w-full justify-between'><SliderLabel>Disabled letters</SliderLabel><SliderValueLabel /></div>
        <SliderTrack><SliderFill /><SliderThumb /></SliderTrack>
      </Slider>
    </Show>
  </>
}

export default function Settings({soft, hard, showActive, showWordLength}: {soft: SettingsSoftProps, hard: SettingsHardProps, showActive: boolean, showWordLength: boolean}) {
  const [open, setOpen] = createSignal(false)

  return <Popover open={open()} onOpenChange={setOpen}>
    <PopoverTrigger class='wordle-nav-button game-settings-trigger settings-trigger' aria-label='Settings'>
      <IconSettings class='size-5' />
    </PopoverTrigger>
    <PopoverContent class='game-settings-popover settings-popover border-muted'>
      <button type='button' class='game-settings-close' onClick={() => setOpen(false)} aria-label='Close settings'><IconX /></button>
      <div class='game-settings-body'>
        <SettingsKnobs soft={soft} hard={hard} showWordLength={showWordLength} />
        <div class='game-settings-actions'>
          {TooltipWithContent(<button type='button' class='game-settings-action' onClick={() => soft.reveal = true}>Reveal</button>, 'Reveals and ends the current game.')}
          <Show when={showActive}>
            <ActiveGames hard={hard} trigger={<button type='button' class='game-settings-action'>Active Games</button>} />
          </Show>
        </div>
      </div>
    </PopoverContent>
  </Popover>
}
