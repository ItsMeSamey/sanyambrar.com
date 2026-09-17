import type { Component } from "solid-js";
import { type LineList } from "../textinput/chars.ts";
import { type TextDisplaySettings } from "../textinput/settings.ts";
import { type IInputEvent, type IKeyboardEvent } from "../textinput-events/types.ts";
import { ModifierState } from "../textinput-events/modifiers.ts";
import { TextEvents } from "../textinput-events/TextEvents.tsx";
import { type Focusable } from "../widget/components/types.ts";
import { useHotkeys } from "../widget/hooks/use-hotkeys.ts";
import { useWindowEvent } from "../widget/hooks/use-window-event.ts";
import { type ZoomableProps } from "../widget/components/zoomer/Zoomer.types.ts";
import { FormattedMessage } from "../intl/runtime.tsx";
import { createEffect, createSignal, onSettled } from 'solid-js';
import { type JSX } from '@solidjs/web';
import * as styles from "./TextArea.module.css";
import { TextLines, type TextLineSize } from "./TextLines.tsx";

export function TextArea(props: {
  readonly settings: TextDisplaySettings;
  readonly lines: LineList;
  readonly wrap?: boolean;
  readonly size?: TextLineSize;
  readonly lineTemplate?: Component;
  readonly demo?: boolean;
  readonly focusRef?: (focusable: Focusable | null) => void;
  readonly onFocus?: () => void;
  readonly onBlur?: () => void;
  readonly onKeyDown?: (event: IKeyboardEvent) => void;
  readonly onKeyUp?: (event: IKeyboardEvent) => void;
  readonly onInput?: (event: IInputEvent) => void;
} & ZoomableProps): JSX.Element {
  let root!: HTMLDivElement;
  let input: Focusable | null = null;
  const [focus, setFocus] = createSignal(false);

  onSettled(() => {
    props.focusRef?.({
      focus: () => input?.focus(),
      blur: () => input?.blur(),
    });
    return () => props.focusRef?.(null);
  });
  createEffect(() => !props.moving && focus() ? "none" : "default", cursor => setElementCursor(root, cursor));
  useWindowEvent("mousemove", () => setElementCursor(root, "default"));
  useHotkeys({ Enter: () => input?.focus() });

  const handleFocus = () => { setFocus(true); props.onFocus?.(); };
  const handleBlur = () => { setFocus(false); props.onBlur?.(); };

  return (
    <div ref={root} class={styles.root} data-grab-cursor-on-drag="" onClick={(event) => {
      input?.focus();
      event.preventDefault();
    }}>
      <TextEvents focusRef={(focusable) => { input = focusable; }} onFocus={handleFocus} onBlur={handleBlur} onKeyDown={props.onKeyDown} onKeyUp={props.onKeyUp} onInput={props.onInput} />
      <TextLines settings={props.settings} lines={props.lines} wrap={props.wrap} size={props.size} lineTemplate={props.lineTemplate} cursor={!props.demo && focus()} focus={Boolean(props.demo) || focus()} />
      {!props.demo && focus() && ModifierState.capsLock && <div class={styles.messageArea}><div class={styles.messageText}><FormattedMessage id="t_Caps_Lock_is_on" defaultMessage="Caps Lock is on" /></div></div>}
      {!props.demo && !focus() && <div class={styles.messageArea}><div class={styles.messageText}><FormattedMessage id="t_Click_or_press_Enter_" defaultMessage="Click or press Enter to activate..." /></div></div>}
    </div>
  );
}

function setElementCursor(element: HTMLDivElement, cursor: string): void { element.style.cursor = cursor; }
