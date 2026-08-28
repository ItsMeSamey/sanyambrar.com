import { type ReactNode } from "@keybr/solid-compat/react";
import { type FocusProps } from "../types.ts";

export type TabListProps = {
    readonly tabs: readonly TabProps[];
    readonly selectedIndex?: number;
    readonly onSelect?: (selectedIndex: number) => void;
} & FocusProps;

export type TabProps = {
    readonly children?: ReactNode;
    readonly label: ReactNode;
    readonly title?: string;
};
