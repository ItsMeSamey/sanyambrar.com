import type { JSX } from "@solidjs/web";
import { type ClassName } from "../types.ts";
export type NameValueProps = {
    readonly className?: ClassName;
    readonly title?: string;
    readonly name: JSX.Element;
    readonly value: JSX.Element;
};
export type NameProps = {
    readonly className?: ClassName;
    readonly title?: string;
    readonly name?: string;
    readonly children?: JSX.Element;
};
export type ValueProps = {
    readonly className?: ClassName;
    readonly title?: string;
    readonly value?: JSX.Element;
    readonly delta?: number;
    readonly children?: JSX.Element;
};
