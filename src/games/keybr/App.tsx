import { ErrorHandler } from "./debug/ErrorHandler.tsx";
import { loadIntl } from "./intl/intl.ts";
import { PracticePage } from "./practice/PracticePage.tsx";
import { LoadingProgress } from "./ui/LoadingProgress.tsx";
import { ResultLoader } from "./result/loader.tsx";
import { SettingsLoader } from "./settings/loader.tsx";
import { ThemeProvider } from "./themes/ThemeProvider.tsx";
import { PortalContainer } from "./widget/components/portal/Portal.tsx";
import { Toaster } from "./widget/components/toast/Toaster.tsx";
import { createEffect, createSignal, Show } from 'solid-js';
import { type JSX } from '@solidjs/web';
import { render } from '@solidjs/web';
import { type IntlShape, RawIntlProvider } from "./intl/runtime.tsx";

export function main(): void {
  const element = document.getElementById("app");
  if (element == null) throw new Error("Missing #app root element");
  const dispose = render(() => <ThemeProvider><Bootstrap /></ThemeProvider>, element);
  globalThis.SameyKeybrDispose = () => {
    dispose();
    delete globalThis.SameyKeybrDispose;
  };
}

function Bootstrap(): JSX.Element {
  const intl = useLocalIntl;
  createEffect(intl, value => {
    if (value == null) return;
    document.documentElement.lang = value.locale;
    document.documentElement.dir = ["ar", "fa", "he"].includes(value.locale) ? "rtl" : "ltr";
  });
  return (
    <Show keyed when={intl()} fallback={<LoadingProgress />}>
      {(value) => (
        <RawIntlProvider value={value}>
          <ErrorHandler>
            <SettingsLoader fallback={<LoadingProgress />}>
              <ResultLoader fallback={<LoadingProgress />}>
                <div id="keybr-root">
                  <PracticePage />
                  <PortalContainer />
                  <Toaster />
                </div>
              </ResultLoader>
            </SettingsLoader>
          </ErrorHandler>
        </RawIntlProvider>
      )}
    </Show>
  );
}

const [localIntl, setLocalIntl] = createSignal<IntlShape | null>(null);
let intlStarted = false;
function useLocalIntl(): IntlShape | null {
  if (!intlStarted) {
    intlStarted = true;
    void loadIntl().then(setLocalIntl).catch(console.error);
  }
  return localIntl();
}
