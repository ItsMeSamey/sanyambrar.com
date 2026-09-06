'use strict'

import { createSignal, Show } from 'solid-js'
import { IconSettings } from '~/components/icons'
import { Popover, PopoverTrigger, PopoverContent } from '~/registry/ui/popover'
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

function Toggle(props: {label: string; description: string; checked: boolean; onChange: (checked: boolean) => void}) {
  return <button type='button' class='settings-switch' role='switch' aria-label={props.label}
    aria-checked={props.checked ? 'true' : 'false'} title={props.description} onClick={() => props.onChange(!props.checked)}>
    <span class='samey-switch-control' data-checked={props.checked ? '' : undefined} aria-hidden='true'><span class='samey-switch-thumb' /></span>
    <span class='settings-switch-label'>{props.label}</span>
  </button>
}

// The upstream alpha Slider does not respond to keyboard input on Solid RC.6.
// Native ranges share the same theme and keep browser keyboard/touch semantics.
function Range(props: {label: string; min: number; max: number; value: number; format?: (value: number) => string; onChange: (value: number) => void}) {
  const progress = () => (props.value - props.min) / (props.max - props.min)
  const formatted = () => props.format?.(props.value) ?? String(props.value)
  return <label class='game-settings-slider'>
    <span class='game-settings-slider-head'><span class='game-settings-slider-label'>{props.label}</span><output class='game-settings-slider-value'>{formatted()}</output></span>
    <span class='game-range-shell' style={{'--range-fill-width': `calc(${progress() * 100}% + ${16 * (1 - progress())}px)`}}>
      <span class='game-range-track' aria-hidden='true'><span class='game-range-fill' /></span>
      <input type='range' min={props.min} max={props.max} step='1' value={props.value} aria-label={props.label} aria-valuetext={formatted()}
        onInput={event => props.onChange(event.currentTarget.valueAsNumber)} />
    </span>
  </label>
}

interface SettingsControls {
  soft: SettingsSoftProps
  hard: SettingsHardProps
  showWordLength: boolean
  onHardChange: (patch: Partial<SettingsHardProps>) => void
  onSoftChange: (patch: Partial<SettingsSoftProps>) => void
}

export function SettingsKnobs(props: SettingsControls) {
  const advanced = () => props.hard.mode === 'advanced'
  const commit = <K extends keyof SettingsHardProps>(key: K, value: SettingsHardProps[K]) =>
    props.onHardChange({[key]: value} as Pick<SettingsHardProps, K>)
  return <>
    <Toggle label='Fast Invalidate' description='Marks each typed prefix as usable or impossible immediately.'
      checked={props.soft.fastInvalidate} onChange={allow => props.onSoftChange({fastInvalidate: allow})} />

    <Show when={advanced()}>
      <Toggle label='Allow Any Word' description='Allow guesses that are not in the dictionary.'
        checked={props.hard.allowAny} onChange={allow => commit('allowAny', allow)} />

      <div class='game-settings-section-title'>ADVANCED</div>

      <Show when={props.showWordLength}>
        <Range label='Word length' min={3} max={20} value={props.hard.wordLength}
          onChange={length => { if (isWordLength(length)) commit('wordLength', length) }} />
      </Show>
      <Range label='Max guesses' min={1} max={50} value={props.hard.maxTries}
        format={value => value === 1 ? 'INF' : String(value)} onChange={value => commit('maxTries', value)} />
      <Range label='Disabled letters' min={0} max={12} value={props.hard.disabledLetters}
        onChange={value => commit('disabledLetters', value)} />
    </Show>
  </>
}

export default function Settings(props: SettingsControls & {
  showActive: boolean
  onSelectActiveGame: (config: SettingsHardProps) => void
}) {
  const [open, setOpen] = createSignal(false)

  return <Popover open={open()} onOpenChange={setOpen} placement='bottom-end' gutter={6} flip='top-end'>
    <PopoverTrigger class='top-icon site-topbar-icon game-settings-trigger settings-trigger' aria-label='Settings'>
      <IconSettings class='size-5' />
    </PopoverTrigger>
    <PopoverContent class='game-settings-popover wordle-settings-popover' aria-label='Wordle settings'>
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
