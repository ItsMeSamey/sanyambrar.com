import { KeyboardProvider } from "../keyboard/context.tsx";
import { schedule } from "../lang/scheduler.ts";
import { type Lesson } from "../lesson/lesson.ts";
import { LessonLoader } from "../lesson/loader.tsx";
import { LoadingProgress } from "../ui/LoadingProgress.tsx";
import { type Result } from "../result/result.ts";
import { useResults } from "../result/context.ts";
import { useSettings } from "../settings/context.ts";
import { createEffect, createMemo, createSignal, Show, untrack } from 'solid-js';
import { Controller } from "./Controller.tsx";
import { displayEvent } from "./state/EventAlert.tsx";
import { Progress } from "./state/progress.ts";

export function PracticeScreen() {
  return (
    <KeyboardProvider>
      <LessonLoader>{(lesson) => <ProgressUpdater lesson={lesson} />}</LessonLoader>
    </KeyboardProvider>
  );
}

function ProgressUpdater(props: { readonly lesson: Lesson }) {
  const { results, appendResults } = useResults();
  const { settings } = useSettings();
  const [loading, setLoading] = createSignal({ total: 0, current: 0 });
  const [ready, setReady] = createSignal<Progress | null>(null);
  const progress = createMemo(() => new Progress(settings, props.lesson));

  createEffect(() => ({ value: progress(), lesson: props.lesson }), ({ value, lesson }) => {
    // ResultProvider is append-only during practice and `Progress.append()`
    // already updates the live lesson statistics incrementally. Subscribing
    // this seeding effect to `results.length` made every completed lesson tear
    // down the controller, flash LoadingProgress, and rebuild the whole
    // practice screen. Only seed from history when the Progress instance
    // itself changes (lesson/settings/page load).
    const seedResults = untrack(() => lesson.filter(results()));
    setReady(null);
    const controller = new AbortController();
    schedule(value.seedAsync(seedResults, setLoading), { signal: controller.signal })
      .then(() => { if (!controller.signal.aborted) setReady(value); })
      .catch((error) => { if (!controller.signal.aborted) console.error(error); });
    return () => controller.abort();
  });

  return (
    <Show when={ready()} fallback={<LoadingProgress total={loading().total} current={loading().current} />}>
      {(value) => (
        <Controller
          progress={value()}
          onResult={(result: Result) => {
            if (!result.validate()) return;
            value().append(result, displayEvent);
            appendResults([result]);
          }}
        />
      )}
    </Show>
  );
}
