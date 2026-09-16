import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";

import * as styles from "./Spacer.module.css";
import { type SpacerProps } from "./Spacer.types.ts";
export function Spacer(solidProps: SpacerProps): JSX.Element {
    return (<div class={clsx(styles.root, {
            [styles.size1]: solidProps.size === 1,
            [styles.size2]: solidProps.size === 2,
            [styles.size3]: solidProps.size === 3,
            [styles.size4]: solidProps.size === 4,
            [styles.size5]: solidProps.size === 5,
            [styles.size10]: solidProps.size === 10,
        })}/>);
}
