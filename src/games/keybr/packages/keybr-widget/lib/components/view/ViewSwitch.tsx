import { createContext, createMemo, createSignal, onCleanup, onMount, useContext, type Accessor, type Component } from "solid-js";
import { Dynamic } from "solid-js/web";

export type ViewName = string;
export type ViewProps = Record<string, any>;
export type ViewMap = { readonly [name: ViewName]: Component<any> };

type BeforeLeave = () => void;

type ViewContextValue = {
  readonly setView: (name: ViewName, props?: ViewProps) => void;
  readonly currentView: Accessor<ViewName>;
  readonly setBeforeLeave: (handler: BeforeLeave) => () => void;
};

export const ViewContext = createContext<ViewContextValue>({
  setView: (name) => {
    if (process.env.NODE_ENV !== "production") console.log(`Switch view to [${name}]`);
  },
  currentView: () => "",
  setBeforeLeave: () => () => {},
});

export function useView<T extends ViewMap>(_views: T) {
  return useContext(ViewContext) as {
    readonly setView: (name: keyof T, props?: ViewProps) => void;
    readonly currentView: Accessor<keyof T>;
    readonly setBeforeLeave: (handler: BeforeLeave) => () => void;
  };
}

export function ViewSwitch(props: { readonly views: ViewMap; readonly header?: () => any }) {
  const first = Object.keys(props.views)[0];
  const readView = (): ViewName => {
    const value = new URL(location.href).searchParams.get("p");
    return value != null && props.views[value] != null ? value : first;
  };
  const [viewState, setViewState] = createSignal<[ViewName, ViewProps]>([readView(), {}], { equals: false });
  const currentView = () => viewState()[0];
  const current = createMemo(() => {
    const [name, viewProps] = viewState();
    const View = props.views[name];
    if (View == null) throw new Error(process.env.NODE_ENV !== "production" ? `Unknown view [${name}]` : undefined);
    return { View, viewProps };
  });

  let beforeLeave: BeforeLeave | null = null;
  const setBeforeLeave = (handler: BeforeLeave) => {
    beforeLeave = handler;
    return () => {
      if (beforeLeave === handler) beforeLeave = null;
    };
  };
  const runBeforeLeave = (nextName: ViewName) => {
    if (nextName === currentView()) return;
    const handler = beforeLeave;
    beforeLeave = null;
    handler?.();
  };

  const commitView = (nextName: ViewName, nextProps: ViewProps, syncUrl: boolean) => {
    runBeforeLeave(nextName);
    if (syncUrl) {
      const url = new URL(location.href);
      if (nextName === first) url.searchParams.delete("p");
      else url.searchParams.set("p", nextName);
      if (url.href !== location.href) history.pushState({...(history.state ?? {}), keybrView: nextName}, "", url);
    }
    setViewState([nextName, nextProps]);
  };
  const swapView = (nextName: ViewName, nextProps: ViewProps = {}, syncUrl = true) => {
    if (props.views[nextName] == null || (nextName === currentView() && Object.keys(nextProps).length === 0)) return;
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
  return <ViewContext.Provider value={{ setView, currentView, setBeforeLeave }}>
    {props.header?.()}
    <Dynamic component={current().View} {...current().viewProps}/>
  </ViewContext.Provider>;
}
