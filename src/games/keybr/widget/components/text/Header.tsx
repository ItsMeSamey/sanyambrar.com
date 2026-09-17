import type { JSX } from "@solidjs/web";
import type { ValidComponent } from "@solidjs/web";
import { Dynamic } from '@solidjs/web';
import { type ElementProps } from "../types.ts";
type HeaderProps = ElementProps & { readonly level?: 1 | 2 | 3 | 4 | 5 };
export function Header(props: HeaderProps): JSX.Element {
    const component = () => {
        let component: ValidComponent;
        switch (props.level) {
            case 1: component = "h1"; break;
            case 2: component = "h2"; break;
            case 3: component = "h3"; break;
            case 4: component = "h4"; break;
            case 5: component = "h5"; break;
            default: component = props.as ?? "h1"; break;
        }
        return component;
    };
    return (<Dynamic component={component()} id={props.id} class={props.className} title={props.title}>
      {props.children}
    </Dynamic>);
}
