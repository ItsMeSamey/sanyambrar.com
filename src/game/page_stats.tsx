'use strict'

import { BarChart3 } from 'lucide-solid'
import { Accessor, createMemo, createResource, createSignal, For, JSX, Match, onCleanup, onMount, Show, Switch } from 'solid-js'
import { Accordion as AccordionPrimitive } from '@kobalte/core/accordion'
import { Accordion, AccordionItem, AccordionTrigger } from '~/registry/ui/accordion'
import { Popover, PopoverContent, PopoverTrigger } from '~/registry/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/registry/ui/tooltip'
import { Block } from './page'
import { calcDiff, getDB, HistoryEntry, KindEnum, Value } from './words'
import { Page, setP } from '../utils/navigation'
import { ShareTrigger } from './page_share'
import type { SettingsHardProps, SettingsSoftProps } from './popup_settings'
import { HomeIconLink, WordleMark } from '../shared/components/Brand.tsx'

interface GameStats {
  totalGames: number
  totalWins: number
  averageGuesses: number
  dailyGames: number
  dailyWins: number
  dailyAverageGuesses: number
  words: Value[]
}

async function waitForDB() {
  for (;;) {
    const db = getDB()
    if (db) return db
    await new Promise(resolve => setTimeout(resolve, 50))
  }
}

export async function fetchStats(): Promise<GameStats> {
  const db = await waitForDB()
  let totalGames = 0
  let totalWins = 0
  let totalGuesses = 0
  let dailyGames = 0
  let dailyWins = 0
  let dailyGuesses = 0
  const words: Value[] = []

  for (let length = 3; length <= 20; length++) {
    const records = await db.transaction(`w${length}` as const, 'readonly').objectStore(`w${length}` as const).getAll() as Value[]
    for (const record of records) {
      words.push(record)
      totalGames += record.h.length
      for (const history of record.h) {
        if (history.o === 'daily') dailyGames++
        if (history.k !== KindEnum.Correct) continue
        totalWins++
        totalGuesses += history.h.length / length
        if (history.o === 'daily') { dailyWins++; dailyGuesses += history.h.length / length }
      }
    }
  }

  words.sort((a, b) => Math.max(...b.h.map(h => h.t ?? 0)) - Math.max(...a.h.map(h => h.t ?? 0)))
  return {totalGames, totalWins, averageGuesses: totalWins ? totalGuesses / totalWins : 0, dailyGames, dailyWins, dailyAverageGuesses: dailyWins ? dailyGuesses / dailyWins : 0, words}
}

export async function hasStats() {
  return (await fetchStats()).totalGames > 0
}

function entryMeta(entry: HistoryEntry) {
  const mode = entry.o ? entry.o[0].toUpperCase() + entry.o.slice(1) : 'Legacy'
  const date = entry.q ? ` / ${entry.q}` : ''
  const disabled = entry.d ? ` / ${entry.d} disabled` : ''
  return `${mode}${date}${disabled}`
}

function outcome(entry: HistoryEntry) {
  if (entry.k === KindEnum.Correct) return ['Won', 'text-success-foreground']
  if (entry.k === KindEnum.Failed) return ['Failed', 'text-error-foreground']
  return ['Revealed', 'text-blue-500']
}

function renderHistoryEntry(word: string, entry: HistoryEntry) {
  const guesses = []
  for (let i = 0; i < entry.h.length; i += word.length) guesses.push(entry.h.substring(i, i + word.length))
  return <div class='stats-guess-popover'><div class='stats-guess-board'>
    <For each={guesses}>{guess => new Block(word.length, guess, calcDiff(word, guess)).render()}</For>
  </div></div>
}

function SummaryStat({label, value}: {label: string, value: JSX.Element}) {
  return <div class='stats-summary-item'>
    <span class='stats-summary-label'>{label}</span>
    <strong class='stats-summary-value'>{value}</strong>
  </div>
}

