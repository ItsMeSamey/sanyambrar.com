'use strict'

import { ChartNoAxesColumn as BarChart3 } from '../../ui-kit/components/lucide.tsx'
import { type Accessor, createMemo, createSignal, Errored, For, Loading, onSettled, refresh, Show } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/registry/ui/accordion'
import { Popover, PopoverContent, PopoverTrigger } from '~/registry/ui/popover'
import { Block } from './page'
import { calcDiff, getReadyDB, HistoryEntry, KindEnum, Value } from './words'
import { Page, setP } from '../../utils/navigation'
import { ShareTrigger } from './page_share'
import type { SettingsHardProps, SettingsSoftProps } from './popup_settings'
import { GameTopBarActions, TopBar, TopBarIconButton } from '../../shared/components/TopBar.tsx'
import { isWordLength } from './challenge'
import { WordleBackButton } from './WordleBackButton'

interface GameStats {
  totalGames: number
  totalWins: number
  averageGuesses: number
  dailyGames: number
  dailyWins: number
  dailyAverageGuesses: number
  words: Value[]
}


export async function fetchStats(): Promise<GameStats> {
  const db = await getReadyDB()
  let totalGames = 0
  let totalWins = 0
  let totalGuesses = 0
  let dailyGames = 0
  let dailyWins = 0
  let dailyGuesses = 0
  const words: Value[] = []
  const latestByWord = new Map<Value, number>()

  const recordsByLength = await Promise.all(Array.from({length: 18}, (_, index) => {
    const length = index + 3
    if (!isWordLength(length)) throw new RangeError('Invalid statistics word length')
    return db.getAll(`w${length}`)
  }))

  for (const records of recordsByLength) {
    for (const record of records) {
      words.push(record)
      totalGames += record.h.length
      let latest = 0
      for (const history of record.h) {
        latest = Math.max(latest, history.t ?? 0)
        if (history.o === 'daily') dailyGames++
        if (history.k !== KindEnum.Correct) continue
        totalWins++
        totalGuesses += history.h.length / record.w.length
        if (history.o === 'daily') { dailyWins++; dailyGuesses += history.h.length / record.w.length }
      }
      latestByWord.set(record, latest)
    }
  }

  words.sort((a, b) => (latestByWord.get(b) ?? 0) - (latestByWord.get(a) ?? 0))
  return {totalGames, totalWins, averageGuesses: totalWins ? totalGuesses / totalWins : 0, dailyGames, dailyWins, dailyAverageGuesses: dailyWins ? dailyGuesses / dailyWins : 0, words}
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
  return ['Revealed', 'wordle-revealed-text']
}

function renderHistoryEntry(word: string, entry: HistoryEntry) {
  const guesses = []
  for (let i = 0; i < entry.h.length; i += word.length) guesses.push(entry.h.substring(i, i + word.length))
  return <div class='stats-guess-popover'><div class='stats-guess-board'>
    <For each={guesses}>{guess => <Block wordLength={word.length} word={guess} mask={calcDiff(word, guess)} />}</For>
  </div></div>
}

function SummaryStat(props: {label: string, value: JSX.Element}) {
  return <div class='stats-summary-item'>
    <span class='stats-summary-label'>{props.label}</span>
    <strong class='stats-summary-value'>{props.value}</strong>
  </div>
}

function WordHistory({value, selected, onSelect}: {value: Value, selected: Accessor<Value | undefined>, onSelect: (value: Value) => void}) {
  if (value.h.length === 1) {
    const attempt = value.h[0]
    const [status, statusClass] = outcome(attempt)
    return <Popover>
      <PopoverTrigger class='stats-history-trigger stats-history-row' data-selected={selected() === value ? '' : undefined} onClick={() => onSelect(value)}>
        <span class='stats-word'>{value.w}</span>
        <span class='stats-row-meta'>{attempt.h.length / value.w.length} guesses / {entryMeta(attempt)}</span>
        <span class={`stats-row-status ${statusClass}`}>{status}</span>
      </PopoverTrigger>
      <PopoverContent class='rounded-none'>{renderHistoryEntry(value.w, attempt)}</PopoverContent>
    </Popover>
  }

  return <AccordionItem value={value.w} class='stats-history-group'>
    <AccordionTrigger class='stats-history-row' onClick={() => onSelect(value)}>
      <span class='stats-word'>{value.w}</span>
      <span class='stats-row-meta'>{value.h.length} games</span>
    </AccordionTrigger>
    <AccordionContent class='stats-history-attempts'>
      <For each={value.h}>{attempt => {
        const [status, statusClass] = outcome(attempt)
        return <Popover>
          <PopoverTrigger class='stats-attempt-trigger stats-attempt-row' onClick={() => onSelect(value)}>
            <span>{attempt.h.length / value.w.length} guesses / {entryMeta(attempt)}</span>
            <span class={statusClass}>{status}</span>
          </PopoverTrigger>
          <PopoverContent class='rounded-none'>{renderHistoryEntry(value.w, attempt)}</PopoverContent>
        </Popover>
      }}</For>
    </AccordionContent>
  </AccordionItem>
}

