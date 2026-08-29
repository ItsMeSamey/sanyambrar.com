import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode } from "@keybr/solid-compat/react";
import * as styles from "./Spacer.module.css";
import { type SpacerProps } from "./Spacer.types.ts";
export function Spacer(solidProps: SpacerProps): ReactNode {
    return (<div class={clsx(styles.root, {
            [styles.size1]: solidProps.size === 1,
            [styles.size2]: solidProps.size === 2,
            [styles.size3]: solidProps.size === 3,
            [styles.size4]: solidProps.size === 4,
            [styles.size5]: solidProps.size === 5,
            [styles.size10]: solidProps.size === 10,
        })}/>);
}
