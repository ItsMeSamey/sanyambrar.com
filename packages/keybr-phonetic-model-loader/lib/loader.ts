import { type Language } from "@keybr/keyboard";
import {
  censor,
  makePhoneticModel,
  type PhoneticModel,
} from "@keybr/phonetic-model";
import { modelAssetPath } from "./assets.ts";

export const loaderImpl: PhoneticModel.Loader = async (
  language: Language,
): Promise<PhoneticModel> => {
  const response = await fetch(modelAssetPath(language));
  if (!response.ok) {
    throw new Error(`Cannot load phonetic model: ${response.status}`);
  }
  const body = await response.arrayBuffer();
  return censor(makePhoneticModel(language, new Uint8Array(body)));
};