function WordHistory({value, selected, onSelect}: {value: Value, selected: Accessor<Value | undefined>, onSelect: (value: Value) => void}) {
  if (value.h.length === 1) {
    const attempt = value.h[0]
    const [status, statusClass] = outcome(attempt)
    return <Popover>
      <PopoverTrigger class='stats-history-trigger'>
        <button type='button' class='stats-history-row' data-selected={selected() === value ? '' : undefined} onClick={() => onSelect(value)}>
          <span class='stats-word'>{value.w}</span>
          <span class='stats-row-meta'>{attempt.h.length / value.w.length} guesses / {entryMeta(attempt)}</span>
          <span class={`stats-row-status ${statusClass}`}>{status}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent class='rounded-none'>{renderHistoryEntry(value.w, attempt)}</PopoverContent>
    </Popover>
  }

  return <AccordionItem value={value.w} class='stats-history-group'>
    <AccordionTrigger class='stats-history-row' onClick={() => onSelect(value)}>
      <span class='stats-word'>{value.w}</span>
      <span class='stats-row-meta'>{value.h.length} games</span>
    </AccordionTrigger>
    <AccordionPrimitive.Content class='stats-history-attempts'>
      <For each={value.h}>{attempt => {
        const [status, statusClass] = outcome(attempt)
        return <Popover>
          <PopoverTrigger class='stats-attempt-trigger'>
            <button type='button' class='stats-attempt-row' onClick={() => onSelect(value)}>
              <span>{attempt.h.length / value.w.length} guesses / {entryMeta(attempt)}</span>
              <span class={statusClass}>{status}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent class='rounded-none'>{renderHistoryEntry(value.w, attempt)}</PopoverContent>
        </Popover>
      }}</For>
    </AccordionPrimitive.Content>
  </AccordionItem>
}

function DetailedStats({value}: {value: Value}) {
  const latest = () => value.h.reduce((best, entry) => (entry.t ?? 0) >= (best?.t ?? -1) ? entry : best, value.h[0])
  const shareSoft: SettingsSoftProps = {reveal: false, fastInvalidate: true}
  const shareHard = (): SettingsHardProps => {
    const entry = latest()
    return {
      mode: entry?.o ?? 'advanced',
      wordLength: value.w.length as SettingsHardProps['wordLength'],
      allowAny: entry?.a ?? false,
      maxTries: entry?.m ?? 6,
      disabledLetters: entry?.d ?? 0,
      dailyDate: entry?.o === 'daily' ? entry.q : undefined,
      dailyVersion: entry?.o === 'daily' ? (entry.v ?? 1) : undefined,
    }
  }
  const stats = createMemo(() => {
    let wins = 0, fails = 0, reveals = 0, winningGuesses = 0, daily = 0
    for (const history of value.h) {
      if (history.o === 'daily') daily++
      if (history.k === KindEnum.Correct) {
        wins++
        winningGuesses += history.h.length / value.w.length
      } else if (history.k === KindEnum.Failed) fails++
      else reveals++
    }
    return {wins, fails, reveals, daily, average: wins ? winningGuesses / wins : 0}
  })

  return <section class='stats-section stats-detail'>
    <div class='stats-section-heading'>
      <div>
        <span class='stats-eyebrow'>Word</span>
        <h2>{value.w}</h2>
      </div>
      <ShareTrigger word={() => value.w} soft={shareSoft} hard={shareHard()} />
    </div>
    <div class='stats-detail-grid'>
      <SummaryStat label='Played' value={value.h.length} />
      <SummaryStat label='Win rate' value={`${(stats().wins / value.h.length * 100).toFixed(1)}%`} />
      <SummaryStat label='Avg. guesses' value={stats().average ? stats().average.toFixed(2) : '–'} />
    </div>
    <div class='stats-outcomes'>
      <span><i class='stats-dot stats-dot-win' />Won <strong>{stats().wins}</strong></span>
      <span><i class='stats-dot stats-dot-fail' />Failed <strong>{stats().fails}</strong></span>
      <span><i class='stats-dot stats-dot-reveal' />Revealed <strong>{stats().reveals}</strong></span>
      <span class='stats-outcome-plain'>Daily entries <strong>{stats().daily}</strong></span>
    </div>
  </section>
}

