import type { JSX } from "@solidjs/web";
import { type Focusable } from "@keybr/widget";
import { type RefObject, useEffect, useImperativeHandle, useRef } from "@keybr/solid-compat/react";
import { type Callbacks, InputHandler } from "./inputhandler.ts";
export const TextEvents = function TextEvents(solidProps: Callbacks & {
    readonly focusRef?: RefObject<Focusable | null>;
}): JSX.Element {
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const handler = useInputHandler();
    useImperativeHandle(solidProps.focusRef, () => handler);
    useEffect(() => {
        handler.setInput(inputRef.current);
        return () => {
            handler.setInput(null);
        };
    }, () => [handler]);
    handler.setCallbacks({ onFocus: solidProps.onFocus, onBlur: solidProps.onBlur, onKeyDown: solidProps.onKeyDown, onKeyUp: solidProps.onKeyUp, onInput: solidProps.onInput });
    return (<div style={divStyle}>
      <textarea ref={el => inputRef.current = el} autocapitalize="off" autocorrect="off" spellcheck={false} style={inputStyle}/>
    </div>);
};
function useInputHandler() {
    const handlerRef = useRef<InputHandler | null>(null);
    let handler = handlerRef.current;
    if (handler == null) {
        handlerRef.current = handler = new InputHandler();
    }
    return handler;
}
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
