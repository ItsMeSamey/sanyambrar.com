import { type ReactNode } from "@keybr/solid-compat/react";
import { type MouseProps } from "../types.ts";
import * as styles from "./Award.module.css";
import { toastProps, useToast } from "./context.tsx";
import { omit } from 'solid-js';
export function Award(solidAllProps: {
    readonly icon: ReactNode;
    readonly children: ReactNode;
} & MouseProps): ReactNode {
    const solidLocal = solidAllProps, props = omit(solidAllProps, "icon", "children");
    const toast = useToast();
    return (<div {...props} class={styles.award} {...toastProps(toast)}>
      <div class={styles.icon}>{solidLocal.icon}</div>
      <div class={styles.message}>{solidLocal.children}</div>
    </div>);
}