function DetailedStats({value}: {value: Value}) {
  const latest = () => value.h.reduce((best, entry) => (entry.t ?? 0) >= (best?.t ?? -1) ? entry : best, value.h[0])
  const shareSoft: SettingsSoftProps = {reveal: false, fastInvalidate: true}
  const shareHard = (): SettingsHardProps => {
    const entry = latest()
    const wordLength = value.w.length
    if (!isWordLength(wordLength)) throw new Error('Invalid word length in statistics')
    return {
      mode: entry?.o ?? 'advanced',
      wordLength,
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
      <span><b class='stats-outcome-key stats-outcome-win'>WON</b><span>Won</span><strong>{stats().wins}</strong></span>
      <span><b class='stats-outcome-key stats-outcome-fail'>FAIL</b><span>Failed</span><strong>{stats().fails}</strong></span>
      <span><b class='stats-outcome-key stats-outcome-reveal'>SHOW</b><span>Revealed</span><strong>{stats().reveals}</strong></span>
      <span class='stats-outcome-plain'>Daily entries <strong>{stats().daily}</strong></span>
    </div>
  </section>
}

function StatsContent(props: {stats: GameStats}) {
  const [selected, setSelected] = createSignal<Value | undefined>(previous => {
    const words = props.stats.words
    return previous && words.includes(previous) ? previous : words[0]
  })
  return <div class='stats-content'>
    <section class='stats-section'>
      <div class='stats-section-heading'><div><span class='stats-eyebrow'>All time</span><h2>Summary</h2></div></div>
      <div class='stats-summary-grid'>
        <SummaryStat label='Games' value={props.stats.totalGames} />
        <SummaryStat label='Wins' value={props.stats.totalWins} />
        <SummaryStat label='Win rate' value={`${(props.stats.totalWins / props.stats.totalGames * 100).toFixed(1)}%`} />
        <SummaryStat label='Avg. guesses' value={props.stats.averageGuesses.toFixed(2)} />
      </div>
    </section>

    <section class='stats-section'>
      <div class='stats-section-heading'><div><span class='stats-eyebrow'>Word of the day</span><h2>Daily record</h2></div></div>
      <div class='stats-summary-grid'>
        <SummaryStat label='Daily games' value={props.stats.dailyGames} />
        <SummaryStat label='Daily wins' value={props.stats.dailyWins} />
        <SummaryStat label='Win rate' value={props.stats.dailyGames ? `${(props.stats.dailyWins / props.stats.dailyGames * 100).toFixed(1)}%` : '–'} />
        <SummaryStat label='Avg. guesses' value={props.stats.dailyWins ? props.stats.dailyAverageGuesses.toFixed(2) : '–'} />
      </div>
    </section>

    <div class='stats-columns'>
      <section class='stats-section stats-history'>
        <div class='stats-section-heading'><div><span class='stats-eyebrow'>History</span><h2>Played words</h2></div><span class='stats-count'>{props.stats.words.length}</span></div>
        <Accordion class='stats-history-list' multiple>
          <For each={props.stats.words}>{value => <WordHistory value={value} selected={selected} onSelect={setSelected} />}</For>
        </Accordion>
      </section>
      <Show when={selected()} keyed>{value => <DetailedStats value={value} />}</Show>
    </div>
  </div>
}

export default function StatsPage() {
  const stats = createMemo(fetchStats)
  const reload = () => { refresh(stats) }
  onSettled(() => {
    window.addEventListener('wordle:stats-change', reload)
    return () => window.removeEventListener('wordle:stats-change', reload)
  })

  return <main class='stats-page'>
    <TopBar start={<WordleBackButton onClick={() => setP(Page.Wordle)}/>} nav={<GameTopBarActions ariaLabel='Wordle'><StatsPageTrigger /></GameTopBarActions>}/>
    <header class='stats-page-header'><h1>Statistics</h1></header>
    <Errored fallback={(_error, retry) => <p class='stats-state text-error-foreground' role='alert'>
      Could not load statistics. <button type='button' onClick={() => { reload(); retry() }}>Retry</button>
    </p>}>
      <Loading fallback={<p class='stats-state' role='status'>Loading statistics…</p>}>
        <Show when={stats().totalGames > 0} fallback={<p class='stats-state'>No statistics yet.</p>}>
          <StatsContent stats={stats()} />
        </Show>
      </Loading>
    </Errored>
  </main>
}

export function StatsPageTrigger(): JSX.Element {
  return <TopBarIconButton label='Statistics' onClick={e => { e.stopPropagation(); setP(Page.Stats) }}>
    <BarChart3 aria-hidden='true' />
  </TopBarIconButton>
}
