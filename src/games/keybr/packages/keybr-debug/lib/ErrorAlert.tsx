import { Alert, toast } from "@keybr/widget";
import { type ReactNode } from "@keybr/solid-compat/react";
import { ErrorReport } from "./ErrorReport.tsx";
import { formatReport, inspectError } from "./inspect.ts";
export function ErrorAlert(solidProps: {
    readonly title: ReactNode;
    readonly error: unknown;
}) {
    return (<Alert severity="error" closeButton={true}>
      {solidProps.title}
      <ErrorReport report={formatReport(inspectError(solidProps.error))}/>
    </Alert>);
}
ErrorAlert.toast = (title: ReactNode, error: unknown) => {
    toast(() => <ErrorAlert title={title} error={error}/>, {
        autoClose: false,
        pauseOnHover: false,
        closeOnClick: false,
    });
};
