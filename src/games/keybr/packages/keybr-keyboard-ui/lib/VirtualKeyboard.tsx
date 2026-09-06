import { type Keyboard, KeyboardContext } from "@keybr/keyboard";
import { type ZoomableProps } from "@keybr/widget";
import { memo, type ReactNode } from "@keybr/solid-compat/react";
import { getFrameSize } from "./shapes.tsx";
import * as styles from "./VirtualKeyboard.module.css";
import { omit } from 'solid-js';
export const VirtualKeyboard = memo(function VirtualKeyboard(solidAllProps: {
    readonly children?: ReactNode;
    readonly keyboard: Keyboard;
    readonly width?: string;
    readonly height?: string;
    readonly moving?: boolean;
} & ZoomableProps): ReactNode {
    const solidLocal = solidAllProps, props = omit(solidAllProps, "children", "keyboard", "width", "height", "moving");
    const size = getFrameSize(solidLocal.keyboard);
    return (<svg {...props} class={styles.keyboard} data-grab-cursor-on-drag="" viewBox={`0 0 ${size.width} ${size.height}`} style={{ "aspect-ratio": `${size.width}/${size.height}` }} width={solidLocal.width} height={solidLocal.height}>
      <rect class={styles.frame} x={0} y={0} width={size.width} height={size.height} rx={10} ry={10}/>
      <KeyboardContext value={solidLocal.keyboard}>
        {solidLocal.children}
      </KeyboardContext>
    </svg>);
});
