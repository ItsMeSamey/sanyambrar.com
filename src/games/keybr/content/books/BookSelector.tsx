import type { JSX } from "@solidjs/web";
import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { clsx } from "clsx";

import styles from "./BookSelector.module.css";
import { Book } from "./book.ts";

const BOOKS = Book.ALL.map((book) => book).sort((a, b) =>
  a.title.localeCompare(b.title, "en", { sensitivity: "base" }),
);
const normalize = (value: string) =>
  value.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase();
const BOOK_PAGE_SIZE = 24;

export function BookSelector(props: {
  readonly book: Book;
  readonly onChange: (book: Book) => void;
}): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const [mounted, setMounted] = createSignal(false);
  const [listMounted, setListMounted] = createSignal(false);
  const [query, setQuery] = createSignal("");
  const [visibleCount, setVisibleCount] = createSignal(BOOK_PAGE_SIZE);
  let dialog!: HTMLDialogElement;
  let searchInput!: HTMLInputElement;
  const filtered = createMemo(() => {
    const needle = normalize(query().trim());
    return needle
      ? BOOKS.filter(({ title, author }) => normalize(`${title} ${author}`).includes(needle))
      : BOOKS;
  });
  const visibleBooks = createMemo(() => filtered().slice(0, visibleCount()));

  createEffect(open, (isOpen) => {
    if (isOpen) {
      setMounted(true);
      queueMicrotask(() => {
        if (!open()) return;
        if (!dialog.open) dialog.showModal();
        searchInput?.focus();
        if (!listMounted()) requestAnimationFrame(() => open() && setListMounted(true));
      });
    } else if (dialog?.open) {
      dialog.close();
    }
  });

  const close = () => {
    setOpen(false);
    setQuery("");
    setVisibleCount(BOOK_PAGE_SIZE);
  };
  const select = (book: Book) => {
    close();
    props.onChange(book);
  };

  return <div class={styles.root}>
    <button type="button" class={styles.chooseButton} onClick={() => setOpen(true)}>
      Choose book
    </button>

    <Show when={mounted()}>
      <dialog
        ref={dialog}
        class={styles.dialog}
        data-samey-overlay=""
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
            onInput={(event) => {
              setQuery(event.currentTarget.value);
              setVisibleCount(BOOK_PAGE_SIZE);
            }}
          />
        </label>
        <div class={styles.resultMeta} aria-live="polite">
          {filtered().length} of {BOOKS.length} books
        </div>
        <Show when={listMounted()} fallback={<p class={styles.empty}>Loading library…</p>}>
          <Show when={filtered().length > 0} fallback={<p class={styles.empty}>No books match “{query()}”.</p>}>
            <ul
              class={styles.list}
              onScroll={(event) => {
                const list = event.currentTarget;
                if (list.scrollTop + list.clientHeight < list.scrollHeight - 160) return;
                setVisibleCount((count) => Math.min(filtered().length, count + BOOK_PAGE_SIZE));
              }}
            >
              <For each={visibleBooks()}>{(book) => {
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
              <Show when={visibleBooks().length < filtered().length}>
                <li class={styles.more} aria-hidden="true">Scroll for more books</li>
              </Show>
            </ul>
          </Show>
        </Show>
      </div>
      </dialog>
    </Show>
  </div>;
}
