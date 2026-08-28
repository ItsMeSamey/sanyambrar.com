import { type ElementType, type HTMLAttributes, type ReactNode } from "@keybr/solid-compat/react";
import { Dynamic } from "solid-js/web";
import { type HeaderProps } from "./Header.types.ts";

export function Header(props: HeaderProps): ReactNode {
    const { as, level, id, title, className, children } = props;
    let component: ElementType<HTMLAttributes<HTMLElement>>;
    switch (level) {
        case 1:
            component = "h1";
            break;
        case 2:
            component = "h2";
            break;
        case 3:
            component = "h3";
            break;
        case 4:
            component = "h4";
            break;
        case 5:
            component = "h5";
            break;
        default:
            component = as ?? "h1";
            break;
    }
    return (<Dynamic component={component as any} id={id} class={className} title={title}>
      {children}
    </Dynamic>);
}
