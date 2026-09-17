import type { JSX } from "@solidjs/web";
import { CircleAlert, CircleCheck, Info, } from "../../icons.ts";

import { Icon } from "../icon/index.ts";
export function SeverityIcon(props: {
    readonly severity: "info" | "success" | "error" | null;
}): JSX.Element {
    switch (props.severity) {
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
function InfoIcon(): JSX.Element {
    return <Icon shape={Info}/>;
}
function SuccessIcon(): JSX.Element {
    return <Icon shape={CircleCheck}/>;
}
function ErrorIcon(): JSX.Element {
    return <Icon shape={CircleAlert}/>;
}
