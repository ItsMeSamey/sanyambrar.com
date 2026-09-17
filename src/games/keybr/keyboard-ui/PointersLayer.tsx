import { createEffect, createSignal } from 'solid-js';
import type { JSX } from "@solidjs/web";
import { type Keyboard } from "../keyboard/keyboard.ts";
import { type KeyCombo } from "../keyboard/keycombo.ts";
import { type KeyShape } from "../keyboard/keyshape.ts";
import { useKeyboard } from "../keyboard/context.tsx";
import { Tasks } from "../lang/tasks.ts";
import { type CodePoint } from "../unicode/types.ts";
import styles from "./PointersLayer.module.css";
import { getKeyCenter, Surface } from "./shapes.tsx";
export const PointersLayer = function PointersLayer(props: {
    readonly suffix: readonly CodePoint[];
    readonly delay?: number;
}): JSX.Element {
    const keyboard = useKeyboard();
    let svg: SVGSVGElement;
    const [combo, setCombo] = createSignal<KeyCombo | null>(null);
    createEffect(() => ({ keyboard: keyboard(), suffix: props.suffix, delay: props.delay ?? 1000 }), ({ keyboard, suffix, delay }) => {
        const tasks = new Tasks();
        setCombo(null);
        if (suffix.length > 0) {
            const next = keyboard.getCombo(suffix[0]);
            if (next != null) tasks.delayed(delay, () => setCombo(next));
        }
        return () => tasks.cancelAll();
    });
    createEffect(combo, () => {
        for (const animate of svg.querySelectorAll("animate")) animate.beginElement();
    });
    return <Surface ref={(element) => svg = element}>{pointers(keyboard(), combo())}</Surface>;
};
function pointers(keyboard: Keyboard, combo: KeyCombo | null): JSX.Element[] {
    const children = [];
    while (combo != null) {
        const shape = keyboard.getShape(combo.id);
        if (shape != null) {
            children.unshift(pointer(shape, styles.pointer));
            if (combo.modifier.shift) {
                const l = keyboard.getShape("ShiftLeft");
                const r = keyboard.getShape("ShiftRight");
                switch (shape.hand) {
                    case "left":
                        children.unshift(pointer(r, styles.modifierPointer));
                        break;
                    case "right":
                        children.unshift(pointer(l, styles.modifierPointer));
                        break;
                    default:
                        children.unshift(pointer(l, styles.modifierPointer), pointer(r, styles.modifierPointer));
                        break;
                }
            }
            if (combo.modifier.alt) {
                const l = keyboard.getShape("AltLeft");
                const r = keyboard.getShape("AltRight");
                switch (shape.hand) {
                    case "left":
                        children.unshift(pointer(r, styles.modifierPointer));
                        break;
                    case "right":
                        children.unshift(pointer(l, styles.modifierPointer));
                        break;
                    default:
                        children.unshift(pointer(l, styles.modifierPointer), pointer(r, styles.modifierPointer));
                        break;
                }
            }
        }
        combo = combo.prefix;
    }
    return children;
}
function pointer(shape: KeyShape | null, className: string): JSX.Element {
    if (shape == null) {
        return null;
    }
    const { x, y } = getKeyCenter(shape);
    const pointerSize = 30;
    return (<circle class={className} cx={x} cy={y} r={pointerSize}>
      <animate attributeName="opacity" from={0} to={1} dur="0.5s" repeatCount={1} restart="always"/>
      <animate attributeName="r" from={0} to={pointerSize} dur="0.5s" repeatCount={1} restart="always"/>
    </circle>);
}
