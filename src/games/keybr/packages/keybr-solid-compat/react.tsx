import {
  children as resolveChildren,
  createContext,
  createEffect,
  createMemo,
  createRenderEffect,
  createSignal,
  onCleanup,
  untrack,
  useContext,
  type Component as SolidComponent,
  type JSX,
} from "solid-js";
import { LIVE_ACCESSOR, liveObject } from "./live.ts";

export { createContext, useContext };
export type ReactNode = JSX.Element;
export type ReactElement<P = Record<string, unknown>> = any;
export type ComponentType<P extends Record<string, any> = Record<string, any>> = any;
export type FunctionComponent<P extends Record<string, any> = Record<string, any>> = any;
export type FC<P extends Record<string, any> = Record<string, any>> = any;
export type CSSProperties = any;
export type BaseSyntheticEvent = Event;
export type ElementType<P extends Record<string, any> = Record<string, any>> = any;
export type HTMLAttributes<T extends HTMLElement = HTMLElement> = any;
export type RefObject<T> = { current: T | null };
export type ErrorInfo = { componentStack?: string | null };

export type FocusEventHandler<T extends Element = Element> = (event: any) => void;
export type KeyboardEventHandler<T extends Element = Element> = (event: any) => void;
export type MouseEventHandler<T extends Element = Element> = (event: any) => void;
export type WheelEventHandler<T extends Element = Element> = (event: any) => void;

export function memo<T>(component: T, _compare?: (prev: any, next: any) => boolean): T { return component; }
export function useState<T>(initial: T | (() => T)) {
  return createSignal(typeof initial === "function" ? (initial as () => T)() : initial);
}
export function useMemo<T>(factory: () => T, deps?: (() => readonly unknown[]) | readonly unknown[]): T {
  const value = createMemo(() => {
    if (typeof deps === "function") touchDeps(deps());
    else if (deps != null) touchDeps(deps);
    return factory();
  });
  const initial = untrack(value);
  return (initial != null && typeof initial === "object" ? liveObject(value as any) : initial) as T;
}

function touchDeps(values: readonly unknown[]): void {
  for (const value of values) {
    if (value != null && typeof value === "object") {
      const read = (value as any)[LIVE_ACCESSOR];
      if (typeof read === "function") read();
    }
  }
}
export function useCallback<T extends (...args: any[]) => any>(callback: T, _deps?: unknown): T { return callback; }
export function useRef<T>(initial: T | null = null): RefObject<T> { return { current: initial }; }
export function createRef<T>(): RefObject<T> { return { current: null }; }
export function useImperativeHandle<T>(ref: RefObject<T> | undefined, factory: () => T): void {
  if (ref == null) return;
  createRenderEffect(() => { ref.current = factory(); });
  onCleanup(() => { ref.current = null; });
}
export function useEffect(effect: () => void | (() => void), deps?: (() => readonly unknown[]) | readonly unknown[]): void {
  if (typeof deps === "function") {
    createEffect(() => {
      const values = deps();
      for (const value of values) {
        if (value != null && typeof value === "object") {
          const read = (value as any)[LIVE_ACCESSOR];
          if (typeof read === "function") read();
        }
      }
      const cleanup = untrack(effect);
      if (typeof cleanup === "function") onCleanup(cleanup);
    });
  } else if (deps != null) {
    createEffect(() => {
      const cleanup = effect();
      if (typeof cleanup === "function") onCleanup(cleanup);
    });
  } else {
    createEffect(() => {
      const cleanup = effect();
      if (typeof cleanup === "function") onCleanup(cleanup);
    });
  }
}
export function useLayoutEffect(effect: () => void | (() => void), deps?: (() => readonly unknown[]) | readonly unknown[]): void {
  // React runs layout effects after refs have been attached to the committed DOM.
  // A Solid render effect can run while the component is still constructing its
  // JSX, before refs in the returned tree exist. A normal Solid effect is queued
  // until the render phase has completed, which preserves the ordering that the
  // ported React components rely on while still tracking reactive dependencies.
  createEffect(() => {
    if (typeof deps === "function") touchDeps(deps());
    else if (deps != null) touchDeps(deps);
    const cleanup = untrack(effect);
    if (typeof cleanup === "function") onCleanup(cleanup);
  });
}

export const Children = {
  toArray(value: any): any[] {
    return resolveChildren(() => value as JSX.Element).toArray() as any[];
  },
};

// Solid renders JSX eagerly, so React-style element cloning has no general equivalent.
// Ported call sites that rely on prop replacement are rewritten manually. This fallback
// preserves children for call sites that only use cloning as a transparent wrapper.
export function cloneElement<T>(element: T, _props?: Record<string, unknown>): T { return element; }
export function isValidElement<P = any>(value: unknown): value is ReactElement<P> { return value != null; }

// Kept only as type-level migration aids. All class component call sites are ported to
// functions and these constructors should never be instantiated by the Solid runtime.
export class Component<P = Record<string, unknown>, S = Record<string, unknown>> { props!: P; state!: S; }
export class PureComponent<P = Record<string, unknown>, S = Record<string, unknown>> extends Component<P, S> {}
