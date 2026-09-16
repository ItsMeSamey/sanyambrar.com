import { createSignal } from 'solid-js';
import type { JSX } from "@solidjs/web";

import { ExplainerStateContext } from "./context.ts";
export function ExplainerBoundary(solidProps: {
    readonly defaultVisible?: boolean;
    readonly children: JSX.Element;
}): JSX.Element {
    const [explainersVisible, setExplainersVisible] = createSignal((solidProps.defaultVisible === undefined ? true : solidProps.defaultVisible));
    return (<ExplainerStateContext value={{
            get explainersVisible() { return explainersVisible(); },
            toggleExplainers: (v) => {
                setExplainersVisible(v ?? !explainersVisible());
            },
        }}>
      {solidProps.children}
    </ExplainerStateContext>);
}
