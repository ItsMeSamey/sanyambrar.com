import { createContext, createMemo, createSignal, useContext, type Component } from "solid-js";
import { Dynamic } from "solid-js/web";

export type ViewName = string;
export type ViewProps = Record<string, any>;
export type ViewMap = { readonly [name: ViewName]: Component<any> };

export const ViewContext = createContext<{
  readonly setView: (name: ViewName, props?: ViewProps) => void;
}>({
  setView: (name) => {
    if (process.env.NODE_ENV !== "production") console.log(`Switch view to [${name}]`);
  },
});

export function useView<T extends ViewMap>(_views: T) {
  return useContext(ViewContext) as { readonly setView: (name: keyof T, props?: ViewProps) => void };
}

export function ViewSwitch(props: { readonly views: ViewMap }) {
  const first = Object.keys(props.views)[0];
  const [viewState, setViewState] = createSignal<[ViewName, ViewProps]>([first, {}], { equals: false });
  const current = createMemo(() => {
    const [name, viewProps] = viewState();
    const View = props.views[name];
    if (View == null) throw new Error(process.env.NODE_ENV !== "production" ? `Unknown view [${name}]` : undefined);
    return { View, viewProps };
  });
  const setView = (nextName: ViewName, nextProps: ViewProps = {}) => {
    const commit = () => setViewState([nextName, nextProps]);
    const root = document.getElementById("app");
    const animate = (globalThis as any).SameyAnimateLocalSwap;
    if (root && animate) void animate(root, commit, nextName === "practice" ? "back" : "forward");
    else commit();
  };
  return <ViewContext.Provider value={{ setView }}>
    <Dynamic component={current().View} {...current().viewProps}/>
  </ViewContext.Provider>;
}
