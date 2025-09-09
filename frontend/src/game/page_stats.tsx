'use strict'

import { Accessor, createMemo, createResource, createSignal, For, JSX, Match, Setter, Show, Switch } from 'solid-js'
import { getDB, HistoryEntry, KindEnum, calcDiff, Value } from './words'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '~/registry/ui/accordion'
import { Popover, PopoverTrigger, PopoverContent } from '~/registry/ui/popover'
import { Block } from './page'

interface GameStats {
  totalGames: number
  totalWins: number
  averageGuesses: number
  words: Value[]
}

class WordStats {
  sidebar: StatsSidebar

  constructor(stats: GameStats) {
    this.sidebar = new StatsSidebar(stats)
  }

  static async fetchStats(): Promise<GameStats> {
    const db = getDB()
    if (!db) {
      await new Promise(resolve => setTimeout(resolve, 500))
      return WordStats.fetchStats()
    }

    let totalGames = 0
    let totalWins = 0
    let totalGuesses = 0
    const wordsStatsStats: Value[][] = []

    for (let i = 3; i <= 20; i++) {
      const storeName = `w${i}` as const
      const tx = db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const allRecords = await store.getAll() as Value[];
      for (const record of allRecords) {
        totalGames += record.h.length
        for (const history of record.h) {
          if (history.k === KindEnum.Correct) {
            totalWins += 1
            totalGuesses += history.h.length
          }
        }
      }
      wordsStatsStats.push(allRecords);
    }

    const words: Value[] = wordsStatsStats.flat()
    const averageGuesses = totalWins > 0 ? totalGuesses / totalWins : 0

    return {
      totalGames,
      totalWins,
      averageGuesses,
      words,
    }
  }

  static renderHistoryEntry(word: string, entry: HistoryEntry) {
    const wordLength = word.length;
    const guesses = [];
    for (let i = 0; i < entry.h.length; i += wordLength) {
      guesses.push(entry.h.substring(i, i + wordLength));
    }

    return <div class="flex flex-col gap-1 p-1 m-auto bg-background-muted/50">
      <For each={guesses}>
        {(guess) => {
          const mask = calcDiff(word, guess);
          return new Block(word.length, guess, mask).render()
        }}
      </For>
    </div>
  }

  renderValue(value: Value) {
    return <AccordionItem value={value.w} class="border border-muted-foreground/20 rounded-none">
      <AccordionTrigger
        class="w-full text-left p-2 bg-muted/50 hover:bg-muted/80 transition-colors flex justify-between items-center rounded-none"
        onClick={() => this.sidebar.setSelectedValue(value)}
      >
        <span class="font-semibold uppercase">{value.w}</span>
        <span class="text-sm text-muted-foreground">{value.h.length} attempts</span>
      </AccordionTrigger>
      <AccordionContent class="p-2 space-y-1">
        <For each={value.h}>
          {(attempt, i) => {
            const wordLength = value.w.length;
            const guessCount = attempt.h.length / wordLength;
            const outcome = attempt.k === KindEnum.Correct ? 'Correct' : attempt.k === KindEnum.Failed ? 'Failed' : 'Revealed';
            return (
              <Popover>
                <PopoverTrigger class="w-full">
                  <div class="flex justify-between items-center p-1 bg-muted/20 hover:bg-muted/40 rounded-none">
                    <span>Attempt #{i() + 1} - {guessCount} guesses</span>
                    <span class={`text-sm font-semibold ${
                      outcome === 'Correct' ? 'text-success-foreground' :
                      outcome === 'Failed' ? 'text-error-foreground' :
                      'text-blue-500'
                    }`}>{outcome}</span>
                  </div>
                </PopoverTrigger>
                <PopoverContent class="rounded-none">
                  {WordStats.renderHistoryEntry(value.w, attempt)}
                </PopoverContent>
              </Popover>
            )
          }}
        </For>
      </AccordionContent>
    </AccordionItem>
  }

