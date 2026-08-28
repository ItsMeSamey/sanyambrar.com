import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode } from "@keybr/solid-compat/react";
import { type FloatingPosition } from "../../floating/index.ts";
import * as styles from "./Slide.module.css";
export type SlideProps = {
    readonly anchor?: string;
    readonly children?: ReactNode;
    readonly className?: string;
    readonly position?: FloatingPosition;
    readonly size?: "small" | "large";
};
export function Slide({ anchor, children, className, position, size, ...props }: SlideProps): ReactNode {
    return (<div {...props} class={clsx(styles.root, size === "small" && styles.small, size === "large" && styles.large, className)}>
      {children}
    </div>);
}
