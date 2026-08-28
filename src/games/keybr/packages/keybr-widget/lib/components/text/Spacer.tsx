import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode } from "@keybr/solid-compat/react";
import * as styles from "./Spacer.module.css";
import { type SpacerProps } from "./Spacer.types.ts";
export function Spacer({ size }: SpacerProps): ReactNode {
    return (<div class={clsx(styles.root, {
            [styles.size1]: size === 1,
            [styles.size2]: size === 2,
            [styles.size3]: size === 3,
            [styles.size4]: size === 4,
            [styles.size5]: size === 5,
            [styles.size10]: size === 10,
        })}/>);
}
