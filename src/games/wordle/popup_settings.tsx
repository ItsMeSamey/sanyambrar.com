'use strict'

import { createEffect, createSignal, Show } from 'solid-js'
import { IconSettings } from '~/components/icons'
import { Popover, PopoverTrigger, PopoverContent } from '~/registry/ui/popover'
import { Slider, SliderFill, SliderLabel, SliderThumb, SliderTrack, SliderValueLabel } from '~/registry/ui/slider'
import { Switch, SwitchControl, SwitchLabel, SwitchThumb } from '~/registry/ui/switch'
import type { WordLength } from './word-list'
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
  dailyVersion?: number
  randomId?: string
  wordIndex?: number
}

function SwitchContent(label: string, description: string) {
  return <>
    <SwitchControl><SwitchThumb /></SwitchControl>
    <SwitchLabel class='settings-switch-label' title={description}>{label}</SwitchLabel>
  </>
}

export function SettingsKnobs({soft, hard, showWordLength, onHardChange}: {soft: SettingsSoftProps, hard: SettingsHardProps, showWordLength: boolean, onHardChange?: (patch: Partial<SettingsHardProps>) => void}) {
  const advanced = () => hard.mode === 'advanced'
  const [wordLength, setWordLength] = createSignal(hard.wordLength)
  const [maxTries, setMaxTries] = createSignal(hard.maxTries)
  const [disabledLetters, setDisabledLetters] = createSignal(hard.disabledLetters)
  createEffect(() => setWordLength(hard.wordLength))
  createEffect(() => setMaxTries(hard.maxTries))
  createEffect(() => setDisabledLetters(hard.disabledLetters))
  const commit = <K extends keyof SettingsHardProps>(key: K, value: SettingsHardProps[K]) => {
    if (onHardChange) onHardChange({[key]: value} as Pick<SettingsHardProps, K>)
    else hard[key] = value
  }
  return <>
    <Switch class='settings-switch' onChange={allow => soft.fastInvalidate = allow} checked={soft.fastInvalidate}>
      {SwitchContent('Fast Invalidate', 'Marks each typed prefix as usable or impossible immediately.')}
    </Switch>

    <Show when={advanced()}>
      <Switch class='settings-switch' onChange={allow => commit('allowAny', allow)} checked={hard.allowAny}>
        {SwitchContent('Allow Any Word', 'Allow guesses that are not in the dictionary.')}
      </Switch>

      <div class='game-settings-section-title'>ADVANCED</div>

      <Show when={showWordLength}>
        <Slider minValue={3} maxValue={20} value={[wordLength()]} getValueLabel={(params) => <strong class='mr-1'>{params.values}</strong> as any} onChange={([len]) => { const value = len as WordLength; setWordLength(value); commit('wordLength', value) }} class='game-settings-slider'>
          <div class='flex w-full justify-between'><SliderLabel>Word length</SliderLabel><SliderValueLabel /></div>
          <SliderTrack><SliderFill /><SliderThumb /></SliderTrack>
        </Slider>
      </Show>

      <Slider minValue={1} maxValue={50} value={[maxTries()]} getValueLabel={(params) => <strong class='mr-1'>{params.values[0] === 1 ? 'INF' : params.values}</strong> as any} onChange={([len]) => { setMaxTries(len); commit('maxTries', len) }} class='game-settings-slider'>
        <div class='flex w-full justify-between'><SliderLabel>Max guesses</SliderLabel><SliderValueLabel /></div>
        <SliderTrack><SliderFill /><SliderThumb /></SliderTrack>
      </Slider>

      <Slider minValue={0} maxValue={12} value={[disabledLetters()]} getValueLabel={(params) => <strong class='mr-1'>{params.values}</strong> as any} onChange={([count]) => { setDisabledLetters(count); commit('disabledLetters', count) }} class='game-settings-slider'>
        <div class='flex w-full justify-between'><SliderLabel>Disabled letters</SliderLabel><SliderValueLabel /></div>
        <SliderTrack><SliderFill /><SliderThumb /></SliderTrack>
      </Slider>
    </Show>
  </>
}

export default function Settings({soft, hard, showActive, showWordLength, onHardChange, onSelectActiveGame}: {soft: SettingsSoftProps, hard: SettingsHardProps, showActive: boolean, showWordLength: boolean, onHardChange?: (patch: Partial<SettingsHardProps>) => void, onSelectActiveGame?: (config: SettingsHardProps) => void}) {
  const [open, setOpen] = createSignal(false)

  return <Popover open={open()} onOpenChange={setOpen} placement='bottom-end' gutter={6} flip='top-end'>
    <PopoverTrigger class='top-icon site-topbar-icon game-settings-trigger settings-trigger' aria-label='Settings'>
      <IconSettings class='size-5' />
    </PopoverTrigger>
    <PopoverContent class='game-settings-popover wordle-settings-popover'>
      <div class='game-settings-body'>
        <SettingsKnobs soft={soft} hard={hard} showWordLength={showWordLength} onHardChange={onHardChange} />
        <div class='game-settings-actions'>
          <button type='button' class='game-settings-action' onClick={() => soft.reveal = true}>Reveal</button>
          <Show when={showActive}>
            <ActiveGames hard={hard} onSelect={onSelectActiveGame} />
          </Show>
        </div>
      </div>
    </PopoverContent>
  </Popover>
}
