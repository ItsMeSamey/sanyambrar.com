import { memo, useEffect, useImperativeHandle, useRef } from "@keybr/solid-compat/react";
import { useElementSize } from "../../hooks/use-element-size.ts";
import { type CanvasProps } from "./Canvas.types.ts";
import { Graphics } from "./graphics.ts";
import { createSignal, onCleanup, onMount, splitProps } from "solid-js";
export const Canvas = memo(function Canvas(solidAllProps: CanvasProps) {
    const [solidLocal, props] = splitProps(solidAllProps, ["className", "id", "paint", "ref", "style", "title", "onResize"]);
    const element = useRef<HTMLCanvasElement>(null);
    const size = useElementSize(element);
    const [themeRevision, setThemeRevision] = createSignal(0);
    onMount(() => {
        const repaint = () => setThemeRevision(value => value + 1);
        addEventListener("samey-themechange", repaint);
        onCleanup(() => removeEventListener("samey-themechange", repaint));
    });
    useImperativeHandle(solidLocal.ref, () => ({
        getSize: () => size(),
        getContext: (...args) => {
            const canvas = element.current!;
            return canvas.getContext.call(canvas, ...args) as any;
        },
        toBlob: (...args) => {
            const canvas = element.current!;
            canvas.toBlob.call(canvas, ...args);
        },
        toDataURL: (...args) => {
            const canvas = element.current!;
            return canvas.toDataURL.call(canvas, ...args);
        },
        paint: (paint) => {
            const currentSize = size();
            if (currentSize != null && currentSize.width > 0 && currentSize.height > 0) {
                const canvas = element.current!;
                const context = canvas.getContext("2d")!;
                new Graphics(context).paint(paint(currentSize));
            }
        },
    }));
    useEffect(() => {
        const currentSize = size();
        if (currentSize != null && currentSize.width > 0 && currentSize.height > 0) {
            const canvas = element.current!;
            const context = canvas.getContext("2d")!;
            const ratio = devicePixelRatio;
            canvas.width = Math.max(1, currentSize.width * ratio);
            canvas.height = Math.max(1, currentSize.height * ratio);
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            solidLocal.onResize?.(currentSize);
        }
    }, () => [size()]);
    useEffect(() => {
        const currentSize = size();
        if (currentSize != null && currentSize.width > 0 && currentSize.height > 0) {
            const canvas = element.current!;
            const context = canvas.getContext("2d")!;
            new Graphics(context).paint(solidLocal.paint(currentSize));
        }
    }, () => [size(), solidLocal.paint, themeRevision()]);
    return (<canvas {...props} ref={el => element.current = el} id={solidLocal.id} class={solidLocal.className} style={{
            display: "block",
            "inline-size": "100%",
            "block-size": "100%",
            ...solidLocal.style,
        }} title={solidLocal.title}/>);
});
