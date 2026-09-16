import { type Book, type Content, loadCompressedJson } from "@keybr/content";

const CONTENT_BY_PATH = import.meta.glob<string>("./data/*.json", {
  eager: true,
  import: "default",
  query: "?gzip",
});

export async function loadContent(book: Book): Promise<Content> {
  const data = CONTENT_BY_PATH[`./data/${book.id}.json`];
  if (data == null) throw new Error(`Unsupported book: ${book.id}`);
  return loadCompressedJson<Content>(data);
}
