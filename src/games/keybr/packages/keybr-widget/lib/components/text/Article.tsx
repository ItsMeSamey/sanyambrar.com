import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode } from "@keybr/solid-compat/react";
import * as styles from "./Article.module.css";
import { type ArticleProps } from "./Article.types.ts";
export function Article(props: ArticleProps): ReactNode {
    const { as: Component = "article", id, title, className, children } = props;
    return (<Component id={id} class={clsx(styles.root, className)} title={title}>
      {children}
    </Component>);
}
