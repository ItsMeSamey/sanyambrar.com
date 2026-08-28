import { catchError } from "@keybr/debug";
import { type Language } from "@keybr/keyboard";
import { LoadingProgress } from "@keybr/pages-shared";
import { type PhoneticModel, PhoneticModelContext } from "@keybr/phonetic-model";
import { createEffect, createSignal, onCleanup, Show, type JSX } from "solid-js";
import { loaderImpl } from "./loader.ts";

export function PhoneticModelLoader(props: {
  readonly language: Language;
  readonly children: (result: PhoneticModel) => JSX.Element;
  readonly fallback?: JSX.Element;
}) {
  const [result, setResult] = createSignal<PhoneticModel | null>(null);
  createEffect(() => {
    const language = props.language;
    setResult(null);
    let cancelled = false;
    PhoneticModelLoader.loader(language).then(value => { if (!cancelled) setResult(value); }).catch(catchError);
    onCleanup(() => { cancelled = true; });
  });
  return <Show when={result()} fallback={props.fallback ?? <LoadingProgress/>}>
    {(value) => <PhoneticModelContext.Provider value={value()}>{props.children(value())}</PhoneticModelContext.Provider>}
  </Show>;
}
PhoneticModelLoader.loader = loaderImpl as PhoneticModel.Loader;
