import type { JSX } from "@solidjs/web";
import { CircleAlert, CircleCheck, Info, } from "../../icons.ts";

import { Icon } from "../icon/index.ts";
export function SeverityIcon(solidProps: {
    readonly severity: "info" | "success" | "error" | null;
}): JSX.Element {
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
export function InfoIcon(): JSX.Element {
    return <Icon shape={Info}/>;
}
export function SuccessIcon(): JSX.Element {
    return <Icon shape={CircleCheck}/>;
}
export function ErrorIcon(): JSX.Element {
    return <Icon shape={CircleAlert}/>;
}
