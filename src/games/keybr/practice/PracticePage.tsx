import { KeyboardOptions } from "../keyboard/settings.ts";
import { Layout } from "../keyboard/layout.ts";
import { Settings } from "../settings/settings.ts";
import { ViewSwitch } from "../widget/components/view/ViewSwitch.tsx";
import { views } from "./views.tsx";
import { HomeBrand, KeybrMark } from "../../../shared/components/Brand.tsx";
import { BackLink, GameTopBarActions, TopBar, TopBarIconButton } from "../../../shared/components/TopBar.tsx";
import { ChartNoAxesColumn as BarChart3, Settings as SettingsIcon } from "../../../shared/components/Icons.tsx";
import { useView } from "../widget/components/view/ViewSwitch.tsx";
import { Show } from "solid-js";

setDefaultLayout(window.navigator.language);

function setDefaultLayout(localeId: string) {
  const layout = Layout.findLayout(localeId);
  if (layout != null) {
    Settings.addDefaults(
      KeyboardOptions.default()
        .withLanguage(layout.language)
        .withLayout(layout)
        .save(new Settings()),
    );
  }
}

export function PracticePage() {
  return <ViewSwitch views={views} header={() => <KeybrTopBar />} />;
}

function KeybrTopBar() {
  const { setView, currentView } = useView(views);
  return <TopBar
    start={<Show when={currentView() !== "practice"} fallback={<HomeBrand class="brand home-brand-link" />}>
      <BackLink class="keybr-view-back" onClick={() => setView("practice")}><KeybrMark /></BackLink>
    </Show>}
    nav={<GameTopBarActions ariaLabel="Keybr">
      <TopBarIconButton label="Statistics" disabled={currentView() === "statistics"} onClick={() => setView("statistics")}><BarChart3 aria-hidden="true" /></TopBarIconButton>
      <TopBarIconButton label="Settings" disabled={currentView() === "settings"} onClick={() => setView("settings")}><SettingsIcon aria-hidden="true" /></TopBarIconButton>
    </GameTopBarActions>}
  />;
}
