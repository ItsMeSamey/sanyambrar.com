import { type ReactNode, useState } from "@keybr/solid-compat/react";
import { ExplainerStateContext } from "./context.ts";
export function ExplainerBoundary({ defaultVisible = true, children, }: {
    readonly defaultVisible?: boolean;
    readonly children: ReactNode;
}): ReactNode {
    const [explainersVisible, setExplainersVisible] = useState(defaultVisible);
    return (<ExplainerStateContext.Provider value={{
            get explainersVisible() { return explainersVisible(); },
            toggleExplainers: (v) => {
                setExplainersVisible(v ?? !explainersVisible());
            },
        }}>
      {children}
    </ExplainerStateContext.Provider>);
}
