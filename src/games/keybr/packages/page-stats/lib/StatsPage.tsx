import { Screen } from "@keybr/pages-shared";
import {
  DailyStatsMap,
  type KeyStatsMap,
  makeSummaryStats,
} from "@keybr/result";
import { ExplainerBoundary } from "@keybr/widget";
import { AccuracyStreaksSection } from "./stats/AccuracyStreaksSection.tsx";
import { CalendarSection } from "./stats/CalendarSection.tsx";
import { ExplainStats } from "./stats/ExplainStats.tsx";
import { FooterSection } from "./stats/FooterSection.tsx";
import { KeyFrequencyHeatmapSection } from "./stats/KeyFrequencyHeatmapSection.tsx";
import { KeyFrequencyHistogramSection } from "./stats/KeyFrequencyHistogramSection.tsx";
import { KeySpeedChartSection } from "./stats/KeySpeedChartSection.tsx";
import { KeySpeedHistogramSection } from "./stats/KeySpeedHistogramSection.tsx";
import { ProgressOverviewSection } from "./stats/ProgressOverviewSection.tsx";
import { ResultGrouper } from "./stats/ResultGrouper.tsx";
import { SpeedChartSection } from "./stats/SpeedChartSection.tsx";
import { AllTimeSummary, TodaySummary } from "./stats/Summary.tsx";

/** Local statistics only; there is no user identity or public stats. */
export function StatsPage(solidProps: { readonly onDone?: () => void }) {
  return (
    <Screen>
      <ExplainerBoundary>
        <ExplainStats />
        <ResultGrouper>
          {(keyStatsMap) => (
            <Content keyStatsMap={keyStatsMap} onDone={solidProps.onDone} />
          )}
        </ResultGrouper>
      </ExplainerBoundary>
    </Screen>
  );
}

function Content(solidProps: {
  readonly keyStatsMap: KeyStatsMap;
  readonly onDone?: () => void;
}) {
  const { results } = solidProps.keyStatsMap;
  const stats = makeSummaryStats(results);
  const dailyStatsMap = new DailyStatsMap(results);
  return (
    <>
      <AllTimeSummary stats={stats} />
      <TodaySummary stats={dailyStatsMap.today.stats} />
      <AccuracyStreaksSection results={results} />
      <ProgressOverviewSection keyStatsMap={solidProps.keyStatsMap} />
      <SpeedChartSection results={results} />
      <KeySpeedChartSection keyStatsMap={solidProps.keyStatsMap} />
      <KeySpeedHistogramSection keyStatsMap={solidProps.keyStatsMap} />
      <KeyFrequencyHistogramSection keyStatsMap={solidProps.keyStatsMap} />
      <KeyFrequencyHeatmapSection keyStatsMap={solidProps.keyStatsMap} />
      <CalendarSection dailyStatsMap={dailyStatsMap} />
      <FooterSection onDone={solidProps.onDone} />
    </>
  );
}
