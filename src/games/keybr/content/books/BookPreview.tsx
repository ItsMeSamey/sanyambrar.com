import type { JSX } from "@solidjs/web";
import { useIntlNumbers } from "../../intl/numbers.ts";
import { textStatsOfAsync, type TextStats } from "../../unicode/textstats.ts";
import { NameValue } from "../../widget/components/text/NameValue.tsx";
import { createMemo, createSignal, Loading, Show } from "solid-js";
import { useIntl } from "../../intl/runtime.tsx";
import styles from "./BookPreview.module.css";
import { type BookContent } from "./types.ts";
import { flattenContent } from "./util.ts";

const statsCache = new WeakMap<object, Promise<TextStats>>();
export const BookPreview = function BookPreview(props: BookContent & {
    readonly action?: JSX.Element;
    readonly paragraphs?: readonly string[];
}): JSX.Element {
    const { formatMessage } = useIntl();
    const { formatNumber } = useIntlNumbers();
    const [showStats, setShowStats] = createSignal(false);
    const numSections = () => props.content.length;
    const paragraphs = createMemo(() => props.paragraphs ?? flattenContent(props.content));
    const stats = createMemo(async () => {
        const content = props.content as object;
        let task = statsCache.get(content);
        if (task == null) {
            task = textStatsOfAsync(props.book.language.locale, paragraphs(), 4, false);
            statsCache.set(content, task);
        }
        return task;
    });
    return (<div class={styles.root}>
      <img
        class={styles.coverImage}
        src={props.book.coverImage}
        alt="Book cover image"
        title={`${props.book.title} by ${props.book.author}`}
        loading="lazy"
        decoding="async"
      />
      <div class={styles.details}>
        <p>
          <strong>{props.book.title}</strong> by <strong>{props.book.author}</strong>
        </p>
        <p>
          <NameValue name={formatMessage({
            id: "t_num_Sections",
            defaultMessage: "Sections",
        })} value={formatNumber(numSections())}/>
          <NameValue name={formatMessage({
            id: "t_num_Paragraphs",
            defaultMessage: "Paragraphs",
        })} value={formatNumber(paragraphs().length)}/>
        </p>
        <button type="button" class="quiet" onClick={() => setShowStats((value) => !value)}>
          {showStats() ? "Hide book stats" : "Show book stats"}
        </button>
        <Show when={showStats()}>
          <Loading fallback={<p>Analyzing book text…</p>}>
            <Show keyed when={stats()}>
              {(value) => <>
                <p>
                  <NameValue name={formatMessage({ id: "t_num_All_words", defaultMessage: "All words" })} value={formatNumber(value.numWords)}/>
                  <NameValue name={formatMessage({ id: "t_num_Unique_words", defaultMessage: "Unique words" })} value={formatNumber(value.numUniqueWords)}/>
                  <NameValue name={formatMessage({ id: "t_num_Characters", defaultMessage: "Characters" })} value={formatNumber(value.numCharacters)}/>
                </p>
                <p>
                  <NameValue name={formatMessage({ id: "t_Average_word_length", defaultMessage: "Average word length" })} value={formatNumber(value.avgWordLength, 2)}/>
                </p>
              </>}
            </Show>
          </Loading>
        </Show>
      </div>
      {props.action && <div class={styles.action}>{props.action}</div>}
    </div>);
};
