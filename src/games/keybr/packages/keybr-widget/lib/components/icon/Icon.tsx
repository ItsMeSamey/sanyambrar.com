import { clsx } from "@keybr/solid-compat/clsx";
import { memo, type ReactNode } from "@keybr/solid-compat/react";
import { Dynamic } from "solid-js/web";
import * as styles from "./Icon.module.css";
import { type IconProps } from "./Icon.types.ts";
import { splitProps, mergeProps } from "solid-js";
export const Icon = memo(function Icon(solidAllProps: IconProps): ReactNode {
    const solidMergedProps = mergeProps({ viewBox: "0 0 24 24" }, solidAllProps);
    const [solidLocal, props] = splitProps(solidMergedProps, ["shape", "className", "viewBox"]);
    if (typeof solidLocal.shape === "function") {
        return <Dynamic component={solidLocal.shape as any} {...props as any} class={clsx(styles.root, solidLocal.className)} />;
    }
    return (<svg {...props as any} class={clsx(styles.root, solidLocal.className)} viewBox={solidLocal.viewBox}>
      <path d={solidLocal.shape}/>
    </svg>);
});