function StatsContent({stats}: {stats: GameStats}) {
  const [selected, setSelected] = createSignal<Value | undefined>(stats.words[0])
  return <div class='stats-content'>
    <section class='stats-section'>
      <div class='stats-section-heading'><div><span class='stats-eyebrow'>All time</span><h2>Summary</h2></div></div>
      <div class='stats-summary-grid'>
        <SummaryStat label='Games' value={stats.totalGames} />
        <SummaryStat label='Wins' value={stats.totalWins} />
        <SummaryStat label='Win rate' value={`${(stats.totalWins / stats.totalGames * 100).toFixed(1)}%`} />
        <SummaryStat label='Avg. guesses' value={stats.averageGuesses.toFixed(2)} />
      </div>
    </section>

    <section class='stats-section stats-daily-section'>
      <div class='stats-section-heading'><div><span class='stats-eyebrow'>Word of the day</span><h2>Daily record</h2></div></div>
      <div class='stats-summary-grid'>
        <SummaryStat label='Daily games' value={stats.dailyGames} />
        <SummaryStat label='Daily wins' value={stats.dailyWins} />
        <SummaryStat label='Win rate' value={stats.dailyGames ? `${(stats.dailyWins / stats.dailyGames * 100).toFixed(1)}%` : '–'} />
        <SummaryStat label='Avg. guesses' value={stats.dailyWins ? stats.dailyAverageGuesses.toFixed(2) : '–'} />
      </div>
    </section>

    <div class='stats-columns'>
      <section class='stats-section stats-history'>
        <div class='stats-section-heading'><div><span class='stats-eyebrow'>History</span><h2>Played words</h2></div><span class='stats-count'>{stats.words.length}</span></div>
        <Accordion class='stats-history-list' multiple>
          <For each={stats.words}>{value => <WordHistory value={value} selected={selected} onSelect={setSelected} />}</For>
        </Accordion>
      </section>
      <Show when={selected()}>{value => <DetailedStats value={value()} />}</Show>
    </div>
  </div>
}

export default function StatsPage() {
  const [stats, {refetch}] = createResource(fetchStats)
  const refresh = () => void refetch()
  onMount(() => window.addEventListener('wordle:stats-change', refresh))
  onCleanup(() => window.removeEventListener('wordle:stats-change', refresh))

  return <main class='stats-page'>
    <nav class='wordle-subpage-nav'>
      <button type='button' class='wordle-logo-button' onClick={() => setP(Page.Wordle)} aria-label='Back to Wordle'><WordleMark class='wordle-logo'/></button>
      <HomeIconLink class='wordle-home-icon'/><span class='wordle-subpage-title'>Statistics</span><div class='wordle-nav-spacer'/>
      <button type='button' class='wordle-nav-button wordle-appearance-trigger' data-samey-appearance aria-label='Appearance' aria-expanded='false'><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><circle cx='12' cy='12' r='3'/><path d='M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12'/></svg></button>
    </nav>
    <header class='stats-page-header'><h1>Statistics</h1></header>
    <Switch>
      <Match when={stats.loading}><p class='stats-state'>Loading statistics…</p></Match>
      <Match when={stats.error}><p class='stats-state text-error-foreground'>Could not load statistics.</p></Match>
      <Match when={stats() && stats()!.totalGames > 0}><StatsContent stats={stats()!} /></Match>
      <Match when={stats() && stats()!.totalGames === 0}><p class='stats-state'>No statistics yet.</p></Match>
    </Switch>
  </main>
}

export function StatsPageTrigger(): JSX.Element {
  const [visible, setVisible] = createSignal(false)
  const refresh = () => void hasStats().then(setVisible).catch(() => setVisible(false))
  onMount(() => {
    refresh()
    window.addEventListener('wordle:stats-change', refresh)
  })
  onCleanup(() => window.removeEventListener('wordle:stats-change', refresh))

  return <Show when={visible()}>
    <Tooltip>
      <TooltipTrigger onClick={e => e.stopPropagation()}>
        <button type='button' class='wordle-nav-button' onClick={() => setP(Page.Stats)} aria-label='Statistics'>
          <BarChart3 class='size-5 stroke-foreground' />
        </button>
      </TooltipTrigger>
      <TooltipContent>Stats</TooltipContent>
    </Tooltip>
  </Show>
}
