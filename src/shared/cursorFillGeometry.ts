export type FillBounds = { left: number; top: number; width: number; height: number };
export type FillShape = { x: number; y: number; width: number; height: number };

/** Pointer lean can double one edge's inset; keep both edges inside the padding. */
export function cursorFillInset(desired: number, padding = Infinity): number {
  return Math.min(desired, Math.max(0, padding) / 2);
}

/** Project an easing frame into its current owner, including large-to-small handoffs. */
export function containCursorFill(shape: FillShape, owner: FillBounds): FillShape {
  const width = Math.max(0, Math.min(shape.width, owner.width));
  const height = Math.max(0, Math.min(shape.height, owner.height));
  return {
    width,
    height,
    x: Math.max(owner.left + width / 2, Math.min(owner.left + owner.width - width / 2, shape.x)),
    y: Math.max(owner.top + height / 2, Math.min(owner.top + owner.height - height / 2, shape.y)),
  };
}

/** Keep the owner's actual corner geometry as the smaller fill moves inside it. */
export function cursorFillClip(shape: FillShape, owner: FillBounds, radii: string): string {
  const left = shape.x - shape.width / 2;
  const top = shape.y - shape.height / 2;
  return `inset(${owner.top - top}px ${left + shape.width - owner.left - owner.width}px ${top + shape.height - owner.top - owner.height}px ${owner.left - left}px round ${radii})`;
}
