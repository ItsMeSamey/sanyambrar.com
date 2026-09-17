import { Screen } from "../ui/Screen.tsx";
import { DailyStatsMap } from "../result/dailystats.ts";
import { type KeyStatsMap } from "../result/keystats.ts";
import { makeSummaryStats } from "../result/summarystats.ts";
import { ExplainerBoundary } from "../widget/components/explainer/ExplainerBoundary.tsx";
import { createMemo } from 'solid-js';
import { AccuracyStreaksSection } from "./AccuracyStreaksSection.tsx";
import { CalendarSection } from "./CalendarSection.tsx";
import { ExplainStats } from "./ExplainStats.tsx";
import { FooterSection } from "./FooterSection.tsx";
import { KeyFrequencyHeatmapSection } from "./KeyFrequencyHeatmapSection.tsx";
import { KeyFrequencyHistogramSection } from "./KeyFrequencyHistogramSection.tsx";
import { KeySpeedChartSection } from "./KeySpeedChartSection.tsx";
import { KeySpeedHistogramSection } from "./KeySpeedHistogramSection.tsx";
import { ProgressOverviewSection } from "./ProgressOverviewSection.tsx";
import { ResultGrouper } from "./ResultGrouper.tsx";
import { SpeedChartSection } from "./SpeedChartSection.tsx";
import { SpeedHistogramSection } from "./SpeedHistogramSection.tsx";
import { AllTimeSummary, TodaySummary } from "./Summary.tsx";

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
