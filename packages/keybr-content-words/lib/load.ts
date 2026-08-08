import { type WordList } from "@keybr/content";
import { Language } from "@keybr/keyboard";
import WORDS_AR from "./data/words-ar.json?gzip";
import WORDS_BE from "./data/words-be.json?gzip";
import WORDS_BR from "./data/words-br.json?gzip";
import WORDS_CS from "./data/words-cs.json?gzip";
import WORDS_DA from "./data/words-da.json?gzip";
import WORDS_DE from "./data/words-de.json?gzip";
import WORDS_EL from "./data/words-el.json?gzip";
import WORDS_EN from "./data/words-en.json?gzip";
import WORDS_EN_GB from "./data/words-en-GB.json?gzip";
import WORDS_ES from "./data/words-es.json?gzip";
import WORDS_ET from "./data/words-et.json?gzip";
import WORDS_FA from "./data/words-fa.json?gzip";
import WORDS_FI from "./data/words-fi.json?gzip";
import WORDS_FR from "./data/words-fr.json?gzip";
import WORDS_HE from "./data/words-he.json?gzip";
import WORDS_HR from "./data/words-hr.json?gzip";
import WORDS_HU from "./data/words-hu.json?gzip";
import WORDS_IT from "./data/words-it.json?gzip";
import WORDS_JA from "./data/words-ja.json?gzip";
import WORDS_LT from "./data/words-lt.json?gzip";
import WORDS_LV from "./data/words-lv.json?gzip";
import WORDS_NB from "./data/words-nb.json?gzip";
import WORDS_NL from "./data/words-nl.json?gzip";
import WORDS_PL from "./data/words-pl.json?gzip";
import WORDS_PT from "./data/words-pt.json?gzip";
import WORDS_RO from "./data/words-ro.json?gzip";
import WORDS_RU from "./data/words-ru.json?gzip";
import WORDS_SL from "./data/words-sl.json?gzip";
import WORDS_SV from "./data/words-sv.json?gzip";
import WORDS_TH from "./data/words-th.json?gzip";
import WORDS_TR from "./data/words-tr.json?gzip";
import WORDS_UK from "./data/words-uk.json?gzip";
import WORDS_VI from "./data/words-vi.json?gzip";

export async function loadWordList(language: Language): Promise<WordList> {
  switch (language) {
    case Language.AR:
      return loadCompressedJson<WordList>(WORDS_AR);
    case Language.BE:
      return loadCompressedJson<WordList>(WORDS_BE);
    case Language.BR:
      return loadCompressedJson<WordList>(WORDS_BR);
    case Language.CS:
      return loadCompressedJson<WordList>(WORDS_CS);
    case Language.DA:
      return loadCompressedJson<WordList>(WORDS_DA);
    case Language.DE:
      return loadCompressedJson<WordList>(WORDS_DE);
    case Language.EL:
      return loadCompressedJson<WordList>(WORDS_EL);
    case Language.EN:
      return loadCompressedJson<WordList>(WORDS_EN);
    case Language.EN_GB:
      return loadCompressedJson<WordList>(WORDS_EN_GB);
    case Language.ES:
      return loadCompressedJson<WordList>(WORDS_ES);
    case Language.ET:
      return loadCompressedJson<WordList>(WORDS_ET);
    case Language.FA:
      return loadCompressedJson<WordList>(WORDS_FA);
    case Language.FI:
      return loadCompressedJson<WordList>(WORDS_FI);
    case Language.FR:
      return loadCompressedJson<WordList>(WORDS_FR);
    case Language.HE:
      return loadCompressedJson<WordList>(WORDS_HE);
    case Language.HR:
      return loadCompressedJson<WordList>(WORDS_HR);
    case Language.HU:
      return loadCompressedJson<WordList>(WORDS_HU);
    case Language.IT:
      return loadCompressedJson<WordList>(WORDS_IT);
    case Language.JA:
      return loadCompressedJson<WordList>(WORDS_JA);
    case Language.LT:
      return loadCompressedJson<WordList>(WORDS_LT);
    case Language.LV:
      return loadCompressedJson<WordList>(WORDS_LV);
    case Language.NB:
      return loadCompressedJson<WordList>(WORDS_NB);
    case Language.NL:
      return loadCompressedJson<WordList>(WORDS_NL);
    case Language.PL:
      return loadCompressedJson<WordList>(WORDS_PL);
    case Language.PT:
      return loadCompressedJson<WordList>(WORDS_PT);
    case Language.RO:
      return loadCompressedJson<WordList>(WORDS_RO);
    case Language.RU:
      return loadCompressedJson<WordList>(WORDS_RU);
    case Language.SL:
      return loadCompressedJson<WordList>(WORDS_SL);
    case Language.SV:
      return loadCompressedJson<WordList>(WORDS_SV);
    case Language.TH:
      return loadCompressedJson<WordList>(WORDS_TH);
    case Language.TR:
      return loadCompressedJson<WordList>(WORDS_TR);
    case Language.UK:
      return loadCompressedJson<WordList>(WORDS_UK);
    case Language.VI:
      return loadCompressedJson<WordList>(WORDS_VI);
    default:
      throw new Error(`Unsupported language: ${language.id}`);
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
