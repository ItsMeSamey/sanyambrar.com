import { Alert } from "./Alert.tsx";
import { toast } from "./Toaster.tsx";
export function ErrorAlert(solidProps: {
    readonly error: unknown;
}) {
    return (<Alert severity="error">
      {solidProps.error instanceof AggregateError ? (solidProps.error.errors.map((child, index) => <p>{String(child)}</p>)) : (<p>{String(solidProps.error)}</p>)}
    </Alert>);
}
ErrorAlert.report = (error: unknown) => {
    toast(() => <ErrorAlert error={error}/>);
};
