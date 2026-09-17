import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";

import { Dynamic } from '@solidjs/web';
import styles from "./Icon.module.css";
import { type LucideIcon } from '../../../../../shared/components/Icons.tsx';
import { type ClassName, type MouseProps } from "../types.ts";
type IconProps = {
  readonly shape: string | LucideIcon;
  readonly className?: ClassName;
  readonly viewBox?: string;
} & MouseProps;
import { createMemo, omit, merge } from 'solid-js';
export const Icon = function Icon(allProps: IconProps): JSX.Element {
    const mergedProps = merge(allProps, { get viewBox() { return allProps.viewBox ?? "0 0 24 24"; } });
    const local = mergedProps, props = omit(mergedProps, "shape", "className", "viewBox");
    const content = createMemo(() => {
        if (typeof local.shape === "function") {
            return <Dynamic component={local.shape} {...props} class={clsx(styles.root, local.className)}/>;
        }
        return (<svg {...props} class={clsx(styles.root, local.className)} viewBox={local.viewBox}>
      <path d={local.shape}/>
    </svg>);
    });
    return <>{content()}</>;
};
