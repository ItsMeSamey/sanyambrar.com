import { createContext, createMemo, createSignal, onCleanup, onMount, useContext, type Component } from "solid-js";
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

export function ViewSwitch(props: { readonly views: ViewMap; readonly header?: () => any }) {
  const first = Object.keys(props.views)[0];
  const readView = (): ViewName => {
    const value = new URL(location.href).searchParams.get("p");
    return value != null && props.views[value] != null ? value : first;
  };
  const [viewState, setViewState] = createSignal<[ViewName, ViewProps]>([readView(), {}], { equals: false });
  const current = createMemo(() => {
    const [name, viewProps] = viewState();
    const View = props.views[name];
    if (View == null) throw new Error(process.env.NODE_ENV !== "production" ? `Unknown view [${name}]` : undefined);
    return { View, viewProps };
  });
  const commitView = (nextName: ViewName, nextProps: ViewProps, syncUrl: boolean) => {
    if (syncUrl) {
      const url = new URL(location.href);
      if (nextName === first) url.searchParams.delete("p");
      else url.searchParams.set("p", nextName);
      if (url.href !== location.href) history.pushState({...(history.state ?? {}), keybrView: nextName}, "", url);
    }
    setViewState([nextName, nextProps]);
  };
  const swapView = (nextName: ViewName, nextProps: ViewProps = {}, syncUrl = true) => {
    if (props.views[nextName] == null) return;
    const commit = () => commitView(nextName, nextProps, syncUrl);
    const root = document.getElementById("app");
    const animate = (globalThis as any).SameyAnimateLocalSwap;
    if (root && animate) void animate(root, commit, nextName === first ? "back" : "forward");
    else commit();
  };
  const setView = (nextName: ViewName, nextProps: ViewProps = {}) => swapView(nextName, nextProps, true);
  const onPopState = () => swapView(readView(), {}, false);
  onMount(() => addEventListener("popstate", onPopState));
  onCleanup(() => removeEventListener("popstate", onPopState));
  return <ViewContext.Provider value={{ setView }}>
    {props.header?.()}
    <Dynamic component={current().View} {...current().viewProps}/>
  </ViewContext.Provider>;
}
