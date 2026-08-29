import { useIntlNumbers } from "@keybr/intl";
import { textStatsOf } from "@keybr/unicode";
import { NameValue } from "@keybr/widget";
import { memo, type ReactNode, useMemo } from "@keybr/solid-compat/react";
import { useIntl } from "@keybr/solid-compat/intl";
import * as styles from "./BookPreview.module.css";
import { type BookContent } from "./types.ts";
import { flattenContent } from "./util.ts";
export const BookPreview = memo(function BookPreview(solidProps: BookContent): ReactNode {
    const { formatMessage } = useIntl();
    const { formatNumber } = useIntlNumbers();
    const { numChapters, numParagraphs, numWords, numUniqueWords, numCharacters, avgWordLength, } = useMemo(() => {
        const paragraphs = flattenContent(solidProps.content);
        const numChapters = solidProps.content.length;
        const numParagraphs = paragraphs.length;
        const textStats = textStatsOf(solidProps.book.language.locale, paragraphs);
        return {
            numChapters,
            numParagraphs,
            ...textStats,
        };
    }, () => [solidProps.book, solidProps.content]);
    return (<div class={styles.root}>
      <img class={styles.coverImage} src={solidProps.book.coverImage} alt="Book cover image" title={`${solidProps.book.title} by ${solidProps.book.author}`}/>
      <div class={styles.details}>
        <p>
          <strong>{solidProps.book.title}</strong> by <strong>{solidProps.book.author}</strong>
        </p>
        <p>
          <NameValue name={formatMessage({
            id: "t_num_Chapters",
            defaultMessage: "Chapters",
        })} value={formatNumber(numChapters)}/>
          <NameValue name={formatMessage({
            id: "t_num_Paragraphs",
            defaultMessage: "Paragraphs",
        })} value={formatNumber(numParagraphs)}/>
          <NameValue name={formatMessage({
            id: "t_num_All_words",
            defaultMessage: "All words",
        })} value={formatNumber(numWords)}/>
          <NameValue name={formatMessage({
            id: "t_num_Unique_words",
            defaultMessage: "Unique words",
        })} value={formatNumber(numUniqueWords)}/>
          <NameValue name={formatMessage({
            id: "t_num_Characters",
            defaultMessage: "Characters",
        })} value={formatNumber(numCharacters)}/>
        </p>
        <p>
          <NameValue name={formatMessage({
            id: "t_Average_word_length",
            defaultMessage: "Average word length",
        })} value={formatNumber(avgWordLength, 2)}/>
        </p>
      </div>
    </div>);
});
