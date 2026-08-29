import { type LessonKey, type LessonKeys } from "@keybr/lesson";
import { type ClassName } from "@keybr/widget";
import { useRef } from "@keybr/solid-compat/react";
import { Key } from "./Key.tsx";
export const KeySet = (solidProps: {
    id?: string;
    className?: ClassName;
    lessonKeys: LessonKeys;
    onKeyHoverIn?: (key: LessonKey, elem: Element) => void;
    onKeyHoverOut?: (key: LessonKey, elem: Element) => void;
    onKeyClick?: (key: LessonKey, elem: Element) => void;
}) => {
    const ref = useRef<HTMLElement>(null);
    return (<span ref={el => ref.current = el} id={solidProps.id} class={solidProps.className} onMouseOver={(event) => {
            relayEvent(ref.current!, event, solidProps.onKeyHoverIn);
        }} onMouseOut={(event) => {
            relayEvent(ref.current!, event, solidProps.onKeyHoverOut);
        }} onClick={(event) => {
            relayEvent(ref.current!, event, solidProps.onKeyClick);
        }}>
      {[...solidProps.lessonKeys].map((lessonKey) => (<Key lessonKey={lessonKey}/>))}
    </span>);
};
function relayEvent(root: Element, { target }: {
    target: any;
}, handler?: (key: LessonKey, elem: Element) => void) {
    while (handler != null &&
        target instanceof Element &&
        root.contains(target)) {
        const key = Key.attached(target);
        if (key) {
            handler(key, target);
            return;
        }
        target = target.parentElement;
    }
}
