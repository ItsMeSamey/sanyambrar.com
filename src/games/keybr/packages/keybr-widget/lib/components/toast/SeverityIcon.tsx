import { mdiAlertCircleOutline, mdiCheckCircleOutline, mdiInformationOutline, } from "@keybr/solid-compat/mdi";
import { type ReactNode } from "@keybr/solid-compat/react";
import { Icon } from "../icon/index.ts";
export function SeverityIcon({ severity, }: {
    readonly severity: "info" | "success" | "error" | null;
}): ReactNode {
    switch (severity) {
        case "info":
            return <InfoIcon />;
        case "success":
            return <SuccessIcon />;
        case "error":
            return <ErrorIcon />;
        default:
            return null;
    }
}
export function InfoIcon(): ReactNode {
    return <Icon shape={mdiInformationOutline}/>;
}
export function SuccessIcon(): ReactNode {
    return <Icon shape={mdiCheckCircleOutline}/>;
}
export function ErrorIcon(): ReactNode {
    return <Icon shape={mdiAlertCircleOutline}/>;
}
