import { clsx } from "@keybr/solid-compat/clsx";
import { type ElementType, type HTMLAttributes, type ReactNode } from "@keybr/solid-compat/react";
import { type HeaderProps } from "./Header.types.ts";
export function Header(props: HeaderProps): ReactNode {
    const { as, level, id, title, className, children } = props;
    let Component: ElementType<HTMLAttributes<HTMLElement>>;
    switch (level) {
        case 1:
            Component = "h1";
            break;
        case 2:
            Component = "h2";
            break;
        case 3:
            Component = "h3";
            break;
        case 4:
            Component = "h4";
            break;
        case 5:
            Component = "h5";
            break;
        default:
            Component = as ?? "h1";
            break;
    }
    return (<Component id={id} class={className} title={title}>
      {children}
    </Component>);
}
