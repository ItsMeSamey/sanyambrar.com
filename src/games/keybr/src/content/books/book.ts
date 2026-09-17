import { Language } from "../../keyboard/language.ts";
import { Enum, type EnumItem } from "../../lang/enum.ts";
import { BOOK_DEFINITIONS } from "./catalog.ts";

const COVER_BY_PATH = import.meta.glob<string>("../assets/book-covers/*.jpg", {
  eager: true,
  import: "default",
});

function coverFor(id: string): string {
  const cover = COVER_BY_PATH[`../assets/book-covers/${id}.jpg`];
  if (cover == null) throw new Error(`Missing cover for book: ${id}`);
  return cover;
}

export class Book implements EnumItem {
  static readonly ALL = new Enum<Book>(
    ...BOOK_DEFINITIONS.map(({ id, language, title, author }) =>
      new Book(id, Language.ALL.get(language), title, author, coverFor(id)),
    ),
  );

  static readonly EN_ALICE_WONDERLAND = Book.ALL.get("en-alice-wonderland");
  static readonly EN_JEKYLL_HYDE = Book.ALL.get("en-jekyll-hyde");
  static readonly EN_CALL_WILD = Book.ALL.get("en-call-wild");
  static readonly ES_MARIANELA = Book.ALL.get("es-marianela");
  static readonly DE_ALICE_WONDERLAND = Book.ALL.get("de-alice-wonderland");
  static readonly FR_ALICE_WONDERLAND = Book.ALL.get("fr-alice-wonderland");

  private constructor(
    readonly id: string,
    readonly language: Language,
    readonly title: string,
    readonly author: string,
    readonly coverImage: string,
  ) {
    Object.freeze(this);
  }

  toString() {
    return this.id;
  }

  toJSON() {
    return this.id;
  }
}
