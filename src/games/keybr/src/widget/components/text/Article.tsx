import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";

import { Dynamic } from '@solidjs/web';
import styles from "./Article.module.css";
import { type ElementProps } from "../types.ts";
type ArticleProps = ElementProps;
export function Article(props: ArticleProps): JSX.Element {
    return (<Dynamic component={(props.as ?? "article")} id={props.id} title={props.title} class={clsx(styles.root, props.className)}>
      {props.children}
    </Dynamic>);
}
