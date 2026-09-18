import { type Keyboard } from "../keyboard/keyboard.ts";
import { type KeyId } from "../keyboard/types.ts";
import { useKeyboard } from "../keyboard/context.tsx";
import { createMemo } from "solid-js";
import { makeKeyComponent } from "./Key.tsx";
import { Surface } from "./shapes.tsx";
export const KeyLayer = function KeyLayer(props: {
    readonly depressedKeys?: readonly KeyId[];
    readonly showColors?: boolean;
    readonly onKeyHoverIn?: (key: KeyId, elem: Element) => void;
    readonly onKeyHoverOut?: (key: KeyId, elem: Element) => void;
    readonly onKeyClick?: (key: KeyId, elem: Element) => void;
}) {
    const keyboard = useKeyboard();
    let svg: SVGSVGElement;
    const keys = createMemo(() => getKeyElements(keyboard()));
    return (<Surface ref={(element) => svg = element} onMouseOver={(event) => {
            relayEvent(svg, event, props.onKeyHoverIn);
        }} onMouseOut={(event) => {
            relayEvent(svg, event, props.onKeyHoverOut);
        }} onClick={(event) => {
            relayEvent(svg, event, props.onKeyClick);
        }}>
      {keys().map(({ shape, Component }) => (<Component depressed={(props.depressedKeys ?? []).includes(shape.id)} showColors={props.showColors ?? false}/>))}
    </Surface>);
};
function relayEvent(root: Element, { target }: {
    readonly target: EventTarget | null;
}, handler?: (key: KeyId, elem: Element) => void) {
    while (handler != null && target instanceof Element && root.contains(target)) {
        const key = (target as SVGElement).dataset["key"];
        if (key) {
            handler(key, target);
            return;
        }
        target = target.parentElement;
    }
}
function getKeyElements(keyboard: Keyboard) {
    return [...keyboard.shapes.values()].map((shape) => ({
        shape,
        Component: makeKeyComponent(keyboard.layout.language, shape),
    }));
}
