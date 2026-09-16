import { For, Show, createMemo, createSignal } from "solid-js";
import { type ReactNode } from "@keybr/solid-compat/react";
import * as styles from "./BookSelector.module.css";
import { Book } from "./book.ts";

const BOOKS = Book.ALL.map((book) => book).sort((a, b) =>
  a.title.localeCompare(b.title, "en", { sensitivity: "base" }),
);
const normalize = (value: string) =>
  value.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase();

export function BookSelector(solidProps: {
  readonly book: Book;
  readonly onChange: (book: Book) => void;
}): ReactNode {
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal("");
  let searchInput: HTMLInputElement | undefined;
  const filtered = createMemo(() => {
    const needle = normalize(query().trim());
    if (!needle) return BOOKS;
    return BOOKS.filter(({ title, author }) =>
      normalize(`${title} ${author}`).includes(needle),
    );
  });
  const toggle = () => {
    const next = !open();
    setOpen(next);
    if (next) queueMicrotask(() => searchInput?.focus());
  };
  const select = (book: Book) => {
    solidProps.onChange(book);
    setOpen(false);
    setQuery("");
  };

  return <div class={styles.root} onKeyDown={(event) => {
    if (event.key === "Escape" && open()) {
      event.preventDefault();
      setOpen(false);
    }
  }}>
    <div class={styles.selection}>
      <div class={styles.selectionCopy}>
        <span class={styles.label}>Book</span>
        <strong>{solidProps.book.title}</strong>
        <span class={styles.author}>{solidProps.book.author}</span>
      </div>
      <button type="button" class={styles.browseButton} aria-expanded={open()} onClick={toggle}>
        {open() ? "Close library" : "Browse library"}
      </button>
    </div>

    <Show when={open()}>
      <section class={styles.library} aria-label="Book library">
        <div class={styles.searchRow}>
          <label for="keybr-book-search">Find a book</label>
          <input
            ref={searchInput}
            id="keybr-book-search"
            type="search"
            value={query()}
            placeholder="Search by title or author"
            onInput={(event) => setQuery(event.currentTarget.value)}
          />
        </div>
        <div class={styles.libraryMeta} aria-live="polite">
          <span>{filtered().length} of {BOOKS.length} books</span>
          <span>Title or author</span>
        </div>
        <Show when={filtered().length > 0} fallback={<p class={styles.empty}>No books match “{query()}”.</p>}>
          <div class={styles.grid}>
            <For each={filtered()}>{(book) => {
              const selected = () => book.id === solidProps.book.id;
              return <button
                type="button"
                class={styles.book}
                classList={{ [styles.selected]: selected() }}
                aria-pressed={selected()}
                aria-label={`Select ${book.title} by ${book.author}`}
                onClick={() => select(book)}
              >
                <img src={book.coverImage} loading="lazy" alt="" aria-hidden="true" />
                <span class={styles.bookCopy}>
                  <strong>{book.title}</strong>
                  <span>{book.author}</span>
                </span>
                <Show when={selected()}><span class={styles.selectedLabel}>Selected</span></Show>
              </button>;
            }}</For>
          </div>
        </Show>
      </section>
    </Show>
  </div>;
}
