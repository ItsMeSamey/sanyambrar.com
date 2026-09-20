import { createEffect, createSignal, onSettled, omit } from "solid-js";
import { watchDevicePixelRatio } from "../../../../../shared/devicePixelRatio.ts";
import { useElementSize } from "../../hooks/use-element-size.ts";
import type { JSX } from "@solidjs/web";
import { type Size } from "../../utils/size.ts";
import { type ClassName, type MouseProps, type WheelProps } from "../types.ts";
import { type ShapeList } from "./graphics.ts";
type PaintCallback = (size: Size) => ShapeList;
type CanvasProps = {
    readonly className?: ClassName;
    readonly id?: string;
    readonly paint: PaintCallback;
    readonly style?: JSX.CSSProperties;
    readonly title?: string;
    readonly onResize?: (size: Size) => void;
} & MouseProps & WheelProps;
import { Graphics } from "./graphics.ts";

export const Canvas = function Canvas(allProps: CanvasProps) {
  const local = allProps;
  const props = omit(allProps, "className", "id", "paint", "style", "title", "onResize");
  const [element, setElement] = createSignal<HTMLCanvasElement>();
  const size = useElementSize(element);
  const [themeRevision, setThemeRevision] = createSignal(0);
  const [pixelRatioRevision, setPixelRatioRevision] = createSignal(0);

  onSettled(() => {
    const repaint = () => setThemeRevision((value) => value + 1);
    const stopPixelRatioWatch = watchDevicePixelRatio(() => setPixelRatioRevision((value) => value + 1));
    addEventListener("samey-themechange", repaint);
    return () => {
      stopPixelRatioWatch();
      removeEventListener("samey-themechange", repaint);
    };
  });

  createEffect(
    () => {
      const currentSize = size();
      themeRevision();
      pixelRatioRevision();
      if (currentSize == null || currentSize.width <= 0 || currentSize.height <= 0) return null;
      return { size: currentSize, shapes: local.paint(currentSize) };
    },
    (frame) => {
      if (frame == null) return;
      const canvas = element()!;
      const ratio = devicePixelRatio;
      const width = Math.max(1, Math.round(frame.size.width * ratio));
      const height = Math.max(1, Math.round(frame.size.height * ratio));
      const resized = canvas.width !== width || canvas.height !== height;
      if (resized) {
        canvas.width = width;
        canvas.height = height;
        local.onResize?.(frame.size);
      }
      const context = canvas.getContext("2d")!;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      new Graphics(context).paint(frame.shapes);
    },
  );

  return <canvas {...props} ref={setElement} id={local.id} class={local.className} style={{
    display: "block",
    "inline-size": "100%",
    "block-size": "100%",
    ...local.style,
  }} title={local.title}/>;
};
