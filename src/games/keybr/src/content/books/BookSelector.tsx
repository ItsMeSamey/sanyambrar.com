import type { JSX } from "@solidjs/web";
import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { clsx } from "clsx";

import * as styles from "./BookSelector.module.css";
import { Book } from "./book.ts";

const BOOKS = Book.ALL.map((book) => book).sort((a, b) =>
  a.title.localeCompare(b.title, "en", { sensitivity: "base" }),
);
const normalize = (value: string) =>
  value.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase();

export function BookSelector(props: {
  readonly book: Book;
  readonly onChange: (book: Book) => void;
}): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal("");
  let dialog!: HTMLDialogElement;
  let searchInput!: HTMLInputElement;
  const filtered = createMemo(() => {
    const needle = normalize(query().trim());
    return needle
      ? BOOKS.filter(({ title, author }) => normalize(`${title} ${author}`).includes(needle))
      : BOOKS;
  });

  createEffect(open, (isOpen) => {
    if (isOpen) {
      if (!dialog.open) dialog.showModal();
      queueMicrotask(() => searchInput?.focus());
    } else if (dialog.open) {
      dialog.close();
    }
  });

  const close = () => {
    setOpen(false);
    setQuery("");
  };
  const select = (book: Book) => {
    close();
    props.onChange(book);
  };

  return <div class={styles.root}>
    <div class={styles.selection}>
      <img src={props.book.coverImage} alt="" aria-hidden="true" />
      <div class={styles.selectionCopy}>
        <span class={styles.label}>Book</span>
        <strong>{props.book.title}</strong>
        <span>{props.book.author}</span>
      </div>
      <button type="button" class={styles.chooseButton} onClick={() => setOpen(true)}>
        Choose book
      </button>
    </div>

    <dialog
      ref={dialog}
      class={styles.dialog}
      aria-labelledby="keybr-book-library-title"
      onClose={close}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          close();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div class={styles.dialogShell}>
        <header class={styles.dialogHeader}>
          <div>
            <span class={styles.eyebrow}>Library</span>
            <h2 id="keybr-book-library-title">Choose a book</h2>
          </div>
          <button type="button" class={styles.closeButton} aria-label="Close book library" onClick={close}>×</button>
        </header>
        <label class={styles.search}>
          <span>Search</span>
          <input
            ref={searchInput}
            id="keybr-book-search"
            type="search"
            value={query()}
            placeholder="Title or author"
            onInput={(event) => setQuery(event.currentTarget.value)}
          />
        </label>
        <div class={styles.resultMeta} aria-live="polite">
          {filtered().length} of {BOOKS.length} books
        </div>
        <Show when={filtered().length > 0} fallback={<p class={styles.empty}>No books match “{query()}”.</p>}>
          <ul class={styles.list}>
            <For each={filtered()}>{(book) => {
              const selected = () => book.id === props.book.id;
              return <li>
                <button
                  type="button"
                  class={clsx(styles.book, selected() && styles.selected)}
                  aria-pressed={selected() ? "true" : "false"}
                  onClick={() => select(book)}
                >
                  <img src={book.coverImage} loading="lazy" alt="" aria-hidden="true" />
                  <span class={styles.bookCopy}>
                    <strong>{book.title}</strong>
                    <span>{book.author}</span>
                  </span>
                  <Show when={selected()}><span class={styles.selectedLabel}>Selected</span></Show>
                </button>
              </li>;
            }}</For>
          </ul>
        </Show>
      </div>
    </dialog>
  </div>;
}
