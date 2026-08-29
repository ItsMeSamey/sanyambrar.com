import { type KeyId, useKeyboard } from "@keybr/keyboard";
import { type Result } from "@keybr/result";
import { LIVE_ACCESSOR } from "@keybr/solid-compat/live";
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
  useWindowEvent("focus", lesson.handleResetLesson);
  useWindowEvent("blur", lesson.handleResetLesson);
  useDocumentEvent("visibilitychange", lesson.handleResetLesson);
  return (
    <Presenter
      state={lesson.state()}
      lines={lesson.lines()}
      depressedKeys={lesson.depressedKeys()}
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
  let lastLesson: LastLesson | null = null;

  const state = createMemo(() => {
    lessonRevision();
    (keyboard as any)[LIVE_ACCESSOR]?.();
    return new LessonState(progress(), (result, textInput) => {
      lastLesson = makeLastLesson(result, textInput.steps);
      onResult()(result);
      setLessonRevision((value) => value + 1);
    });
  });

  createEffect(() => {
    const value = state();
    value.lastLesson = lastLesson;
    setLines(value.lines);
    setDepressedKeys(value.depressedKeys);
  });

  const handleResetLesson = () => {
    const value = state();
    value.resetLesson();
    setLines(value.lines);
    setDepressedKeys((value.depressedKeys = []));
    timeout.cancel();
  };
  const handleSkipLesson = () => {
    const value = state();
    value.skipLesson();
    setLines(value.lines);
    setDepressedKeys((value.depressedKeys = []));
    timeout.cancel();
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
        value.lastLesson = null;
        const feedback = value.onInput(event);
        setLines(value.lines);
        playSounds(feedback);
        timeout.schedule(handleResetLesson, 10000);
      },
    });
  });

  return {
    state,
    lines,
    depressedKeys,
    handleResetLesson,
    handleSkipLesson,
    handleKeyDown: (event: Parameters<ReturnType<typeof handlers>["onKeyDown"]>[0]) => handlers().onKeyDown(event),
    handleKeyUp: (event: Parameters<ReturnType<typeof handlers>["onKeyUp"]>[0]) => handlers().onKeyUp(event),
    handleInput: (event: Parameters<ReturnType<typeof handlers>["onInput"]>[0]) => handlers().onInput(event),
  };
}
