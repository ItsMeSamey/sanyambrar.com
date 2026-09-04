import { createContext, createMemo, createSignal, onCleanup, onMount, useContext, type Accessor, type Component, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";

export type ViewName = string;
export type ViewMap = { readonly [name: ViewName]: Component };

type BeforeLeave = () => void;

type ViewContextValue = {
  readonly setView: (name: ViewName) => void;
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
    readonly setView: (name: keyof T) => void;
    readonly currentView: Accessor<keyof T>;
    readonly setBeforeLeave: (handler: BeforeLeave) => () => void;
  };
}

export function ViewSwitch(props: { readonly views: ViewMap; readonly header?: () => JSX.Element }) {
  const first = Object.keys(props.views)[0];
  const readView = (): ViewName => {
    const value = new URL(location.href).searchParams.get("p");
    return value != null && props.views[value] != null ? value : first;
  };
  const [currentView, setCurrentView] = createSignal<ViewName>(readView());
  let viewHistoryIndex = typeof history.state?.keybrViewIndex === "number" ? history.state.keybrViewIndex : 0;
  const current = createMemo(() => {
    const name = currentView();
    const View = props.views[name];
    if (View == null) throw new Error(process.env.NODE_ENV !== "production" ? `Unknown view [${name}]` : undefined);
    return View;
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

  const commitView = (nextName: ViewName, syncUrl: boolean) => {
    runBeforeLeave(nextName);
    if (syncUrl) {
      const url = new URL(location.href);
      if (nextName === first) url.searchParams.delete("p");
      else url.searchParams.set("p", nextName);
      if (url.href !== location.href) {
        viewHistoryIndex += 1;
        history.pushState({...(history.state ?? {}), keybrView: nextName, keybrViewIndex: viewHistoryIndex}, "", url);
      }
    }
    setCurrentView(nextName);
  };
  const swapView = (nextName: ViewName, syncUrl = true, requestedDirection?: "forward" | "back") => {
    if (props.views[nextName] == null || nextName === currentView()) return;
    const commit = () => commitView(nextName, syncUrl);
    const root = document.getElementById("app");
    const animate = globalThis.SameyAnimateLocalSwap;
    const direction = requestedDirection ?? (nextName === first ? "back" : "forward");
    if (root && animate) void animate(root, commit, direction);
    else commit();
  };
  const setView = (nextName: ViewName) => swapView(nextName, true);
  const onPopState = () => {
    const nextIndex = typeof history.state?.keybrViewIndex === "number" ? history.state.keybrViewIndex : null;
    const direction = nextIndex != null && nextIndex < viewHistoryIndex ? "back" : "forward";
    if (nextIndex != null) viewHistoryIndex = nextIndex;
    swapView(readView(), false, direction);
  };
  onMount(() => {
    if (typeof history.state?.keybrViewIndex !== "number")
      history.replaceState({...(history.state ?? {}), keybrView: currentView(), keybrViewIndex: viewHistoryIndex}, "", location.href);
    addEventListener("popstate", onPopState);
  });
  onCleanup(() => removeEventListener("popstate", onPopState));
  return <ViewContext.Provider value={{ setView, currentView, setBeforeLeave }}>
    {props.header?.()}
    <Dynamic component={current()}/>
  </ViewContext.Provider>;
}
