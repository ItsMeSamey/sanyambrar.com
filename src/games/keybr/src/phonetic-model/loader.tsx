import { catchError } from "@keybr/debug";
import { type Language } from "@keybr/keyboard";
import { LoadingProgress } from "@keybr/ui";
import { createMemo, Loading, Show } from "solid-js";
import { type JSX } from "@solidjs/web";
import { modelAssetPath } from "./assets.ts";
import { censor } from "./censor.ts";
import { PhoneticModelContext } from "./context.ts";
import { makePhoneticModel, PhoneticModel } from "./phoneticmodel.ts";

async function loadModel(language: Language): Promise<PhoneticModel> {
  const response = await fetch(modelAssetPath(language));
  if (!response.ok) throw new Error(`Cannot load phonetic model: ${response.status}`);
  if (response.body == null) throw new Error("Cannot load phonetic model: empty response body");
  return censor(makePhoneticModel(language, new Uint8Array(await response.arrayBuffer())));
}

export function PhoneticModelLoader(props: {
  readonly language: Language;
  readonly children: (result: PhoneticModel) => JSX.Element;
  readonly fallback?: JSX.Element;
}) {
  const result = createMemo(() => PhoneticModelLoader.loader(props.language).catch(error => {
    catchError(error);
    throw error;
  }));
  return <Loading fallback={props.fallback ?? <LoadingProgress/>}>
    <Show keyed when={result()}>{value =>
      <PhoneticModelContext value={value}>{props.children(value)}</PhoneticModelContext>
    }</Show>
  </Loading>;
}
PhoneticModelLoader.loader = loadModel as PhoneticModel.Loader;
