import { Tasks } from "@keybr/lang";
import { type Char, type TextDisplaySettings, TextInput } from "@keybr/textinput";
import { type ReactNode } from "@keybr/solid-compat/react";
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { StaticText } from "./StaticText.tsx";
import { type TextLineSize } from "./TextLines.tsx";

export function AnimatedText(props: {
  readonly settings: TextDisplaySettings;
  readonly text: string;
  readonly wrap?: boolean;
  readonly size?: TextLineSize;
}): ReactNode {
  const chars = useAnimatedTextState(() => props.text);
  const lines = createMemo(() => ({
    text: props.text,
    lines: [{ text: props.text, chars: chars() }],
  }));
  return (
    <StaticText
      settings={props.settings}
      lines={lines()}
      cursor={true}
      wrap={props.wrap}
      size={props.size}
    />
  );
}

function useAnimatedTextState(text: () => string): () => readonly Char[] {
  const textInput = createMemo(
    () =>
      new TextInput(text(), {
        stopOnError: false,
        forgiveErrors: false,
        spaceSkipsWords: false,
      }),
  );
  const [chars, setChars] = createSignal<readonly Char[]>([]);

  createEffect(() => {
    const input = textInput();
    setChars(input.chars);
    const tasks = new Tasks();
    tasks.repeated(500, () => {
      if (input.completed) input.reset();
      else input.appendChar(0, input.at(input.pos).codePoint, 0);
      setChars(input.chars);
    });
    onCleanup(() => tasks.cancelAll());
  });

  return chars;
}
