import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";

import { createMemo, For } from 'solid-js';
import * as styles from "./ParagraphPreview.module.css";
export const ParagraphPreview = function ParagraphPreview(props: {
    readonly paragraphs: readonly string[];
    readonly paragraphIndex: number;
    readonly around?: number;
}): JSX.Element {
    const items = createMemo(() => {
        const { paragraphs, paragraphIndex } = props;
        const around = props.around ?? 2;
        const begin = Math.max(0, paragraphIndex - around);
        const end = Math.min(paragraphs.length - 1, paragraphIndex + around);
        return paragraphs
            .slice(begin, end + 1)
            .map((paragraph, index) => [begin + index, paragraph] as const);
    });
    return (<div class={styles.root}>
      <For each={items()}>{([index, paragraph]) => (<div class={clsx(styles.item, index === props.paragraphIndex
                ? styles.itemActive
                : styles.itemInactive)}>
          <ParagraphIndex paragraphIndex={index}/>
          <span class={styles.separator}>
            {index === props.paragraphIndex ? "\u27A4" : " "}
          </span>
          <ParagraphContent paragraph={paragraph}/>
        </div>)}</For>
    </div>);
};
export function ParagraphIndex(props: {
    readonly paragraphIndex: number;
}) {
    return <span class={styles.index}>#{props.paragraphIndex + 1}</span>;
}
export function ParagraphContent(props: {
    readonly paragraph: string;
}) {
    return <span class={styles.content}>{props.paragraph}</span>;
}
