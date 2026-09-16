import { type LineList, type TextDisplaySettings } from "@keybr/textinput";
import { type IInputEvent, type IKeyboardEvent, ModifierState, TextEvents } from "@keybr/textinput-events";
import { type Focusable, useHotkeys, useWindowEvent, type ZoomableProps } from "@keybr/widget";
import { FormattedMessage } from "@keybr/solid-compat/intl";
import { type ComponentType, type RefObject } from "@keybr/solid-compat/react";
import { createEffect, createSignal, onSettled } from 'solid-js';
import { type JSX } from '@solidjs/web';
import * as styles from "./TextArea.module.css";
import { TextLines, type TextLineSize } from "./TextLines.tsx";

export function TextArea(props: {
  readonly settings: TextDisplaySettings;
  readonly lines: LineList;
  readonly wrap?: boolean;
  readonly size?: TextLineSize;
  readonly lineTemplate?: ComponentType;
  readonly demo?: boolean;
  readonly focusRef?: RefObject<Focusable | null>;
  readonly onFocus?: () => void;
  readonly onBlur?: () => void;
  readonly onKeyDown?: (event: IKeyboardEvent) => void;
  readonly onKeyUp?: (event: IKeyboardEvent) => void;
  readonly onInput?: (event: IInputEvent) => void;
} & ZoomableProps): JSX.Element {
  let root!: HTMLDivElement;
  const innerRef: RefObject<Focusable> = { current: null };
  const [focus, setFocus] = createSignal(false);

  onSettled(() => {
    if (props.focusRef) props.focusRef.current = {
      focus: () => innerRef.current?.focus(),
      blur: () => innerRef.current?.blur(),
    };
    return () => { if (props.focusRef) props.focusRef.current = null; };
  });
  createEffect(() => !props.moving && focus() ? "none" : "default", cursor => setElementCursor(root, cursor));
  useWindowEvent("mousemove", () => setElementCursor(root, "default"));
  useHotkeys({ Enter: () => innerRef.current?.focus() });

  const handleFocus = () => { setFocus(true); props.onFocus?.(); };
  const handleBlur = () => { setFocus(false); props.onBlur?.(); };

  return (
    <div ref={root} class={styles.root} data-grab-cursor-on-drag="" onClick={(event) => {
      innerRef.current?.focus();
      event.preventDefault();
    }}>
      <TextEvents focusRef={innerRef} onFocus={handleFocus} onBlur={handleBlur} onKeyDown={props.onKeyDown} onKeyUp={props.onKeyUp} onInput={props.onInput} />
      <TextLines settings={props.settings} lines={props.lines} wrap={props.wrap} size={props.size} lineTemplate={props.lineTemplate} cursor={!props.demo && focus()} focus={Boolean(props.demo) || focus()} />
      {!props.demo && focus() && ModifierState.capsLock && <div class={styles.messageArea}><div class={styles.messageText}><FormattedMessage id="t_Caps_Lock_is_on" defaultMessage="Caps Lock is on" /></div></div>}
      {!props.demo && !focus() && <div class={styles.messageArea}><div class={styles.messageText}><FormattedMessage id="t_Click_or_press_Enter_" defaultMessage="Click or press Enter to activate..." /></div></div>}
    </div>
  );
}

function setElementCursor(element: HTMLDivElement, cursor: string): void { element.style.cursor = cursor; }
