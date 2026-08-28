import { ErrorHandler } from "@keybr/debug";
import { loadIntl } from "@keybr/intl";
import { PracticePage } from "@keybr/page-practice";
import { LoadingProgress, Root } from "@keybr/pages-shared";
import { ResultLoader } from "@keybr/result-loader";
import { SettingsLoader } from "@keybr/settings-loader";
import { ThemeProvider } from "@keybr/themes";
import { PortalContainer, Toaster } from "@keybr/widget";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { type IntlShape, RawIntlProvider } from "react-intl";

export function main(): void {
  const element = document.getElementById("app");
  if (element == null) {
    throw new Error("Missing #app root element");
  }
  const root = createRoot(element);
  (globalThis as any).SameyKeybrDispose = () => { root.unmount(); delete (globalThis as any).SameyKeybrDispose; };
  root.render(
    <ThemeProvider>
      <Bootstrap />
    </ThemeProvider>,
  );
}

function Bootstrap() {
  const [intl, error] = useLocalIntl();
  if (error != null) {
    return <p role="alert">Could not initialize Keybr.</p>;
  }
  if (intl == null) {
    return <LoadingProgress />;
  }

  document.documentElement.lang = intl.locale;
  document.documentElement.dir = ["ar", "fa", "he"].includes(intl.locale)
    ? "rtl"
    : "ltr";

  return (
    <RawIntlProvider value={intl}>
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
  );
}

function useLocalIntl() {
  const [intl, setIntl] = useState<IntlShape | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    let cancelled = false;
    loadIntl().then(
      (value) => {
        if (!cancelled) setIntl(value);
      },
      (error) => {
        console.error(error);
        if (!cancelled) setError(error);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);
  return [intl, error] as const;
}
