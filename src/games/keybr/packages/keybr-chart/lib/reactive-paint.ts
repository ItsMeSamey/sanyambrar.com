import { type Rect, type ShapeList } from "@keybr/widget";
import { createMemo } from 'solid-js';

export type Paint = (box: Rect) => ShapeList;

/**
 * Keeps expensive chart preparation memoized while returning a stable callback.
 * Canvas tracks the memo read made by this callback, so reactive chart inputs
 * repaint without rebuilding the component.
 */
export function reactivePaint(factory: () => Paint): Paint {
  const current = createMemo(factory);
  return (box) => current()(box);
}
