import type { JSX } from "@solidjs/web";
import { useIntlNumbers } from "../../intl/numbers.ts";
import { textStatsOf } from "../../unicode/textstats.ts";
import { NameValue } from "../../widget/components/text/NameValue.tsx";
import { createMemo } from "solid-js";
import { useIntl } from "../../intl/runtime.tsx";
import styles from "./BookPreview.module.css";
import { type BookContent } from "./types.ts";
import { flattenContent } from "./util.ts";
export const BookPreview = function BookPreview(props: BookContent & { readonly action?: JSX.Element }): JSX.Element {
    const { formatMessage } = useIntl();
    const { formatNumber } = useIntlNumbers();
    const stats = createMemo(() => {
        const paragraphs = flattenContent(props.content);
        const numSections = props.content.length;
        const numParagraphs = paragraphs.length;
        const textStats = textStatsOf(props.book.language.locale, paragraphs);
        return {
            numSections,
            numParagraphs,
            ...textStats,
        };
    });
    return (<div class={styles.root}>
      <img class={styles.coverImage} src={props.book.coverImage} alt="Book cover image" title={`${props.book.title} by ${props.book.author}`}/>
      <div class={styles.details}>
        <p>
          <strong>{props.book.title}</strong> by <strong>{props.book.author}</strong>
        </p>
        <p>
          <NameValue name={formatMessage({
            id: "t_num_Sections",
            defaultMessage: "Sections",
        })} value={formatNumber(stats().numSections)}/>
          <NameValue name={formatMessage({
            id: "t_num_Paragraphs",
            defaultMessage: "Paragraphs",
        })} value={formatNumber(stats().numParagraphs)}/>
          <NameValue name={formatMessage({
            id: "t_num_All_words",
            defaultMessage: "All words",
        })} value={formatNumber(stats().numWords)}/>
          <NameValue name={formatMessage({
            id: "t_num_Unique_words",
            defaultMessage: "Unique words",
        })} value={formatNumber(stats().numUniqueWords)}/>
          <NameValue name={formatMessage({
            id: "t_num_Characters",
            defaultMessage: "Characters",
        })} value={formatNumber(stats().numCharacters)}/>
        </p>
        <p>
          <NameValue name={formatMessage({
            id: "t_Average_word_length",
            defaultMessage: "Average word length",
        })} value={formatNumber(stats().avgWordLength, 2)}/>
        </p>
      </div>
      {props.action && <div class={styles.action}>{props.action}</div>}
    </div>);
};
