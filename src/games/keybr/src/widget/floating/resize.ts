import { px } from "../utils/geometry.ts";
import { type Size } from "../utils/size.ts";
import { type FloatingHeight, type FloatingWidth } from "./types.ts";

export function resizeElement(
  element: HTMLElement,
  anchorSize: Size,
  width: FloatingWidth | null,
  height: FloatingHeight | null,
): void {
  const { style } = element;
  if (width != null) {
    style.inlineSize = width === "anchor" ? px(anchorSize.width) : px(width);
  }
  if (height != null) {
    style.blockSize = height === "anchor" ? px(anchorSize.height) : px(height);
  }
}
