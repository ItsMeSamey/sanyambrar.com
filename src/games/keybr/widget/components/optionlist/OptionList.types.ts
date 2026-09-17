import type { JSX } from "@solidjs/web";
import { type SizeName } from "../../styles/size.ts";
import { type FocusProps } from "../types.ts";
export type OptionListOption = {
    readonly value: string;
    readonly name: JSX.Element;
};
export type OptionListProps = {
    readonly options: readonly OptionListOption[];
    readonly label: string;
    readonly size?: SizeName;
    readonly title?: string;
    readonly value: string;
    readonly onSelect?: (value: string) => void;
} & FocusProps;
