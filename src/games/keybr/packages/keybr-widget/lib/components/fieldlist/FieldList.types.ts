import type { JSX } from "@solidjs/web";
import type { ValidComponent } from "@solidjs/web";
import { type SizeName } from "../../styles/index.ts";
export type FieldListProps = {
    readonly as?: ValidComponent;
    readonly children?: JSX.Element;
    readonly title?: string;
};
export type FieldProps = {
    readonly as?: ValidComponent;
    readonly children?: JSX.Element;
    readonly size?: SizeName;
    readonly title?: string;
};
