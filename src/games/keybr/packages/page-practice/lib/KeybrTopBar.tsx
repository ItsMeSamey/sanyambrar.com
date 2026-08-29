import { AppearanceButton, SearchButton, TopBar } from "../../../../../shared/components/TopBar.tsx";
import BarChart3 from "lucide-solid/icons/chart-no-axes-column";
import SettingsIcon from "lucide-solid/icons/settings";
import { useView } from "@keybr/widget";
import { views } from "./views.tsx";

function TopIcon(props: { label: string; onClick: () => void; children: any }) {
  return <button type="button" class="top-icon site-topbar-icon" aria-label={props.label} title={props.label} onClick={props.onClick}>{props.children}</button>;
}

export function KeybrTopBar() {
  const { setView } = useView(views);
  return <TopBar
    nav={<nav class="top-nav site-topbar-nav keybr-topbar-nav" aria-label="Keybr">
      <AppearanceButton />
      <TopIcon label="Statistics" onClick={() => setView("statistics")}><BarChart3 aria-hidden="true" /></TopIcon>
      <TopIcon label="Settings" onClick={() => setView("settings")}><SettingsIcon aria-hidden="true" /></TopIcon>
      <SearchButton />
    </nav>}
  />;
}
