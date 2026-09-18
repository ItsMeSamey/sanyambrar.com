import type { JSX } from "@solidjs/web";
import { CircleAlert, CircleCheck, Info, X } from "../../../../../shared/components/Icons.tsx";
import { type MouseProps } from "../types.ts";
import { IconButton } from "../button/IconButton.tsx";
import { Icon } from "../icon/Icon.tsx";
import styles from "./Alert.module.css";
import { toastProps, useToast } from "./context.tsx";
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
      {local.closeButton && <IconButton icon={<Icon shape={X}/>} onClick={() => toast.close()}/>}
    </div>);
}

function SeverityIcon(props: { readonly severity: "info" | "success" | "error" | null }): JSX.Element {
    switch (props.severity) {
        case "info": return <Icon shape={Info}/>;
        case "success": return <Icon shape={CircleCheck}/>;
        case "error": return <Icon shape={CircleAlert}/>;
        default: return null;
    }
}
