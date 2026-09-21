import type { JSX } from "@solidjs/web";
import { useIntlNumbers } from "../../intl/numbers.ts";
import { type TextStats, textStatsOfAsync } from "../../unicode/textstats.ts";
import { NameValue } from "../../widget/components/text/NameValue.tsx";
import { createMemo, Loading } from "solid-js";
import { useIntl } from "../../intl/runtime.tsx";
import styles from "./BookPreview.module.css";
import { type BookContent } from "./types.ts";
import { flattenContent } from "./util.ts";
export const BookPreview = function BookPreview(props: BookContent & { readonly action?: JSX.Element }): JSX.Element {
    const { formatMessage } = useIntl();
    const { formatNumber } = useIntlNumbers();
    const paragraphs = createMemo(() => flattenContent(props.content));
    const stats = createMemo(async () => textStatsOfAsync(props.book.language.locale, paragraphs()));
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
        })} value={formatNumber(props.content.length)}/>
          <NameValue name={formatMessage({
            id: "t_num_Paragraphs",
            defaultMessage: "Paragraphs",
        })} value={formatNumber(paragraphs().length)}/>
        </p>
        <Loading fallback={<p data-keybr-book-stats-loading>Analyzing text…</p>}>
          <BookTextStats stats={stats()} formatMessage={formatMessage} formatNumber={formatNumber}/>
        </Loading>
      </div>
      {props.action && <div class={styles.action}>{props.action}</div>}
    </div>);
};

function BookTextStats(props: {
  readonly stats: TextStats;
  readonly formatMessage: ReturnType<typeof useIntl>["formatMessage"];
  readonly formatNumber: ReturnType<typeof useIntlNumbers>["formatNumber"];
}) {
  return <>
    <p>
      <NameValue name={props.formatMessage({ id: "t_num_All_words", defaultMessage: "All words" })} value={props.formatNumber(props.stats.numWords)}/>
      <NameValue name={props.formatMessage({ id: "t_num_Unique_words", defaultMessage: "Unique words" })} value={props.formatNumber(props.stats.numUniqueWords)}/>
      <NameValue name={props.formatMessage({ id: "t_num_Characters", defaultMessage: "Characters" })} value={props.formatNumber(props.stats.numCharacters)}/>
    </p>
    <p>
      <NameValue name={props.formatMessage({ id: "t_Average_word_length", defaultMessage: "Average word length" })} value={props.formatNumber(props.stats.avgWordLength, 2)}/>
    </p>
  </>;
}
