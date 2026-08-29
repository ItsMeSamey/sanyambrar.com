import { clsx } from "@keybr/solid-compat/clsx";
import { memo, type ReactNode } from "@keybr/solid-compat/react";
import * as styles from "./ParagraphPreview.module.css";
export const ParagraphPreview = memo(function ParagraphPreview(solidProps: {
    readonly paragraphs: readonly string[];
    readonly paragraphIndex: number;
    readonly around?: number;
}): ReactNode {
    const { length } = solidProps.paragraphs;
    const begin = Math.max(0, solidProps.paragraphIndex - (solidProps.around === undefined ? 2 : solidProps.around));
    const end = Math.min(length - 1, solidProps.paragraphIndex + (solidProps.around === undefined ? 2 : solidProps.around));
    const items = solidProps.paragraphs
        .slice(begin, end + 1)
        .map((paragraph, index) => [begin + index, paragraph] as [
        number,
        string
    ]);
    return (<div class={styles.root}>
      {items.map(([index, paragraph]) => (<div class={clsx(styles.item, index === solidProps.paragraphIndex
                ? styles.itemActive
                : styles.itemInactive)}>
          <ParagraphIndex paragraphIndex={index}/>
          <span class={styles.separator}>
            {index === solidProps.paragraphIndex ? "\u27A4" : " "}
          </span>
          <ParagraphContent paragraph={paragraph}/>
        </div>))}
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
