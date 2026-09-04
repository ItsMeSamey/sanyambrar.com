import { type KeyId, useKeyboard } from "@keybr/keyboard";
import { type Result } from "@keybr/result";
import { touchLive } from "@keybr/solid-compat/live";
import { type LineList } from "@keybr/textinput";
import { addKey, deleteKey, emulateLayout } from "@keybr/textinput-events";
import { makeSoundPlayer } from "@keybr/textinput-sounds";
import { useDocumentEvent, useHotkeys, useTimeout, useWindowEvent } from "@keybr/widget";
import { createEffect, createMemo, createSignal } from "solid-js";
import { Presenter } from "./Presenter.tsx";
import { type LastLesson, LessonState, makeLastLesson, type Progress } from "./state/index.ts";

export function Controller(props: {
  readonly progress: Progress;
  readonly onResult: (result: Result) => void;
}) {
  const lesson = useLessonState(() => props.progress, () => props.onResult);
  useHotkeys({
    "Ctrl+ArrowLeft": lesson.handleResetLesson,
    "Ctrl+ArrowRight": lesson.handleSkipLesson,
    Escape: lesson.handleResetLesson,
  });
  // App switches can swallow keyup. Clear only physical-key state;
  // lesson progress and completion feedback must survive focus changes.
  useWindowEvent("blur", lesson.handleReleaseKeys);
  useDocumentEvent("visibilitychange", () => {
    if (document.visibilityState !== "visible") lesson.handleReleaseKeys();
  });
  return (
    <Presenter
      state={lesson.state()}
      lines={lesson.lines()}
      depressedKeys={lesson.depressedKeys()}
      suffix={lesson.suffix()}
      lastLesson={lesson.lastLesson()}
      onResetLesson={lesson.handleResetLesson}
      onSkipLesson={lesson.handleSkipLesson}
      onKeyDown={lesson.handleKeyDown}
      onKeyUp={lesson.handleKeyUp}
      onInput={lesson.handleInput}
    />
  );
}

function useLessonState(progress: () => Progress, onResult: () => (result: Result) => void) {
  const keyboard = useKeyboard();
  const timeout = useTimeout();
  const [lessonRevision, setLessonRevision] = createSignal(0);
  const [lines, setLines] = createSignal<LineList>({ text: "", lines: [] }, { equals: false });
  const [depressedKeys, setDepressedKeys] = createSignal<readonly KeyId[]>([], { equals: false });
  const [lastLesson, setLastLesson] = createSignal<LastLesson | null>(null, { equals: false });

  const state = createMemo(() => {
    lessonRevision();
    touchLive(keyboard);
    return new LessonState(progress());
  });

  const suffix = createMemo(() => {
    lines(); // Suffix mutates with TextInput; the line signal is its reactive clock.
    return state().suffix;
  });

  createEffect(() => {
    const value = state();
    setLines(value.lines);
    setDepressedKeys(value.depressedKeys);
  });

  const handleResetLesson = () => {
    const value = state();
    value.resetLesson();
    setLines(value.lines);
    setDepressedKeys((value.depressedKeys = []));
    setLastLesson(null);
    timeout.cancel();
  };
  const handleSkipLesson = () => {
    const value = state();
    value.skipLesson();
    setLines(value.lines);
    setDepressedKeys((value.depressedKeys = []));
    setLastLesson(null);
    timeout.cancel();
  };
  const handleReleaseKeys = () => {
    const value = state();
    value.depressedKeys = [];
    setDepressedKeys([]);
  };

  const handlers = createMemo(() => {
    const value = state();
    const playSounds = makeSoundPlayer(value.settings);
    return emulateLayout(value.settings, keyboard, {
      onKeyDown(event) {
        setDepressedKeys((value.depressedKeys = addKey(value.depressedKeys, event.code)));
      },
      onKeyUp(event) {
        setDepressedKeys((value.depressedKeys = deleteKey(value.depressedKeys, event.code)));
      },
      onInput(event) {
        setLastLesson(null);
        const { feedback, result } = value.onInput(event);
        if (result != null) {
          // Complete the lesson as one state transition. The old port updated
          // the revision from inside LessonState and then published the old
          // completed lines afterwards, overwriting the freshly generated
          // lesson until another key event happened.
          setLastLesson(makeLastLesson(result, value.textInput.steps));
          onResult()(result);
          setLessonRevision((revision) => revision + 1);
          const next = state();
          setLines(next.lines);
          setDepressedKeys([]);
          timeout.cancel();
        } else {
          setLines(value.lines);
          timeout.schedule(handleResetLesson, 10000);
        }
        playSounds(feedback);
      },
    });
  });

  return {
    state,
    lines,
    depressedKeys,
    suffix,
    lastLesson,
    handleResetLesson,
    handleSkipLesson,
    handleReleaseKeys,
    handleKeyDown: (event: Parameters<ReturnType<typeof handlers>["onKeyDown"]>[0]) => handlers().onKeyDown(event),
    handleKeyUp: (event: Parameters<ReturnType<typeof handlers>["onKeyUp"]>[0]) => handlers().onKeyUp(event),
    handleInput: (event: Parameters<ReturnType<typeof handlers>["onInput"]>[0]) => handlers().onInput(event),
  };
}
