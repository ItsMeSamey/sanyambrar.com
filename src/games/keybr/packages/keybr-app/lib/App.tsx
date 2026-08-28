import { ErrorHandler } from "@keybr/debug";
import { loadIntl } from "@keybr/intl";
import { PracticePage } from "@keybr/page-practice";
import { LoadingProgress, Root } from "@keybr/pages-shared";
import { ResultLoader } from "@keybr/result-loader";
import { SettingsLoader } from "@keybr/settings-loader";
import { ThemeProvider } from "@keybr/themes";
import { PortalContainer, Toaster } from "@keybr/widget";
import { createEffect, createSignal, onCleanup, onMount, Show, type JSX } from "solid-js";
import { render } from "solid-js/web";
import { type IntlShape, RawIntlProvider } from "@keybr/solid-compat/intl";

export function main(): void {
  const element = document.getElementById("app");
  if (element == null) throw new Error("Missing #app root element");
  const dispose = render(() => <ThemeProvider><Bootstrap /></ThemeProvider>, element);
  (globalThis as any).SameyKeybrDispose = () => {
    dispose();
    delete (globalThis as any).SameyKeybrDispose;
  };
}

function Bootstrap(): JSX.Element {
  const intl = useLocalIntl;
  createEffect(() => {
    const value = intl();
    if (value == null) return;
    document.documentElement.lang = value.locale;
    document.documentElement.dir = ["ar", "fa", "he"].includes(value.locale) ? "rtl" : "ltr";
  });
  return (
    <Show when={intl()} fallback={<LoadingProgress />}>
      {(value) => (
        <RawIntlProvider value={value()}>
          <ErrorHandler>
            <SettingsLoader fallback={<LoadingProgress />}>
              <ResultLoader fallback={<LoadingProgress />}>
                <Root>
                  <PracticePage />
                  <PortalContainer />
                  <Toaster />
                </Root>
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
