import { createSignal } from 'solid-js';
import type { JSX } from "@solidjs/web";

import { ExplainerStateContext } from "./context.ts";
export function ExplainerBoundary(props: {
    readonly defaultVisible?: boolean;
    readonly children: JSX.Element;
}): JSX.Element {
    const [explainersVisible, setExplainersVisible] = createSignal((props.defaultVisible === undefined ? true : props.defaultVisible));
    return (<ExplainerStateContext value={{
            get explainersVisible() { return explainersVisible(); },
            toggleExplainers: (v) => {
                setExplainersVisible(v ?? !explainersVisible());
            },
        }}>
      {props.children}
    </ExplainerStateContext>);
}
