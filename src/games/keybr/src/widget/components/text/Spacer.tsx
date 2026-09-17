import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";

import styles from "./Spacer.module.css";
import { type SpacerProps } from "./Spacer.types.ts";
export function Spacer(props: SpacerProps): JSX.Element {
    return (<div class={clsx(styles.root, {
            [styles.size1]: props.size === 1,
            [styles.size2]: props.size === 2,
            [styles.size3]: props.size === 3,
            [styles.size4]: props.size === 4,
            [styles.size5]: props.size === 5,
            [styles.size10]: props.size === 10,
        })}/>);
}
