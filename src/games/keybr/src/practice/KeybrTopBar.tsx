import { HomeBrand, KeybrMark } from "../../../../shared/components/Brand.tsx";
import { BackLink, GameTopBarActions, TopBar, TopBarIconButton } from "../../../../shared/components/TopBar.tsx";
import { ChartNoAxesColumn as BarChart3 } from '../../../../shared/components/Icons.tsx';
import { Settings as SettingsIcon } from '../../../../shared/components/Icons.tsx';
import { useView } from "../widget/components/view/ViewSwitch.tsx";
import { Show } from 'solid-js';
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
