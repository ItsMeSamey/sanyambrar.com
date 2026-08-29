import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode } from "@keybr/solid-compat/react";
import { type FloatingPosition } from "../../floating/index.ts";
import * as styles from "./Slide.module.css";
import { splitProps } from "solid-js";
export type SlideProps = {
    readonly anchor?: string;
    readonly children?: ReactNode;
    readonly className?: string;
    readonly position?: FloatingPosition;
    readonly size?: "small" | "large";
};
export function Slide(solidAllProps: SlideProps): ReactNode {
    const [solidLocal, props] = splitProps(solidAllProps, ["anchor", "children", "className", "position", "size"]);
    return (<div {...props} data-tour-anchor={solidLocal.anchor ?? ""} data-tour-position={solidLocal.position ?? ""} class={clsx(styles.root, solidLocal.size === "small" && styles.small, solidLocal.size === "large" && styles.large, solidLocal.className)}>
      {solidLocal.children}
    </div>);
}
