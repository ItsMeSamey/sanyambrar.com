import type { JSX } from "@solidjs/web";
import { type Keyboard } from "../keyboard/keyboard.ts";
import { KeyboardContext } from "../keyboard/context.tsx";
import { type ZoomableProps } from "../widget/components/zoomer/Zoomer.types.ts";

import { getFrameSize } from "./shapes.tsx";
import * as styles from "./VirtualKeyboard.module.css";
import { createMemo, omit } from 'solid-js';
export const VirtualKeyboard = function VirtualKeyboard(allProps: {
    readonly children?: JSX.Element;
    readonly keyboard: Keyboard;
    readonly width?: string;
    readonly height?: string;
    readonly moving?: boolean;
} & ZoomableProps): JSX.Element {
    const local = allProps, props = omit(allProps, "children", "keyboard", "width", "height", "moving");
    const keyboard = createMemo(() => local.keyboard);
    const size = createMemo(() => getFrameSize(keyboard()));
    return (<svg {...props} class={styles.keyboard} data-grab-cursor-on-drag="" viewBox={`0 0 ${size().width} ${size().height}`} style={{ "aspect-ratio": `${size().width}/${size().height}` }} width={local.width} height={local.height}>
      <rect class={styles.frame} x={0} y={0} width={size().width} height={size().height} rx={10} ry={10}/>
      <KeyboardContext value={keyboard}>
        {local.children}
      </KeyboardContext>
    </svg>);
};
