import { Language } from "@keybr/keyboard";
import { Enum, type EnumItem } from "@keybr/lang";
import coverImageEnAliceWonderland from "../../assets/cover-image-en-alice-wonderland.jpg";
import coverImageEnCallWild from "../../assets/cover-image-en-call-wild.jpg";
import coverImageEnJekyllHyde from "../../assets/cover-image-en-jekyll-hyde.jpg";
import coverImageEsMarianela from "../../assets/cover-image-es-marianela.jpg";
import coverImageFrAliceWonderland from "../../assets/cover-image-fr-alice-wonderland.jpg";
import coverImageGeneric from "../../assets/cover-image-generic.svg";
import { BOOK_DEFINITIONS } from "./catalog.ts";

const COVER_BY_ID: Readonly<Record<string, string>> = {
  "en-alice-wonderland": coverImageEnAliceWonderland,
  "en-jekyll-hyde": coverImageEnJekyllHyde,
  "en-call-wild": coverImageEnCallWild,
  "es-marianela": coverImageEsMarianela,
  "de-alice-wonderland": coverImageEnAliceWonderland,
  "fr-alice-wonderland": coverImageFrAliceWonderland,
};

export class Book implements EnumItem {
  static readonly ALL = new Enum<Book>(
    ...BOOK_DEFINITIONS.map(({ id, language, title, author }) =>
      new Book(
        id,
        Language.ALL.get(language),
        title,
        author,
        COVER_BY_ID[id] ?? coverImageGeneric,
      )),
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