  render() {
    const stats = this.sidebar.stats
    return <div class="flex flex-row gap-4 h-full">
      <div class="w-2/3">
        <Accordion class="w-full space-y-2" multiple>
          <For each={stats.words}>
            {this.renderValue.bind(this)}
          </For>
        </Accordion>
      </div>
      {this.sidebar.render()}
    </div>
  }
}

class StatsSidebar {
  selectedValue: Accessor<Value | undefined>
  setSelectedValue: Setter<Value | undefined>
  stats: GameStats

  constructor(stats: GameStats) {
    [this.selectedValue, this.setSelectedValue] = createSignal<Value | undefined>(undefined)
    this.stats = stats
  }

  static valueStats(selectedValue?: Value) {
    if (!selectedValue) return

    let wins: number = 0
    let fails: number = 0
    let reveals: number = 0
    let avgGuesses: number = 0

    for (const h of selectedValue.h) {
      switch (h.k) {
        case KindEnum.Correct:
          wins += 1;
          avgGuesses += h.h.length;
          break;
        case KindEnum.Failed:
          fails += 1;
          break;
        case KindEnum.Revealed:
          reveals += 1;
          break;
      }
    }

    avgGuesses /= selectedValue.w.length * selectedValue.h.length
    return {played: selectedValue.h.length, wins, fails, reveals, avgGuesses}
  }

  render() {
    const valueStats = createMemo(() => StatsSidebar.valueStats(this.selectedValue()))

    function renderStat(heading: JSX.Element, value: JSX.Element) {
      return <div class="p-2 border border-muted/50 text-center content-end">
        <h2 class="text-lg font-semibold text-muted-foreground">{heading}</h2>
        <p class="text-3xl font-bold">{value}</p>
      </div>
    }

    return <div class="w-1/3 border border-muted-foreground/20 rounded-none p-4 bg-muted/10">
      <div class="grid grid-cols-2 md:grid-cols-4 border border-muted/50 mb-4 bg-muted/40">
        {renderStat('Total Games', this.stats.totalGames)}
        {renderStat('Total Wins', this.stats.totalWins)}
        {renderStat('Win Rate', (this.stats.totalWins / this.stats.totalGames).toFixed(1) + '%')}
        {renderStat('Average Guesses', this.stats.averageGuesses.toFixed(2))}
      </div>
      <h2 class="text-xl font-bold mb-2 uppercase">{this.selectedValue()?.w || 'Detailed Stats'}</h2>
      <Show when={this.selectedValue() && valueStats()} fallback={<p>Select a word to see detailed stats.</p>}>
        <div class="space-y-2">
          <div class="flex justify-between"><span>Times Played:</span> <strong>{valueStats()!.played}</strong></div>
          <div class="flex justify-between"><span>Win Rate:</span> <strong>{((valueStats()!.wins / valueStats()!.played) * 100).toFixed(1)}%</strong></div>
          <div class="flex justify-between"><span>Average Guesses (on win):</span> <strong>{valueStats()!.avgGuesses.toFixed(2)}</strong></div>
          <hr class="border-muted-foreground/20 my-2" />
          <h3 class="font-bold">Outcomes:</h3>
          <div class="flex justify-between text-success-foreground"><span>Correct:</span> <strong>{valueStats()!.wins}</strong></div>
          <div class="flex justify-between text-error-foreground"><span>Failed:</span> <strong>{valueStats()!.fails}</strong></div>
          <div class="flex justify-between text-blue-500"><span>Revealed:</span> <strong>{valueStats()!.reveals}</strong></div>
        </div>
      </Show>
    </div>
  }
}

function StatsPage() {
  const [stats] = createResource(WordStats.fetchStats);

  return <div class="container mx-auto p-4 h-full">
    <h1 class="text-2xl font-bold mb-4">Analytics</h1>
    <Switch>
      <Match when={stats.loading}>
        <p>Loading stats...</p>
      </Match>
      <Match when={stats.error}>
        <p class="text-error-foreground">Error loading stats: {stats.error.message}</p>
      </Match>
      <Match when={stats()}>
        {new WordStats(stats()!).render()}
      </Match>
    </Switch>
  </div>
}

export default StatsPage

