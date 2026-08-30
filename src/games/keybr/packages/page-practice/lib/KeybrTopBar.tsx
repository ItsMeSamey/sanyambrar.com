import { HomeBrand, KeybrMark } from "../../../../../shared/components/Brand.tsx";
import { BackLink, GameTopBarActions, TopBar, TopBarIconButton } from "../../../../../shared/components/TopBar.tsx";
import BarChart3 from "lucide-solid/icons/chart-no-axes-column";
import SettingsIcon from "lucide-solid/icons/settings";
import { useView } from "@keybr/widget";
import { Show } from "solid-js";
import { views } from "./views.tsx";

export function KeybrTopBar() {
  const { setView, currentView } = useView(views);
  return <TopBar
    start={<Show
      when={currentView() !== "practice"}
      fallback={<HomeBrand class="brand home-brand-link" />}
    >
      <BackLink class="keybr-view-back" onClick={() => setView("practice")}><KeybrMark /></BackLink>
    </Show>}
    nav={<GameTopBarActions ariaLabel="Keybr">
      <TopBarIconButton label="Statistics" disabled={currentView() === "statistics"} onClick={() => setView("statistics")}><BarChart3 aria-hidden="true" /></TopBarIconButton>
      <TopBarIconButton label="Settings" disabled={currentView() === "settings"} onClick={() => setView("settings")}><SettingsIcon aria-hidden="true" /></TopBarIconButton>
    </GameTopBarActions>}
  />;
}
