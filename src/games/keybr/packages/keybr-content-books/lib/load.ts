import { type Book, type Content, loadJson } from "@keybr/content";

const CONTENT_BY_PATH = import.meta.glob<string>("./data/*.json", {
  eager: true,
  import: "default",
  query: "?url",
});

export async function loadContent(book: Book): Promise<Content> {
  const data = CONTENT_BY_PATH[`./data/${book.id}.json`];
  if (data == null) throw new Error(`Unsupported book: ${book.id}`);
  return loadJson<Content>(data);
}
