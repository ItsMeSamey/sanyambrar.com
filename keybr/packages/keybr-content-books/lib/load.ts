import { Book, type Content, loadCompressedJson } from "@keybr/content";
import BOOK_EN_ALICE_WONDERLAND from "./data/en-alice-wonderland.json?gzip";
import BOOK_EN_JEKYLL_HYDE from "./data/en-jekyll-hyde.json?gzip";
import BOOK_EN_CALL_WILD from "./data/en-call-wild.json?gzip";
import BOOK_ES_MARIANELA from "./data/es-marianela.json?gzip";
import BOOK_DE_ALICE_WONDERLAND from "./data/de-alice-wonderland.json?gzip";
import BOOK_FR_ALICE_WONDERLAND from "./data/fr-alice-wonderland.json?gzip";

const CONTENT_BY_BOOK: Readonly<Record<string, string>> = {
  [Book.EN_ALICE_WONDERLAND.id]: BOOK_EN_ALICE_WONDERLAND,
  [Book.EN_JEKYLL_HYDE.id]: BOOK_EN_JEKYLL_HYDE,
  [Book.EN_CALL_WILD.id]: BOOK_EN_CALL_WILD,
  [Book.ES_MARIANELA.id]: BOOK_ES_MARIANELA,
  [Book.DE_ALICE_WONDERLAND.id]: BOOK_DE_ALICE_WONDERLAND,
  [Book.FR_ALICE_WONDERLAND.id]: BOOK_FR_ALICE_WONDERLAND,
};

export async function loadContent(book: Book): Promise<Content> {
  const data = CONTENT_BY_BOOK[book.id];
  if (data == null) throw new Error(`Unsupported book: ${book.id}`);
  return loadCompressedJson<Content>(data);
}
