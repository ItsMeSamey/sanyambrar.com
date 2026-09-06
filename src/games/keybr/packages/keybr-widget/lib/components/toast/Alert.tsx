import { type ReactNode } from "@keybr/solid-compat/react";
import { type MouseProps } from "../types.ts";
import * as styles from "./Alert.module.css";
import { CloseButton } from "./CloseButton.tsx";
import { toastProps, useToast } from "./context.tsx";
import { SeverityIcon } from "./SeverityIcon.tsx";
import { omit, merge } from 'solid-js';
export function Alert(solidAllProps: {
    readonly children: ReactNode;
    readonly severity?: "info" | "success" | "error" | null;
    readonly closeButton?: boolean;
} & MouseProps): ReactNode {
    const solidMergedProps = merge(solidAllProps, { get severity() { return solidAllProps.severity ?? null; }, get closeButton() { return solidAllProps.closeButton ?? false; } });
    const solidLocal = solidMergedProps, props = omit(solidMergedProps, "children", "severity", "closeButton");
    const toast = useToast();
    return (<div {...props} class={styles.alert} {...toastProps(toast)}>
      {solidLocal.severity && <SeverityIcon severity={solidLocal.severity}/>}
      <div class={styles.message}>{solidLocal.children}</div>
      {solidLocal.closeButton && <CloseButton />}
    </div>);
}
