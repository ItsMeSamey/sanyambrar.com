import { type Language } from "@keybr/keyboard";
import { type Book, type Content } from "./books/index.ts";
import { type WordList } from "./words/index.ts";

const BOOKS_BY_PATH = import.meta.glob<string>("../assets/books/*.json", {
  eager: true,
  import: "default",
  query: "?url",
});
const WORDS_BY_PATH = import.meta.glob<string>("../assets/words/words-*.json", {
  eager: true,
  import: "default",
  query: "?url",
});

async function loadJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Cannot load JSON: ${response.status}`);
  return (await response.json()) as T;
}

export async function loadContent(book: Book): Promise<Content> {
  const data = BOOKS_BY_PATH[`../assets/books/${book.id}.json`];
  if (data == null) throw new Error(`Unsupported book: ${book.id}`);
  return loadJson<Content>(data);
}

export async function loadWordList(language: Language): Promise<WordList> {
  const data = WORDS_BY_PATH[`../assets/words/words-${language.id}.json`];
  if (data == null) throw new Error(`Unsupported language: ${language.id}`);
  return loadJson<WordList>(data);
}
