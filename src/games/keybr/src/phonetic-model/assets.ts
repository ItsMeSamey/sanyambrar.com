import { Language } from "@keybr/keyboard";
import AR from "./assets/model-ar.data";
import BE from "./assets/model-be.data";
import BR from "./assets/model-br.data";
import CS from "./assets/model-cs.data";
import DA from "./assets/model-da.data";
import DE from "./assets/model-de.data";
import EL from "./assets/model-el.data";
import EN from "./assets/model-en.data";
import EN_GB from "./assets/model-en-GB.data";
import ES from "./assets/model-es.data";
import ET from "./assets/model-et.data";
import FA from "./assets/model-fa.data";
import FI from "./assets/model-fi.data";
import FR from "./assets/model-fr.data";
import HE from "./assets/model-he.data";
import HR from "./assets/model-hr.data";
import HU from "./assets/model-hu.data";
import IT from "./assets/model-it.data";
import JA from "./assets/model-ja.data";
import LT from "./assets/model-lt.data";
import LV from "./assets/model-lv.data";
import NB from "./assets/model-nb.data";
import NL from "./assets/model-nl.data";
import PL from "./assets/model-pl.data";
import PT from "./assets/model-pt.data";
import RO from "./assets/model-ro.data";
import RU from "./assets/model-ru.data";
import SL from "./assets/model-sl.data";
import SV from "./assets/model-sv.data";
import TH from "./assets/model-th.data";
import TR from "./assets/model-tr.data";
import UK from "./assets/model-uk.data";
import VI from "./assets/model-vi.data";

const MODEL_BY_LANGUAGE: Readonly<Record<string, string>> = {
  [Language.AR.id]: AR,
  [Language.BE.id]: BE,
  [Language.BR.id]: BR,
  [Language.CS.id]: CS,
  [Language.DA.id]: DA,
  [Language.DE.id]: DE,
  [Language.EL.id]: EL,
  [Language.EN.id]: EN,
  [Language.EN_GB.id]: EN_GB,
  [Language.ES.id]: ES,
  [Language.ET.id]: ET,
  [Language.FA.id]: FA,
  [Language.FI.id]: FI,
  [Language.FR.id]: FR,
  [Language.HE.id]: HE,
  [Language.HR.id]: HR,
  [Language.HU.id]: HU,
  [Language.IT.id]: IT,
  [Language.JA.id]: JA,
  [Language.LT.id]: LT,
  [Language.LV.id]: LV,
  [Language.NB.id]: NB,
  [Language.NL.id]: NL,
  [Language.PL.id]: PL,
  [Language.PT.id]: PT,
  [Language.RO.id]: RO,
  [Language.RU.id]: RU,
  [Language.SL.id]: SL,
  [Language.SV.id]: SV,
  [Language.TH.id]: TH,
  [Language.TR.id]: TR,
  [Language.UK.id]: UK,
  [Language.VI.id]: VI,
};

export function modelAssetPath(language: Language): string {
  const asset = MODEL_BY_LANGUAGE[language.id];
  if (asset == null) throw new Error(`Unsupported language: ${language.id}`);
  return asset;
}
