import { Language } from "@keybr/keyboard";
import AR from "@keybr/phonetic-model/assets/model-ar.data";
import BE from "@keybr/phonetic-model/assets/model-be.data";
import BR from "@keybr/phonetic-model/assets/model-br.data";
import CS from "@keybr/phonetic-model/assets/model-cs.data";
import DA from "@keybr/phonetic-model/assets/model-da.data";
import DE from "@keybr/phonetic-model/assets/model-de.data";
import EL from "@keybr/phonetic-model/assets/model-el.data";
import EN from "@keybr/phonetic-model/assets/model-en.data";
import EN_GB from "@keybr/phonetic-model/assets/model-en-GB.data";
import ES from "@keybr/phonetic-model/assets/model-es.data";
import ET from "@keybr/phonetic-model/assets/model-et.data";
import FA from "@keybr/phonetic-model/assets/model-fa.data";
import FI from "@keybr/phonetic-model/assets/model-fi.data";
import FR from "@keybr/phonetic-model/assets/model-fr.data";
import HE from "@keybr/phonetic-model/assets/model-he.data";
import HR from "@keybr/phonetic-model/assets/model-hr.data";
import HU from "@keybr/phonetic-model/assets/model-hu.data";
import IT from "@keybr/phonetic-model/assets/model-it.data";
import JA from "@keybr/phonetic-model/assets/model-ja.data";
import LT from "@keybr/phonetic-model/assets/model-lt.data";
import LV from "@keybr/phonetic-model/assets/model-lv.data";
import NB from "@keybr/phonetic-model/assets/model-nb.data";
import NL from "@keybr/phonetic-model/assets/model-nl.data";
import PL from "@keybr/phonetic-model/assets/model-pl.data";
import PT from "@keybr/phonetic-model/assets/model-pt.data";
import RO from "@keybr/phonetic-model/assets/model-ro.data";
import RU from "@keybr/phonetic-model/assets/model-ru.data";
import SL from "@keybr/phonetic-model/assets/model-sl.data";
import SV from "@keybr/phonetic-model/assets/model-sv.data";
import TH from "@keybr/phonetic-model/assets/model-th.data";
import TR from "@keybr/phonetic-model/assets/model-tr.data";
import UK from "@keybr/phonetic-model/assets/model-uk.data";
import VI from "@keybr/phonetic-model/assets/model-vi.data";

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
