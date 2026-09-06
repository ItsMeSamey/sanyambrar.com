import {
  CaretMovementStyle,
  CaretShapeStyle,
  type TextDisplaySettings,
} from "@keybr/textinput";
import { createEffect, onCleanup } from 'solid-js';
import { type JSX } from '@solidjs/web';
import { findCursor } from "./chars.tsx";

export function Cursor(props: {
  readonly settings: TextDisplaySettings;
  readonly children: JSX.Element;
}): JSX.Element {
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

  const applyShapeStyle = (shape: CaretShapeStyle) => {
    const style = cursor.style;
    style.color = "";
    style.backgroundColor = "";
    style.borderStyle = "";
    style.borderColor = "";
    switch (shape) {
      case CaretShapeStyle.Block:
        style.color = "var(--textinput-cursor__color)";
        style.backgroundColor = "var(--textinput-cursor__background-color)";
        break;
      case CaretShapeStyle.Box:
        style.borderStyle = "solid";
        style.borderColor = "var(--textinput-cursor__background-color)";
        break;
      case CaretShapeStyle.Line:
      case CaretShapeStyle.Underline:
        style.backgroundColor = "var(--textinput-cursor__background-color)";
        break;
    }
  };

  const move = (char: HTMLElement) => {
    const {
      caretShapeStyle,
      caretMovementStyle,
      language: { direction },
    } = props.settings;
    const style = cursor.style;
    const from = getComputedStyle(char);
    style.fontFamily = from.fontFamily;
    style.fontSize = from.fontSize;
    style.fontStyle = from.fontStyle;
    style.fontWeight = from.fontWeight;
    style.fontVariant = from.fontVariant;
    style.fontKerning = from.fontKerning;
    style.lineHeight = from.lineHeight;
    applyShapeStyle(caretShapeStyle);

    const x = char.offsetLeft;
    const y = char.parentElement!.offsetTop;
    const width = char.offsetWidth;
    const height = char.parentElement!.offsetHeight;
    let left = x;
    let top = y;

    switch (caretShapeStyle) {
      case CaretShapeStyle.Block:
        cursor.textContent = char.textContent;
        style.display = "block";
        style.borderWidth = style.width = style.height = "";
        break;
      case CaretShapeStyle.Box:
        cursor.textContent = "";
        style.display = "block";
        style.borderWidth = "1px";
        style.width = `${width + 4}px`;
        style.height = `${height + 4}px`;
        left = x - 2;
        top = y - 2;
        break;
      case CaretShapeStyle.Line:
        cursor.textContent = "";
        style.display = "block";
        style.borderWidth = "";
        style.width = "2px";
        style.height = `${height}px`;
        left = direction === "ltr" ? x - 2 : x + width;
        break;
      case CaretShapeStyle.Underline:
        cursor.textContent = "";
        style.display = "block";
        style.borderWidth = "";
        style.width = `${width}px`;
        style.height = "2px";
        top = y + height - 2;
        break;
    }

    const fromLeft = cursor.offsetLeft;
    const fromTop = cursor.offsetTop;
    style.left = `${left}px`;
    style.top = `${top}px`;
    animation?.cancel();
    animation = null;

    if (!initial && caretMovementStyle === CaretMovementStyle.Smooth) {
      // The logical caret lands immediately; only its visual delta is animated.
      // Animating transform stays on the compositor and keeps the smooth mode
      // responsive instead of making every keystroke wait on left/top layout.
      animation = cursor.animate(
        [
          { transform: `translate3d(${fromLeft - left}px,${fromTop - top}px,0)` },
          { transform: "translate3d(0,0,0)" },
        ],
        {
          duration: 48,
          iterations: 1,
          easing: "cubic-bezier(.16,1,.3,1)",
        },
      );
      const clear = () => {
        animation = null;
      };
      animation.onfinish = clear;
      animation.oncancel = clear;
      animation.onremove = clear;
    }
    initial = false;
  };

  const position = () => {
    const char = findCursor(container);
    if (char != null) move(char);
    else hide();
  };

  createEffect(() => [
    props.settings.caretShapeStyle,
    props.settings.caretMovementStyle,
    props.settings.language.direction,
    props.children,
  ], () => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) position(); });
    return () => { cancelled = true; };
  });

  onCleanup(() => animation?.cancel());

  return (
    <div ref={container} style={{ display: "block", position: "relative" }}>
      <span
        ref={cursor}
        data-keybr-cursor=""
        style={{
          display: "block",
          position: "absolute",
          left: "0",
          top: "0",
          width: "0",
          height: "0",
          "pointer-events": "none",
          "will-change": "transform",
        }}
      />
      {props.children}
    </div>
  );
}
