'use strict'

import { createSignal, Show } from 'solid-js';
import { IconSettings } from '~/components/icons'
import { Popover, PopoverTrigger, PopoverContent } from '~/registry/ui/popover'
import { Switch, SwitchControl, SwitchInput, SwitchLabel, SwitchThumb } from '~/registry/ui/switch'
import type { WordLength } from './word-list'
import { ActiveGames } from './popup_active_games'
import { isWordLength, type GameMode } from './challenge'

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
    <SwitchInput />
    <SwitchControl><SwitchThumb /></SwitchControl>
    <SwitchLabel class='settings-switch-label' title={description}>{label}</SwitchLabel>
  </>
}

type SettingsControlsProps = {
  soft: SettingsSoftProps
  hard: SettingsHardProps
  showWordLength: boolean
  onHardChange: (patch: Partial<SettingsHardProps>) => void
  onSoftChange: (patch: Partial<SettingsSoftProps>) => void
}

function SettingRange(props: {label: string, min: number, max: number, value: number, valueText?: string, onChange: (value: number) => void}) {
  const fill = () => Math.max(0, Math.min(1, (props.value - props.min) / (props.max - props.min)))
  return <label class='game-settings-slider' style={{'--range-fill-width': `calc(${fill() * 100}% + ${8 - fill() * 16}px)`}}>
    <span class='game-settings-slider-head'><span>{props.label}</span><output>{props.valueText ?? props.value}</output></span>
    <span class='game-range-shell'>
      <span class='game-range-track' aria-hidden='true'><span class='game-range-fill' /></span>
      <input type='range' min={props.min} max={props.max} step={1} value={props.value} aria-label={props.label} aria-valuetext={props.valueText} onInput={event => props.onChange(event.currentTarget.valueAsNumber)} />
    </span>
  </label>
}

export function SettingsKnobs(props: SettingsControlsProps) {
  return <>
    <Switch class='settings-switch' onChange={fastInvalidate => props.onSoftChange({fastInvalidate})} checked={props.soft.fastInvalidate}>
      {SwitchContent('Fast Invalidate', 'Marks each typed prefix as usable or impossible immediately.')}
    </Switch>
    <Show when={props.hard.mode === 'advanced'}>
      <Switch class='settings-switch' onChange={allowAny => props.onHardChange({allowAny})} checked={props.hard.allowAny}>
        {SwitchContent('Allow Any Word', 'Allow guesses that are not in the dictionary.')}
      </Switch>
      <div class='game-settings-section-title'>ADVANCED</div>
      <Show when={props.showWordLength}>
        <SettingRange label='Word length' min={3} max={20} value={props.hard.wordLength} onChange={wordLength => { if (isWordLength(wordLength)) props.onHardChange({wordLength}) }} />
      </Show>
      <SettingRange label='Max guesses' min={1} max={50} value={props.hard.maxTries} valueText={props.hard.maxTries === 1 ? 'Unlimited' : undefined} onChange={maxTries => props.onHardChange({maxTries})} />
      <SettingRange label='Disabled letters' min={0} max={12} value={props.hard.disabledLetters} onChange={disabledLetters => props.onHardChange({disabledLetters})} />
    </Show>
  </>
}

export default function Settings(props: SettingsControlsProps & {showActive: boolean, onSelectActiveGame: (config: SettingsHardProps) => void}) {
  const [open, setOpen] = createSignal(false)
  return <Popover open={open()} onOpenChange={setOpen} placement='bottom-end' gutter={6} flip='top-end'>
    <PopoverTrigger class='top-icon site-topbar-icon game-settings-trigger settings-trigger' aria-label='Settings'>
      <IconSettings class='size-5' />
    </PopoverTrigger>
    <PopoverContent aria-label='Game settings' class='game-settings-popover wordle-settings-popover'>
      <div class='game-settings-body'>
        <SettingsKnobs {...props} />
        <div class='game-settings-actions'>
          <button type='button' class='game-settings-action' onClick={() => { setOpen(false); props.onSoftChange({reveal: true}) }}>Reveal</button>
          <Show when={props.showActive}>
            <ActiveGames hard={props.hard} onSelect={props.onSelectActiveGame} />
          </Show>
        </div>
      </div>
    </PopoverContent>
  </Popover>
}
