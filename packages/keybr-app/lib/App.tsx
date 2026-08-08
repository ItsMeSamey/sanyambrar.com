import { ErrorHandler } from "@keybr/debug";
import { loadIntl } from "@keybr/intl";
import { PracticePage } from "@keybr/page-practice";
import { StatsPage } from "@keybr/page-stats";
import { LoadingProgress, Root } from "@keybr/pages-shared";
import { ResultLoader } from "@keybr/result-loader";
import { SettingsLoader } from "@keybr/settings-loader";
import { PortalContainer, Toaster } from "@keybr/widget";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { type IntlShape, RawIntlProvider } from "react-intl";
import * as styles from "./App.module.less";

export function main(): void {
  const element = document.getElementById("app");
  if (element == null) {
    throw new Error("Missing #app root element");
  }
  document.documentElement.setAttribute("data-color", "system");
  document.documentElement.setAttribute("data-font", "sans-serif");
  createRoot(element).render(<Bootstrap />);
}

function Bootstrap() {
  const intl = useLocalIntl();
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
              <LocalApp />
            </Root>
          </ResultLoader>
        </SettingsLoader>
      </ErrorHandler>
    </RawIntlProvider>
  );
}

function LocalApp() {
  const [view, setView] = useState<"practice" | "statistics">("practice");
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <button
          className={view === "practice" ? styles.active : styles.navButton}
          type="button"
          onClick={() => setView("practice")}
        >
          Practice
        </button>
        <button
          className={view === "statistics" ? styles.active : styles.navButton}
          type="button"
          onClick={() => setView("statistics")}
        >
          Statistics
        </button>
        <span className={styles.localBadge}>Local only</span>
      </header>
      <main className={styles.main}>
        {view === "practice" ? <PracticePage /> : <StatsPage />}
        <PortalContainer />
        <Toaster />
      </main>
    </div>
  );
}

function useLocalIntl(): IntlShape | null {
  const [intl, setIntl] = useState<IntlShape | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadIntl()
      .then((value) => {
        if (!cancelled) {
          setIntl(value);
        }
      })
      .catch((error) => {
        console.error(error);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return intl;
}
