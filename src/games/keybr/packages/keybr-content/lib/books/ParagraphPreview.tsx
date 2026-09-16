import { clsx } from "@keybr/solid-compat/clsx";
import { memo, type ReactNode } from "@keybr/solid-compat/react";
import { createMemo, For } from 'solid-js';
import * as styles from "./ParagraphPreview.module.css";
export const ParagraphPreview = memo(function ParagraphPreview(solidProps: {
    readonly paragraphs: readonly string[];
    readonly paragraphIndex: number;
    readonly around?: number;
}): ReactNode {
    const items = createMemo(() => {
        const { paragraphs, paragraphIndex } = solidProps;
        const around = solidProps.around ?? 2;
        const begin = Math.max(0, paragraphIndex - around);
        const end = Math.min(paragraphs.length - 1, paragraphIndex + around);
        return paragraphs
            .slice(begin, end + 1)
            .map((paragraph, index) => [begin + index, paragraph] as const);
    });
    return (<div class={styles.root}>
      <For each={items()}>{([index, paragraph]) => (<div class={clsx(styles.item, index === solidProps.paragraphIndex
                ? styles.itemActive
                : styles.itemInactive)}>
          <ParagraphIndex paragraphIndex={index}/>
          <span class={styles.separator}>
            {index === solidProps.paragraphIndex ? "\u27A4" : " "}
          </span>
          <ParagraphContent paragraph={paragraph}/>
        </div>)}</For>
    </div>);
});
export function ParagraphIndex(solidProps: {
    readonly paragraphIndex: number;
}) {
    return <span class={styles.index}>#{solidProps.paragraphIndex + 1}</span>;
}
export function ParagraphContent(solidProps: {
    readonly paragraph: string;
}) {
    return <span class={styles.content}>{solidProps.paragraph}</span>;
}
