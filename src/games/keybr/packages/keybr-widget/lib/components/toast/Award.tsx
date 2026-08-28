import { type ReactNode } from "@keybr/solid-compat/react";
import { type MouseProps } from "../types.ts";
import * as styles from "./Award.module.css";
import { toastProps, useToast } from "./context.tsx";
export function Award({ icon, children, ...props }: {
    readonly icon: ReactNode;
    readonly children: ReactNode;
} & MouseProps): ReactNode {
    const toast = useToast();
    return (<div {...props} class={styles.award} {...toastProps(toast)}>
      <div class={styles.icon}>{icon}</div>
      <div class={styles.message}>{children}</div>
    </div>);
}
