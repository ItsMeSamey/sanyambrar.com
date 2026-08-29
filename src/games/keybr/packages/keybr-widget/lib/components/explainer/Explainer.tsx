import { type ReactNode } from "@keybr/solid-compat/react";
import { useExplainerState } from "./context.ts";
export function Explainer(solidProps: {
    readonly children?: ReactNode;
}): ReactNode {
    const explainerState = useExplainerState();
    return <>{explainerState.explainersVisible && solidProps.children}</>;
}
