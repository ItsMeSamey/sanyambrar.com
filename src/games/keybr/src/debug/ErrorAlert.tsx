import type { JSX } from "@solidjs/web";
import { Alert, toast } from "@keybr/widget";

import { ErrorReport } from "./ErrorReport.tsx";
import { formatReport, inspectError } from "./inspect.ts";
export function ErrorAlert(props: {
    readonly title: JSX.Element;
    readonly error: unknown;
}) {
    return (<Alert severity="error" closeButton={true}>
      {props.title}
      <ErrorReport report={formatReport(inspectError(props.error))}/>
    </Alert>);
}
ErrorAlert.toast = (title: JSX.Element, error: unknown) => {
    toast(() => <ErrorAlert title={title} error={error}/>, {
        autoClose: false,
        pauseOnHover: false,
        closeOnClick: false,
    });
};
