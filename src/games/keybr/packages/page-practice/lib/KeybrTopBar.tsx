import { AppearanceButton, TopBar } from "../../../../../shared/components/TopBar.tsx";
import BarChart3 from "lucide-solid/icons/chart-no-axes-column";
import Home from "lucide-solid/icons/house";
import SettingsIcon from "lucide-solid/icons/settings";
import { useView } from "@keybr/widget";
import { views } from "./views.tsx";

function TopIcon(props: { label: string; onClick: () => void; children: any }) {
  return <button type="button" class="top-icon site-topbar-icon" aria-label={props.label} title={props.label} onClick={props.onClick}>{props.children}</button>;
}

export function KeybrTopBar() {
  const { setView } = useView(views);
  const goHome = () => {
    const href = new URL("./", location.href).href;
    const navigate = (globalThis as any).SameyNavigate;
    if (navigate) void navigate(href);
    else location.assign(href);
  };
  return <TopBar
    nav={false}
    start={<div class="keybr-topbar-actions" aria-label="Keybr navigation">
      <TopIcon label="Home" onClick={goHome}><Home aria-hidden="true" /></TopIcon>
      <AppearanceButton />
      <TopIcon label="Statistics" onClick={() => setView("statistics")}><BarChart3 aria-hidden="true" /></TopIcon>
      <TopIcon label="Settings" onClick={() => setView("settings")}><SettingsIcon aria-hidden="true" /></TopIcon>
    </div>}
  />;
}
