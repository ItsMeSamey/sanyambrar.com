import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode } from "@keybr/solid-compat/react";
import { Dynamic } from "solid-js/web";
import * as styles from "./Article.module.css";
import { type ArticleProps } from "./Article.types.ts";
export function Article(props: ArticleProps): ReactNode {
    return (<Dynamic component={(props.as ?? "article")} id={props.id} title={props.title} class={clsx(styles.root, props.className)}>
      {props.children}
    </Dynamic>);
}
