import { type Accessor, createEffect, createSignal } from "solid-js";
import { getElementSize } from "../utils/geometry.ts";
import { type Size } from "../utils/size.ts";

export type ElementResizeCallback = (entry: ResizeObserverEntry) => void;
const observed = new WeakMap<Element, ElementResizeCallback>();
let resizeObserver: ResizeObserver | null = null;

const getResizeObserver = (): ResizeObserver => {
  if (resizeObserver == null) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) observed.get(entry.target)?.(entry);
    });
  }
  return resizeObserver;
};

export const onElementResize = (element: Element, callback: ElementResizeCallback): (() => void) => {
  const observer = getResizeObserver();
  observed.set(element, callback);
  observer.observe(element);
  return () => {
    observed.delete(element);
    observer.unobserve(element);
  };
};

export const useElementSize = (element: Accessor<Element | undefined>): Accessor<Size | null> => {
  const [size, setSize] = createSignal<Size | null>(null);
  createEffect(element, (current) => {
    if (current == null) {
      setSize(null);
      return;
    }
    const update = () => {
      const next = getElementSize(current);
      setSize((previous) => previous != null && previous.eq(next) ? previous : next);
    };
    update();
    return onElementResize(current, update);
  });
  return size;
};
