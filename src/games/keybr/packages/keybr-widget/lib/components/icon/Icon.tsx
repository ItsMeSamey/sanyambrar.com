import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";
import { memo } from "@keybr/solid-compat/react";
import { Dynamic } from '@solidjs/web';
import * as styles from "./Icon.module.css";
import { type IconProps } from "./Icon.types.ts";
import { createMemo, omit, merge } from 'solid-js';
export const Icon = memo(function Icon(solidAllProps: IconProps): JSX.Element {
    const solidMergedProps = merge(solidAllProps, { get viewBox() { return solidAllProps.viewBox ?? "0 0 24 24"; } });
    const solidLocal = solidMergedProps, props = omit(solidMergedProps, "shape", "className", "viewBox");
    const content = createMemo(() => {
    if (typeof solidLocal.shape === "function") {
        return <Dynamic component={solidLocal.shape} {...props} class={clsx(styles.root, solidLocal.className)} />;
    }
    return (<svg {...props} class={clsx(styles.root, solidLocal.className)} viewBox={solidLocal.viewBox}>
      <path d={solidLocal.shape}/>
    </svg>);
    });
    return <>{content()}</>;
});
