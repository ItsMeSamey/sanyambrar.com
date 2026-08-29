import { memo, useEffect, useImperativeHandle, useRef } from "@keybr/solid-compat/react";
import { useElementSize } from "../../hooks/use-element-size.ts";
import { type CanvasProps } from "./Canvas.types.ts";
import { Graphics } from "./graphics.ts";
import { splitProps } from "solid-js";
export const Canvas = memo(function Canvas(solidAllProps: CanvasProps) {
    const [solidLocal, props] = splitProps(solidAllProps, ["className", "id", "paint", "ref", "style", "title", "onResize"]);
    const element = useRef<HTMLCanvasElement>(null);
    const size = useElementSize(element);
    useImperativeHandle(solidLocal.ref, () => ({
        getSize: () => size,
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
            if (size != null && size.width > 0 && size.height > 0) {
                const canvas = element.current!;
                const context = canvas.getContext("2d")!;
                new Graphics(context).paint(paint(size));
            }
        },
    }));
    useEffect(() => {
        if (size != null && size.width > 0 && size.height > 0) {
            const canvas = element.current!;
            const context = canvas.getContext("2d")!;
            const ratio = devicePixelRatio;
            canvas.width = Math.max(1, size.width * ratio);
            canvas.height = Math.max(1, size.height * ratio);
            context.scale(ratio, ratio);
        }
    }, () => [size]);
    useEffect(() => {
        if (size != null && size.width > 0 && size.height > 0) {
            const canvas = element.current!;
            const context = canvas.getContext("2d")!;
            new Graphics(context).paint(solidLocal.paint(size));
        }
    }, () => [size, solidLocal.paint]);
    return (<canvas {...props} ref={el => element.current = el} id={solidLocal.id} class={solidLocal.className} style={{
            display: "block",
            inlineSize: "100%",
            blockSize: "100%",
            ...solidLocal.style,
        }} title={solidLocal.title}/>);
});
