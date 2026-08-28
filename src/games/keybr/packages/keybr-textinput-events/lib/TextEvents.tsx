import { type Focusable } from "@keybr/widget";
import { type CSSProperties, memo, type ReactNode, type RefObject, useEffect, useImperativeHandle, useRef, } from "@keybr/solid-compat/react";
import { type Callbacks, InputHandler } from "./inputhandler.ts";
export const TextEvents = memo(function TextEvents({ onFocus, onBlur, onKeyDown, onKeyUp, onInput, focusRef, }: Callbacks & {
    readonly focusRef?: RefObject<Focusable | null>;
}): ReactNode {
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const handler = useInputHandler();
    useImperativeHandle(focusRef, () => handler);
    useEffect(() => {
        handler.setInput(inputRef.current);
        return () => {
            handler.setInput(null);
        };
    }, () => [handler]);
    handler.setCallbacks({ onFocus, onBlur, onKeyDown, onKeyUp, onInput });
    return (<div style={divStyle as any}>
      <textarea ref={el => inputRef.current = el} autoCapitalize="off" autocorrect="off" spellcheck={false} style={inputStyle as any}/>
    </div>);
});
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
} satisfies CSSProperties;
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
} satisfies CSSProperties;
