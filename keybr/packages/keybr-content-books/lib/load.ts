import { Book, type Content } from "@keybr/content";
import BOOK_EN_ALICE_WONDERLAND from "./data/en-alice-wonderland.json?gzip";
import BOOK_EN_JEKYLL_HYDE from "./data/en-jekyll-hyde.json?gzip";
import BOOK_EN_CALL_WILD from "./data/en-call-wild.json?gzip";
import BOOK_ES_MARIANELA from "./data/es-marianela.json?gzip";
import BOOK_DE_ALICE_WONDERLAND from "./data/de-alice-wonderland.json?gzip";
import BOOK_FR_ALICE_WONDERLAND from "./data/fr-alice-wonderland.json?gzip";

export async function loadContent(book: Book): Promise<Content> {
  switch (book) {
    case Book.EN_ALICE_WONDERLAND:
      return loadCompressedJson<Content>(BOOK_EN_ALICE_WONDERLAND);
    case Book.EN_JEKYLL_HYDE:
      return loadCompressedJson<Content>(BOOK_EN_JEKYLL_HYDE);
    case Book.EN_CALL_WILD:
      return loadCompressedJson<Content>(BOOK_EN_CALL_WILD);
    case Book.ES_MARIANELA:
      return loadCompressedJson<Content>(BOOK_ES_MARIANELA);
    case Book.DE_ALICE_WONDERLAND:
      return loadCompressedJson<Content>(BOOK_DE_ALICE_WONDERLAND);
    case Book.FR_ALICE_WONDERLAND:
      return loadCompressedJson<Content>(BOOK_FR_ALICE_WONDERLAND);
    default:
      throw new Error(`Unsupported book: ${book.id}`);
  }
}

async function loadCompressedJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok || response.body == null) {
    throw new Error(`Cannot load compressed JSON: ${response.status}`);
  }
  const stream = response.body.pipeThrough(new DecompressionStream("gzip"));
  return (await new Response(stream).json()) as T;
}
