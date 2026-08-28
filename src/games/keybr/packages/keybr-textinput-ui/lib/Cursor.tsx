import { CaretMovementStyle, CaretShapeStyle, type TextDisplaySettings } from "@keybr/textinput";
import { createEffect, onCleanup, type JSX } from "solid-js";
import { findCursor } from "./chars.tsx";
import { getCursorStyle } from "./styles.ts";

export function Cursor(props: { readonly settings: TextDisplaySettings; readonly children: JSX.Element }): JSX.Element {
  let container!: HTMLDivElement;
  let cursor!: HTMLSpanElement;
  let initial = true;
  let animation: Animation | null = null;

  const hide = () => {
    const style = cursor.style;
    cursor.textContent = "";
    style.display = "none";
    style.left = style.top = style.width = style.height = "";
    initial = true;
  };
  const move = (char: HTMLElement) => {
    const { caretShapeStyle, caretMovementStyle, language: { direction } } = props.settings;
    const style = cursor.style;
    const from = getComputedStyle(char);
    style.fontFamily = from.fontFamily;
    style.fontSize = from.fontSize;
    style.fontStyle = from.fontStyle;
    style.fontWeight = from.fontWeight;
    style.fontVariant = from.fontVariant;
    style.fontKerning = from.fontKerning;
    style.lineHeight = from.lineHeight;
    const x = char.offsetLeft, y = char.parentElement!.offsetTop, w = char.offsetWidth, h = char.parentElement!.offsetHeight;
    let left = x, top = y;
    switch (caretShapeStyle) {
      case CaretShapeStyle.Block:
        cursor.textContent = char.textContent; style.display = "block"; style.borderWidth = style.width = style.height = ""; break;
      case CaretShapeStyle.Box:
        cursor.textContent = ""; style.display = "block"; style.borderWidth = "1px"; style.width = `${w + 4}px`; style.height = `${h + 4}px`; left = x - 2; top = y - 2; break;
      case CaretShapeStyle.Line:
        cursor.textContent = ""; style.display = "block"; style.borderWidth = ""; style.width = "2px"; style.height = `${h}px`; left = direction === "ltr" ? x - 2 : x + w; break;
      case CaretShapeStyle.Underline:
        cursor.textContent = ""; style.display = "block"; style.borderWidth = ""; style.width = `${w}px`; style.height = "2px"; top = y + h - 2; break;
    }
    const fromLeft = cursor.offsetLeft, fromTop = cursor.offsetTop;
    style.left = `${left}px`; style.top = `${top}px`;
    animation?.cancel(); animation = null;
    if (!initial && caretMovementStyle === CaretMovementStyle.Smooth) {
      animation = cursor.animate([{ left: `${fromLeft}px`, top: `${fromTop}px` }, { left: `${left}px`, top: `${top}px` }], { duration: wpmToDuration(120), iterations: 1, easing: "linear" });
      const clear = () => { animation = null; };
      animation.onfinish = clear; animation.oncancel = clear; animation.onremove = clear;
    }
    initial = false;
  };
  const position = () => {
    const char = findCursor(container);
    if (char != null) move(char); else hide();
  };
  createEffect(() => {
    props.settings;
    props.children;
    queueMicrotask(position);
  });
  onCleanup(() => animation?.cancel());

  return (
    <div ref={container} style={{ display: "block", position: "relative" }}>
      <span ref={cursor} style={{ display: "block", position: "absolute", left: "0", top: "0", width: "0", height: "0", ...getCursorStyle(props.settings.caretShapeStyle) }} />
      {props.children}
    </div>
  );
}

function wpmToDuration(wpm: number): number { return Math.round(1000 / ((wpm * 5) / 60)); }
