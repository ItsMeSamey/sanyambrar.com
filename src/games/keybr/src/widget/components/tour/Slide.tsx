import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";

import { type FloatingPosition } from "../../floating/types.ts";
import styles from "./Slide.module.css";
import { omit } from 'solid-js';
export type SlideProps = {
    readonly anchor?: string;
    readonly children?: JSX.Element;
    readonly className?: string;
    readonly position?: FloatingPosition;
    readonly size?: "small" | "large";
};
export function Slide(allProps: SlideProps): JSX.Element {
    const local = allProps, props = omit(allProps, "anchor", "children", "className", "position", "size");
    return (<div {...props} data-tour-anchor={local.anchor ?? ""} data-tour-position={local.position ?? ""} class={clsx(styles.root, local.size === "small" && styles.small, local.size === "large" && styles.large, local.className)}>
      {local.children}
    </div>);
}
