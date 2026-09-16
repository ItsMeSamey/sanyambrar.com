import { createEffect, createSignal, createTrackedEffect, onSettled, omit } from "solid-js";
import { useElementSize } from "../../hooks/use-element-size.ts";
import { type CanvasProps } from "./Canvas.types.ts";
import { Graphics } from "./graphics.ts";

export const Canvas = function Canvas(allProps: CanvasProps) {
  const local = allProps;
  const props = omit(allProps, "className", "id", "paint", "style", "title", "onResize");
  const [element, setElement] = createSignal<HTMLCanvasElement>();
  const size = useElementSize(element);
  const [themeRevision, setThemeRevision] = createSignal(0);

  onSettled(() => {
    const repaint = () => setThemeRevision((value) => value + 1);
    addEventListener("samey-themechange", repaint);
    return () => removeEventListener("samey-themechange", repaint);
  });

  createEffect(size, (currentSize) => {
    if (currentSize == null || currentSize.width <= 0 || currentSize.height <= 0) return;
    const canvas = element()!;
    const context = canvas.getContext("2d")!;
    const ratio = devicePixelRatio;
    canvas.width = Math.max(1, currentSize.width * ratio);
    canvas.height = Math.max(1, currentSize.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    local.onResize?.(currentSize);
  });

  createTrackedEffect(() => {
    const currentSize = size();
    themeRevision();
    if (currentSize == null || currentSize.width <= 0 || currentSize.height <= 0) return;
    const context = element()!.getContext("2d")!;
    new Graphics(context).paint(local.paint(currentSize));
  });

  return <canvas {...props} ref={setElement} id={local.id} class={local.className} style={{
    display: "block",
    "inline-size": "100%",
    "block-size": "100%",
    ...local.style,
  }} title={local.title}/>;
};
