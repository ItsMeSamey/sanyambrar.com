import type { JSX } from "@solidjs/web";
import { type Focusable } from "../widget/components/types.ts";
import { createEffect, onSettled } from "solid-js";
import { type Callbacks, InputHandler } from "./inputhandler.ts";
export const TextEvents = function TextEvents(props: Callbacks & {
    readonly focusRef?: (focusable: Focusable | null) => void;
}): JSX.Element {
    const handler = new InputHandler();
    let input: HTMLTextAreaElement | undefined;
    createEffect(() => ({
        onFocus: props.onFocus,
        onBlur: props.onBlur,
        onKeyDown: props.onKeyDown,
        onKeyUp: props.onKeyUp,
        onInput: props.onInput,
    }), (callbacks) => handler.setCallbacks(callbacks));
    onSettled(() => {
        handler.setInput(input ?? null);
        props.focusRef?.(handler);
        return () => {
            props.focusRef?.(null);
            handler.setInput(null);
        };
    });
    return (<div style={divStyle}>
      <textarea ref={el => input = el} aria-label="Typing input" autocapitalize="off" autocorrect="off" spellcheck={false} style={inputStyle}/>
    </div>);
};
const divStyle = {
    position: "absolute",
    "inset-inline-start": "0px",
    "inset-block-start": "0px",
    "inline-size": "0px",
    "block-size": "0px",
    overflow: "hidden",
} satisfies JSX.CSSProperties;
const inputStyle = {
    display: "block",
    margin: "0px",
    padding: "0px",
    "inline-size": "1px",
    "block-size": "1px",
    border: "none",
    "border-radius": "0px",
    outline: "none",
    background: "transparent",
    color: "transparent",
    "caret-color": "transparent",
    opacity: 0,
    resize: "none",
    "pointer-events": "none",
} satisfies JSX.CSSProperties;
