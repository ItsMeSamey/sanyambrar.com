import { clsx } from "@keybr/solid-compat/clsx";
import { memo, type ReactNode } from "@keybr/solid-compat/react";
import { Dynamic } from "solid-js/web";
import * as styles from "./Icon.module.css";
import { type IconProps } from "./Icon.types.ts";
export const Icon = memo(function Icon({ shape, className, viewBox = "0 0 24 24", ...props }: IconProps): ReactNode {
    if (typeof shape === "function") {
        return <Dynamic component={shape as any} {...props as any} class={clsx(styles.root, className)} />;
    }
    return (<svg {...props as any} class={clsx(styles.root, className)} viewBox={viewBox}>
      <path d={shape}/>
    </svg>);
});
