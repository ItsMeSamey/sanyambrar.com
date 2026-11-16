type Viewport = { width: number; height: number; offsetLeft?: number; offsetTop?: number };
type Point = { x: number; y: number };
type Size = { width: number; height: number };

export function contextMenuBounds(layout: Size, visual?: Viewport | null) {
  const width = visual && visual.width > 0 ? visual.width : layout.width;
  const height = visual && visual.height > 0 ? visual.height : layout.height;
  const insetX = Math.min(8, width / 2);
  const insetY = Math.min(8, height / 2);
  return {
    left: (visual?.offsetLeft ?? 0) + insetX,
    top: (visual?.offsetTop ?? 0) + insetY,
    width: Math.max(0, width - insetX * 2),
    height: Math.max(0, height - insetY * 2),
  };
}

export function clampContextMenu(point: Point, size: Size, bounds: ReturnType<typeof contextMenuBounds>) {
  return {
    x: Math.max(bounds.left, Math.min(point.x, bounds.left + bounds.width - size.width)),
    y: Math.max(bounds.top, Math.min(point.y, bounds.top + bounds.height - size.height)),
  };
}
