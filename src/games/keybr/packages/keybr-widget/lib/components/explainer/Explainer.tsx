import type { JSX } from "@solidjs/web";
import { useExplainerState } from "./context.ts";
export function Explainer(solidProps: {
    readonly children?: JSX.Element;
}): JSX.Element {
    const explainerState = useExplainerState();
    return <>{explainerState.explainersVisible && solidProps.children}</>;
}
