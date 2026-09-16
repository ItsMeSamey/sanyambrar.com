import { CircleAlert, CircleCheck, Info, } from "../../icons.ts";
import { type ReactNode } from "@keybr/solid-compat/react";
import { Icon } from "../icon/index.ts";
export function SeverityIcon(solidProps: {
    readonly severity: "info" | "success" | "error" | null;
}): ReactNode {
    switch (solidProps.severity) {
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
    return <Icon shape={Info}/>;
}
export function SuccessIcon(): ReactNode {
    return <Icon shape={CircleCheck}/>;
}
export function ErrorIcon(): ReactNode {
    return <Icon shape={CircleAlert}/>;
}
