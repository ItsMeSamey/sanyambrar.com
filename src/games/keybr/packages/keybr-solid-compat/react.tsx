import { children as resolveChildren, createContext, createEffect, createTrackedEffect, onSettled, createMemo, createSignal, untrack, useContext } from 'solid-js';
import { type JSX, type ValidComponent } from '@solidjs/web';
import { liveObject, touchLive } from "./live.ts";

export { createContext, useContext };
export type ReactNode = JSX.Element;
export type ReactElement<_P = Record<string, unknown>> = JSX.Element;
export type ComponentType<P = Record<string, unknown>> = (props: P) => JSX.Element;
export type FunctionComponent<P = Record<string, unknown>> = (props: P) => JSX.Element;
export type FC<P = Record<string, unknown>> = (props: P) => JSX.Element;
export type CSSProperties = JSX.CSSProperties;
export type BaseSyntheticEvent = Event;
export type ElementType<_P = unknown> = ValidComponent;
export type HTMLAttributes<T extends HTMLElement = HTMLElement> = JSX.HTMLAttributes<T>;
export type RefObject<T> = { current: T | null };
export type ErrorInfo = { componentStack?: string | null };

export type FocusEventHandler<T extends Element = Element> = (event: FocusEvent & { currentTarget: T }) => void;
export type KeyboardEventHandler<T extends Element = Element> = (event: KeyboardEvent & { currentTarget: T }) => void;
export type MouseEventHandler<T extends Element = Element> = (event: MouseEvent & { currentTarget: T }) => void;
export type WheelEventHandler<T extends Element = Element> = (event: WheelEvent & { currentTarget: T }) => void;

type PropsOf<T> = T extends (props: infer P) => unknown ? P : never;
export function memo<T>(component: T, _compare?: (prev: PropsOf<T>, next: PropsOf<T>) => boolean): T { return component; }
export function useState<T>(initial: T | (() => T)) {
  const value = untrack(() => typeof initial === "function" ? (initial as () => T)() : initial);
  return createSignal(() => value);
}
export function useMemo<T>(factory: () => T, deps?: (() => readonly unknown[]) | readonly unknown[]): T {
  const value = createMemo(() => {
    if (typeof deps === "function") touchDeps(deps());
    else if (deps != null) touchDeps(deps);
    return factory();
  });
  const initial = untrack(value);
  return initial != null && typeof initial === "object" ? liveObject(value as import("solid-js").Accessor<T & object>) : initial;
}

function touchDeps(values: readonly unknown[]): void {
  for (const value of values) if (value != null && typeof value === "object") touchLive(value);
}
export function useCallback<T extends (...args: never[]) => unknown>(callback: T, _deps?: unknown): T { return callback; }
export function useRef<T>(initial: T | null = null): RefObject<T> { return { current: initial }; }
export function createRef<T>(): RefObject<T> { return { current: null }; }
export function useImperativeHandle<T>(ref: RefObject<T> | undefined, factory: () => T): void {
  if (ref == null) return;
  onSettled(() => {
    ref.current = factory();
    return () => { ref.current = null; };
  });
}
export function useEffect(effect: () => void | (() => void), deps?: (() => readonly unknown[]) | readonly unknown[]): void {
  if (deps == null) {
    // Some ported canvas painters discover dependencies inside the paint call.
    createTrackedEffect(effect);
    return;
  }
  createEffect(() => {
    const values = typeof deps === "function" ? deps() : deps;
    touchDeps(values);
    return [...values];
  }, effect);
}
export function useLayoutEffect(effect: () => void | (() => void), deps?: (() => readonly unknown[]) | readonly unknown[]): void {
  // Apply after refs are attached, never while constructing the JSX tree.
  createEffect(() => {
    const values = typeof deps === "function" ? deps() : deps ?? [];
    touchDeps(values);
    return [...values];
  }, effect);
}

export const Children = {
  toArray(value: unknown): JSX.Element[] {
    return resolveChildren(() => value as JSX.Element).toArray();
  },
};

// Solid renders JSX eagerly, so React-style element cloning has no general equivalent.
// Ported call sites that rely on prop replacement are rewritten manually. This fallback
// preserves children for call sites that only use cloning as a transparent wrapper.
export function cloneElement<T>(element: T, _props?: Record<string, unknown>): T { return element; }
export function isValidElement<P = Record<string, unknown>>(value: unknown): value is ReactElement<P> { return value != null; }

// Kept only as type-level migration aids. All class component call sites are ported to
// functions and these constructors should never be instantiated by the Solid runtime.
export class Component<P = Record<string, unknown>, S = Record<string, unknown>> { props!: P; state!: S; }
export class PureComponent<P = Record<string, unknown>, S = Record<string, unknown>> extends Component<P, S> {}
