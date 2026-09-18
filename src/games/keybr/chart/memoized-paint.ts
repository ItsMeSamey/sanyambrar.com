import { type Rect } from "../widget/utils/rect.ts";
import { type ShapeList } from "../widget/components/canvas/graphics.ts";
import { createMemo } from 'solid-js';

 type Paint = (box: Rect) => ShapeList;

/** Keeps chart preparation memoized while returning a stable paint callback. */
export function memoizePaint(factory: () => Paint): Paint {
  const current = createMemo(factory);
  return (box) => current()(box);
}
