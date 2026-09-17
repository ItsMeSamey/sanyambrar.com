import type { JSX } from "@solidjs/web";
import { type MouseProps } from "../types.ts";
import * as styles from "./Alert.module.css";
import { CloseButton } from "./CloseButton.tsx";
import { toastProps, useToast } from "./context.tsx";
import { SeverityIcon } from "./SeverityIcon.tsx";
import { omit, merge } from 'solid-js';
export function Alert(allProps: {
    readonly children: JSX.Element;
    readonly severity?: "info" | "success" | "error" | null;
    readonly closeButton?: boolean;
} & MouseProps): JSX.Element {
    const mergedProps = merge(allProps, { get severity() { return allProps.severity ?? null; }, get closeButton() { return allProps.closeButton ?? false; } });
    const local = mergedProps, props = omit(mergedProps, "children", "severity", "closeButton");
    const toast = useToast();
    return (<div {...props} class={styles.alert} {...toastProps(toast)}>
      {local.severity && <SeverityIcon severity={local.severity}/>}
      <div class={styles.message}>{local.children}</div>
      {local.closeButton && <CloseButton />}
    </div>);
}
