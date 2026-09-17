import { Screen } from "../ui/Screen.tsx";
import { DailyStatsMap } from "../result/dailystats.ts";
import { type KeyStatsMap } from "../result/keystats.ts";
import { makeSummaryStats } from "../result/summarystats.ts";
import { ExplainerBoundary } from "../widget/components/explainer/ExplainerBoundary.tsx";
import { createMemo } from 'solid-js';
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
import { SpeedHistogramSection } from "./stats/SpeedHistogramSection.tsx";
import { AllTimeSummary, TodaySummary } from "./stats/Summary.tsx";

/** Local statistics only; there is no user identity or public stats. */
export function StatsPage() {
  return (
    <Screen>
      <ExplainerBoundary>
        <ResultGrouper actions={<ExplainStats />}>
          {(keyStatsMap) => <Content keyStatsMap={keyStatsMap} />}
        </ResultGrouper>
      </ExplainerBoundary>
    </Screen>
  );
}

function Content(props: { readonly keyStatsMap: KeyStatsMap }) {
  const results = () => props.keyStatsMap.results;
  const stats = createMemo(() => makeSummaryStats(results()));
  const dailyStatsMap = createMemo(() => new DailyStatsMap(results()));
  return (
    <>
      <AllTimeSummary stats={stats()} />
      <TodaySummary stats={dailyStatsMap().today.stats} />
      <AccuracyStreaksSection results={results()} />
      <ProgressOverviewSection keyStatsMap={props.keyStatsMap} />
      <SpeedChartSection results={results()} />
      <SpeedHistogramSection stats={stats()} />
      <KeySpeedChartSection keyStatsMap={props.keyStatsMap} />
      <KeySpeedHistogramSection keyStatsMap={props.keyStatsMap} />
      <KeyFrequencyHistogramSection keyStatsMap={props.keyStatsMap} />
      <KeyFrequencyHeatmapSection keyStatsMap={props.keyStatsMap} />
      <CalendarSection dailyStatsMap={dailyStatsMap()} />
      <FooterSection />
    </>
  );
}
