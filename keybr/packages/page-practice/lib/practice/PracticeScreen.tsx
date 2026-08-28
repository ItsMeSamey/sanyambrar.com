import { catchError } from "@keybr/debug";
import { KeyboardProvider } from "@keybr/keyboard";
import { schedule } from "@keybr/lang";
import { type Lesson } from "@keybr/lesson";
import { LessonLoader } from "@keybr/lesson-loader";
import { LoadingProgress } from "@keybr/pages-shared";
import { type Result, useResults } from "@keybr/result";
import { useSettings } from "@keybr/settings";
import { useEffect, useMemo, useState } from "react";
import { Controller } from "./Controller.tsx";
import { displayEvent, Progress } from "./state/index.ts";

export function PracticeScreen() {
  return (
    <KeyboardProvider>
      <LessonLoader>
        {(lesson) => <ProgressUpdater lesson={lesson} />}
      </LessonLoader>
    </KeyboardProvider>
  );
}

function ProgressUpdater({ lesson }: { readonly lesson: Lesson }) {
  const { results, appendResults } = useResults();
  const [progress, { total, current }] = useProgress(lesson, results);
  if (progress == null) {
    return <LoadingProgress total={total} current={current} />;
  } else {
    return (
      <Controller
        progress={progress}
        onResult={(result) => {
          if (result.validate()) {
            progress.append(result, displayEvent);
            appendResults([result]);
          }
        }}
      />
    );
  }
}

function useProgress(lesson: Lesson, results: readonly Result[]) {
  const { settings } = useSettings();
  const [ready, setReady] = useState<Progress | null>(null);
  const [loading, setLoading] = useState({ total: 0, current: 0 });
  const seed = useMemo(
    () => ({ progress: new Progress(settings, lesson), results: lesson.filter(results) }),
    [settings, lesson],
  );
  const { progress } = seed;
  useEffect(() => {
    // Populating the progress object can take a long time, so we do this
    // asynchronously, interleaved with the browser event loop to avoid
    // freezing of the UI.
    const controller = new AbortController();
    const { signal } = controller;
    schedule(progress.seedAsync(seed.results, setLoading), { signal }).then(
      () => { if (!signal.aborted) setReady(progress); },
      (error) => { if (!signal.aborted) catchError(error); },
    );
    return () => {
      controller.abort();
    };
  }, [progress, seed.results]);
  return [ready === progress ? progress : null, loading] as const;
}
