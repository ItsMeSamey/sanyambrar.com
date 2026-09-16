import type { JSX } from "@solidjs/web";
import { type MouseProps } from "../types.ts";
import * as styles from "./Award.module.css";
import { toastProps, useToast } from "./context.tsx";
import { omit } from 'solid-js';
export function Award(allProps: {
    readonly icon: JSX.Element;
    readonly children: JSX.Element;
} & MouseProps): JSX.Element {
    const local = allProps, props = omit(allProps, "icon", "children");
    const toast = useToast();
    return (<div {...props} class={styles.award} {...toastProps(toast)}>
      <div class={styles.icon}>{local.icon}</div>
      <div class={styles.message}>{local.children}</div>
    </div>);
}
