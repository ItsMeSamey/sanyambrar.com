import { type LessonKey, type LessonKeys } from "@keybr/lesson";
import { type ClassName } from "@keybr/widget";
import { Key } from "./Key.tsx";
export const KeySet = (props: {
    id?: string;
    className?: ClassName;
    lessonKeys: LessonKeys;
    onKeyHoverIn?: (key: LessonKey, elem: Element) => void;
    onKeyHoverOut?: (key: LessonKey, elem: Element) => void;
    onKeyClick?: (key: LessonKey, elem: Element) => void;
}) => {
    let root!: HTMLElement;
    return (<span ref={el => root = el} id={props.id} class={props.className} onMouseOver={(event) => {
            relayEvent(root, event, props.onKeyHoverIn);
        }} onMouseOut={(event) => {
            relayEvent(root, event, props.onKeyHoverOut);
        }} onClick={(event) => {
            relayEvent(root, event, props.onKeyClick);
        }}>
      {[...props.lessonKeys].map((lessonKey) => (<Key lessonKey={lessonKey}/>))}
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
