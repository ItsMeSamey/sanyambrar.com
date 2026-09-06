'use strict'

import { createMemo, createSignal, For, Show, untrack } from 'solid-js';
import { Popover, PopoverContent, PopoverTrigger } from '~/registry/ui/popover'

// Adapted to this project from Solid UI's Date Picker surface:
// https://www.solid-ui.com/docs/components/date-picker
// Solid UI intentionally ships copy/paste components. We keep the same compact
// trigger/calendar interaction while using the project's existing Popover primitive.

type View = 'day' | 'month' | 'year'

export interface WordleDatePickerProps {
  value: string
  max: string
  completedDates?: ReadonlySet<string>
  onValueChange: (value: string) => void
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function parseKey(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return undefined
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3])
  const date = new Date(year, month - 1, day, 12)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined
}

function dateKey(date: Date): string {
  return `${date.getFullYear().toString().padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function monthKey(date: Date): string {
  return `${date.getFullYear().toString().padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function atNoon(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12)
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1, 12)
}

function CalendarIcon() {
  return <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'>
    <path d='M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z'/>
    <path d='M16 3v4M8 3v4M4 11h16'/>
  </svg>
}

function Chevron(props: {direction: 'left' | 'right'}) {
  return <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'>
    <path d={props.direction === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'}/>
  </svg>
}

export function WordleDatePicker(props: WordleDatePickerProps) {
  const selected = () => parseKey(props.value) ?? parseKey(props.max) ?? atNoon(new Date())
  const maximum = () => parseKey(props.max) ?? atNoon(new Date())
  const [open, setOpen] = createSignal(false)
  const [view, setView] = createSignal<View>('day')
  const initialDate = untrack(selected)
  const [visible, setVisible] = createSignal(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1, 12))

  const formatted = createMemo(() => new Intl.DateTimeFormat(undefined, {year: 'numeric', month: 'short', day: 'numeric'}).format(selected()))
  const monthTitle = createMemo(() => new Intl.DateTimeFormat(undefined, {year: 'numeric', month: 'long'}).format(visible()))
  const yearBlockStart = createMemo(() => Math.floor(visible().getFullYear() / 12) * 12)

  const days = createMemo(() => {
    const first = new Date(visible().getFullYear(), visible().getMonth(), 1, 12)
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay(), 12)
    return Array.from({length: 42}, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index, 12)
      return {
        date,
        key: dateKey(date),
        outside: date.getMonth() !== visible().getMonth(),
        future: date > maximum(),
      }
    })
  })

  const selectDate = (date: Date) => {
    if (date > maximum()) return
    props.onValueChange(dateKey(date))
    setVisible(new Date(date.getFullYear(), date.getMonth(), 1, 12))
    setView('day')
    setOpen(false)
  }

  const openPicker = (next: boolean) => {
    if (next) {
      const current = selected()
      setVisible(new Date(current.getFullYear(), current.getMonth(), 1, 12))
      setView('day')
    }
    setOpen(next)
  }

  const changePeriod = (delta: number) => {
    if (view() === 'day') {
      const next = addMonths(visible(), delta)
      if (delta > 0 && monthKey(next) > monthKey(maximum())) return
      setVisible(next)
      return
    }
    if (view() === 'month') {
      const next = new Date(visible().getFullYear() + delta, visible().getMonth(), 1, 12)
      if (delta > 0 && next.getFullYear() > maximum().getFullYear()) return
      setVisible(next)
      return
    }
    const nextYear = visible().getFullYear() + delta * 12
    if (delta > 0 && nextYear > maximum().getFullYear()) return
    setVisible(new Date(nextYear, visible().getMonth(), 1, 12))
  }

  const title = () => view() === 'day'
    ? monthTitle()
    : view() === 'month'
      ? visible().getFullYear().toString()
      : `${yearBlockStart()}–${yearBlockStart() + 11}`

  return <Popover open={open()} onOpenChange={openPicker} placement='bottom-start' gutter={6} flip='top-start'>
    <PopoverTrigger class='wordle-date-picker-trigger' aria-label={`Choose date, selected ${formatted()}`}>
      <CalendarIcon />
      <span>{formatted()}</span>
    </PopoverTrigger>
    <PopoverContent aria-label='Choose date' class='wordle-date-picker-popover'>
      <div class='wordle-date-picker-nav'>
        <button type='button' class='wordle-date-picker-nav-button' onClick={() => changePeriod(-1)} aria-label='Previous period'><Chevron direction='left'/></button>
        <button type='button' class='wordle-date-picker-view-trigger' onClick={() => setView(view() === 'day' ? 'month' : view() === 'month' ? 'year' : 'day')}>{title()}</button>
        <button type='button' class='wordle-date-picker-nav-button' onClick={() => changePeriod(1)} aria-label='Next period'><Chevron direction='right'/></button>
      </div>

      <Show when={view() === 'day'}>
        <table class='wordle-date-picker-table' aria-label={monthTitle()}>
          <thead><tr><For each={WEEKDAYS}>{day => <th scope='col'>{day}</th>}</For></tr></thead>
          <tbody>
            <For each={Array.from({length: 6}, (_, row) => days().slice(row * 7, row * 7 + 7))}>{week =>
              <tr><For each={week}>{day => {
                const isSelected = () => sameDay(day.date, selected())
                const completed = () => props.completedDates?.has(day.key) ?? false
                return <td>
                  <button
                    type='button'
                    class='wordle-date-picker-day'
                    disabled={day.future}
                    data-selected={isSelected() ? '' : undefined}
                    data-today={sameDay(day.date, atNoon(new Date())) ? '' : undefined}
                    data-outside={day.outside ? '' : undefined}
                    data-completed={completed() ? '' : undefined}
                    aria-label={`${new Intl.DateTimeFormat(undefined, {dateStyle: 'long'}).format(day.date)}${completed() ? ', completed' : ''}`}
                    onClick={() => selectDate(day.date)}
                  >{day.date.getDate()}</button>
                </td>
              }}</For></tr>
            }</For>
          </tbody>
        </table>
      </Show>

      <Show when={view() === 'month'}>
        <div class='wordle-date-picker-grid wordle-date-picker-month-grid'>
          <For each={MONTHS}>{(month, index) => {
            const monthIndex = index()
            const disabled = () => visible().getFullYear() > maximum().getFullYear() || (visible().getFullYear() === maximum().getFullYear() && monthIndex > maximum().getMonth())
            return <button type='button' disabled={disabled()} data-selected={selected().getFullYear() === visible().getFullYear() && selected().getMonth() === monthIndex ? '' : undefined} onClick={() => { setVisible(new Date(visible().getFullYear(), monthIndex, 1, 12)); setView('day') }}>{month}</button>
          }}</For>
        </div>
      </Show>

      <Show when={view() === 'year'}>
        <div class='wordle-date-picker-grid wordle-date-picker-year-grid'>
          <For each={Array.from({length: 12}, (_, index) => yearBlockStart() + index)}>{year =>
            <button type='button' disabled={year > maximum().getFullYear()} data-selected={selected().getFullYear() === year ? '' : undefined} onClick={() => { setVisible(new Date(year, visible().getMonth(), 1, 12)); setView('month') }}>{year}</button>
          }</For>
        </div>
      </Show>

      <div class='wordle-date-picker-footer'>
        <button type='button' onClick={() => selectDate(maximum())}>Today</button>
        <span><i class='wordle-date-picker-completed-dot'/> Completed</span>
      </div>
    </PopoverContent>
  </Popover>
}
