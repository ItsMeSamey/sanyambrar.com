import { StatsPage } from "@keybr/page-stats";
import { ViewContext } from "@keybr/widget";
import { useContext } from "react";
import { PracticeScreen } from "./practice/PracticeScreen.tsx";
import { SettingsScreen } from "./settings/SettingsScreen.tsx";

function StatisticsScreen() {
  const { setView } = useContext(ViewContext);
  return <StatsPage onDone={() => setView("practice")} />;
}

export const views = {
  practice: PracticeScreen,
  statistics: StatisticsScreen,
  settings: SettingsScreen,
} as const;
