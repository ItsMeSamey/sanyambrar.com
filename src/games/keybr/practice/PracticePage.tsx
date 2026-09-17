import { KeyboardOptions } from "../keyboard/settings.ts";
import { Layout } from "../keyboard/layout.ts";
import { Settings } from "../settings/settings.ts";
import { ViewSwitch } from "../widget/components/view/ViewSwitch.tsx";
import { views } from "./views.tsx";
import { KeybrTopBar } from "./KeybrTopBar.tsx";

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
