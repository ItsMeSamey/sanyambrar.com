import type { JSX } from "@solidjs/web";
import { type Size } from "../../utils/size.ts";
import { type ClassName, type MouseProps, type WheelProps } from "../types.ts";
import { type ShapeList } from "./graphics.ts";
export type PaintCallback = (size: Size) => ShapeList;
export type CanvasProps = {
    readonly className?: ClassName;
    readonly id?: string;
    readonly paint: PaintCallback;
    readonly style?: JSX.CSSProperties;
    readonly title?: string;
    readonly onResize?: (size: Size) => void;
} & MouseProps & WheelProps;
