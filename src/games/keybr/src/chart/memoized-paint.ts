import { type Rect, type ShapeList } from "@keybr/widget";
import { createMemo } from 'solid-js';

export type Paint = (box: Rect) => ShapeList;

/** Keeps chart preparation memoized while returning a stable paint callback. */
export function memoizePaint(factory: () => Paint): Paint {
  const current = createMemo(factory);
  return (box) => current()(box);
}
