import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode } from "@keybr/solid-compat/react";
import { Dynamic } from "solid-js/web";
import * as styles from "./Article.module.css";
import { type ArticleProps } from "./Article.types.ts";

export function Article(props: ArticleProps): ReactNode {
    const { as: component = "article", id, title, className, children } = props;
    return (<Dynamic component={component as any} id={id} class={clsx(styles.root, className)} title={title}>
      {children}
    </Dynamic>);
}
