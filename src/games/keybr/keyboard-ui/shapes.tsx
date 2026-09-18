import type { JSX } from "@solidjs/web";
import { type Keyboard } from "../keyboard/keyboard.ts";
import { type KeyShape } from "../keyboard/keyshape.ts";
import { type MouseProps } from "../widget/components/types.ts";
import { Point } from "../widget/utils/point.ts";
import { Size } from "../widget/utils/size.ts";
import { omit } from 'solid-js';
const margin = 15;
export const keySize = 40;
export const keyGap = 2;
export const getKeyCenter = (shape: KeyShape): Point => {
    return new Point(shape.x * keySize + (shape.w * (keySize - keyGap)) / 2, shape.y * keySize + (shape.h * (keySize - keyGap)) / 2);
};
export const getFrameSize = (keyboard: Keyboard): Size => {
    let cols = 0;
    let rows = 0;
    for (const shape of keyboard.shapes.values()) {
        cols = Math.max(cols, shape.x + shape.w);
        rows = Math.max(rows, shape.y + shape.h);
    }
    return new Size(margin * 2 + cols * keySize - keyGap, margin * 2 + rows * keySize - keyGap);
};
export const Surface = (allProps: {
    children: JSX.Element;
    ref?: (element: SVGSVGElement) => void;
} & MouseProps) => {
    const local = allProps, props = omit(allProps, "children", "ref");
    return (<svg {...props} ref={local.ref} x={margin} y={margin} overflow="visible">
      {local.children}
    </svg>);
};
