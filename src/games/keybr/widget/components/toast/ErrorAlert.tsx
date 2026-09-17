import { Alert } from "./Alert.tsx";
import { toast } from "./Toaster.tsx";
export function ErrorAlert(props: {
    readonly error: unknown;
}) {
    return (<Alert severity="error">
      {props.error instanceof AggregateError ? (props.error.errors.map((child) => <p>{String(child)}</p>)) : (<p>{String(props.error)}</p>)}
    </Alert>);
}
ErrorAlert.report = (error: unknown) => {
    toast(() => <ErrorAlert error={error}/>);
};
