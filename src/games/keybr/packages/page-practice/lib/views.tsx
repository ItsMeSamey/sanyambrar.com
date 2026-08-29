import { StatsPage } from "@keybr/page-stats";
import { PracticeScreen } from "./practice/PracticeScreen.tsx";
import { SettingsScreen } from "./settings/SettingsScreen.tsx";
export const views = {
    practice: PracticeScreen,
    statistics: StatsPage,
    settings: SettingsScreen,
} as const;
