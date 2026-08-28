import { type ReactNode } from "@keybr/solid-compat/react";
import { type MouseProps } from "../types.ts";
import * as styles from "./Alert.module.css";
import { CloseButton } from "./CloseButton.tsx";
import { toastProps, useToast } from "./context.tsx";
import { SeverityIcon } from "./SeverityIcon.tsx";
export function Alert({ children, severity = null, closeButton = false, ...props }: {
    readonly children: ReactNode;
    readonly severity?: "info" | "success" | "error" | null;
    readonly closeButton?: boolean;
} & MouseProps): ReactNode {
    const toast = useToast();
    return (<div {...props} class={styles.alert} {...toastProps(toast)}>
      {severity && <SeverityIcon severity={severity}/>}
      <div class={styles.message}>{children}</div>
      {closeButton && <CloseButton />}
    </div>);
}
