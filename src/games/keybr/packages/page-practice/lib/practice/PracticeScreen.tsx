import { KeyboardProvider } from "@keybr/keyboard";
import { schedule } from "@keybr/lang";
import { type Lesson } from "@keybr/lesson";
import { LessonLoader } from "@keybr/lesson-loader";
import { LoadingProgress } from "@keybr/pages-shared";
import { type Result, useResults } from "@keybr/result";
import { useSettings } from "@keybr/settings";
import { createEffect, createMemo, createSignal, onCleanup, Show } from "solid-js";
import { Controller } from "./Controller.tsx";
import { displayEvent, Progress } from "./state/index.ts";

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

  createEffect(() => {
    const value = progress();
    const lesson = props.lesson;
    void results.length;
    setReady(null);
    const controller = new AbortController();
    schedule(value.seedAsync(lesson.filter(results), setLoading), { signal: controller.signal })
      .then(() => { if (!controller.signal.aborted) setReady(value); })
      .catch((error) => { if (!controller.signal.aborted) console.error(error); });
    onCleanup(() => controller.abort());
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
