import type { JSX } from "@solidjs/web";
import { type MouseProps } from "../types.ts";
import * as styles from "./Award.module.css";
import { toastProps, useToast } from "./context.tsx";
import { omit } from 'solid-js';
export function Award(solidAllProps: {
    readonly icon: JSX.Element;
    readonly children: JSX.Element;
} & MouseProps): JSX.Element {
    const solidLocal = solidAllProps, props = omit(solidAllProps, "icon", "children");
    const toast = useToast();
    return (<div {...props} class={styles.award} {...toastProps(toast)}>
      <div class={styles.icon}>{solidLocal.icon}</div>
      <div class={styles.message}>{solidLocal.children}</div>
    </div>);
}
