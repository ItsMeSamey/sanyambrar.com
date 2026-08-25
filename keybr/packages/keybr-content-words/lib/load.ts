import { loadCompressedJson, type WordList } from "@keybr/content";
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

const WORDS_BY_LANGUAGE: Readonly<Record<string, string>> = {
  [Language.AR.id]: WORDS_AR,
  [Language.BE.id]: WORDS_BE,
  [Language.BR.id]: WORDS_BR,
  [Language.CS.id]: WORDS_CS,
  [Language.DA.id]: WORDS_DA,
  [Language.DE.id]: WORDS_DE,
  [Language.EL.id]: WORDS_EL,
  [Language.EN.id]: WORDS_EN,
  [Language.EN_GB.id]: WORDS_EN_GB,
  [Language.ES.id]: WORDS_ES,
  [Language.ET.id]: WORDS_ET,
  [Language.FA.id]: WORDS_FA,
  [Language.FI.id]: WORDS_FI,
  [Language.FR.id]: WORDS_FR,
  [Language.HE.id]: WORDS_HE,
  [Language.HR.id]: WORDS_HR,
  [Language.HU.id]: WORDS_HU,
  [Language.IT.id]: WORDS_IT,
  [Language.JA.id]: WORDS_JA,
  [Language.LT.id]: WORDS_LT,
  [Language.LV.id]: WORDS_LV,
  [Language.NB.id]: WORDS_NB,
  [Language.NL.id]: WORDS_NL,
  [Language.PL.id]: WORDS_PL,
  [Language.PT.id]: WORDS_PT,
  [Language.RO.id]: WORDS_RO,
  [Language.RU.id]: WORDS_RU,
  [Language.SL.id]: WORDS_SL,
  [Language.SV.id]: WORDS_SV,
  [Language.TH.id]: WORDS_TH,
  [Language.TR.id]: WORDS_TR,
  [Language.UK.id]: WORDS_UK,
  [Language.VI.id]: WORDS_VI,
};

export async function loadWordList(language: Language): Promise<WordList> {
  const data = WORDS_BY_LANGUAGE[language.id];
  if (data == null) throw new Error(`Unsupported language: ${language.id}`);
  return loadCompressedJson<WordList>(data);
}
