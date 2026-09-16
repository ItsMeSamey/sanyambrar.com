import { type LessonKey, type LessonKeys } from "@keybr/lesson";
import { type ClassName } from "@keybr/widget";
import { Key } from "./Key.tsx";
export const KeySet = (solidProps: {
    id?: string;
    className?: ClassName;
    lessonKeys: LessonKeys;
    onKeyHoverIn?: (key: LessonKey, elem: Element) => void;
    onKeyHoverOut?: (key: LessonKey, elem: Element) => void;
    onKeyClick?: (key: LessonKey, elem: Element) => void;
}) => {
    let root!: HTMLElement;
    return (<span ref={el => root = el} id={solidProps.id} class={solidProps.className} onMouseOver={(event) => {
            relayEvent(root, event, solidProps.onKeyHoverIn);
        }} onMouseOut={(event) => {
            relayEvent(root, event, solidProps.onKeyHoverOut);
        }} onClick={(event) => {
            relayEvent(root, event, solidProps.onKeyClick);
        }}>
      {[...solidProps.lessonKeys].map((lessonKey) => (<Key lessonKey={lessonKey}/>))}
    </span>);
};
function relayEvent(root: Element, { target }: {
    target: EventTarget | null;
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
