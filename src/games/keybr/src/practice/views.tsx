import { StatsPage } from "../stats/StatsPage.tsx";
import { PracticeScreen } from "./PracticeScreen.tsx";
import { SettingsScreen } from "./settings/SettingsScreen.tsx";
export const views = {
    practice: PracticeScreen,
    statistics: StatsPage,
    settings: SettingsScreen,
} as const;
