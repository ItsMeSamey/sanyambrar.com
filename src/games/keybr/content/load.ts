import { type Language } from "../keyboard/language.ts";
import { type Book } from "./books/book.ts";
import { type Content } from "./books/types.ts";
import { type WordList } from "./words/types.ts";

const BOOKS_BY_PATH = import.meta.glob<string>("./assets/books/*.json", {
  eager: true,
  import: "default",
  query: "?url",
});
const WORDS_BY_PATH = import.meta.glob<string>("./assets/words/words-*.json", {
  eager: true,
  import: "default",
  query: "?url",
});

const jsonCache = new Map<string, Promise<unknown>>();

async function loadJson<T>(url: string): Promise<T> {
  let task = jsonCache.get(url) as Promise<T> | undefined;
  if (task == null) {
    task = fetch(url).then(async (response) => {
      if (!response.ok) throw new Error(`Cannot load JSON: ${response.status}`);
      return (await response.json()) as T;
    }).catch((error) => {
      jsonCache.delete(url);
      throw error;
    });
    jsonCache.set(url, task);
  }
  return task;
}

export async function loadContent(book: Book): Promise<Content> {
  const data = BOOKS_BY_PATH[`./assets/books/${book.id}.json`];
  if (data == null) throw new Error(`Unsupported book: ${book.id}`);
  return loadJson<Content>(data);
}

export async function loadWordList(language: Language): Promise<WordList> {
  const data = WORDS_BY_PATH[`./assets/words/words-${language.id}.json`];
  if (data == null) throw new Error(`Unsupported language: ${language.id}`);
  return loadJson<WordList>(data);
}
