import { catchError } from "@keybr/debug";
import { type Language } from "@keybr/keyboard";
import { LoadingProgress } from "@keybr/pages-shared";
import { type PhoneticModel, PhoneticModelContext } from "@keybr/phonetic-model";
import { createMemo, Loading, Show } from 'solid-js';
import { type JSX } from '@solidjs/web';
import { loaderImpl } from "./loader.ts";

export function PhoneticModelLoader(props: {
  readonly language: Language;
  readonly children: (result: PhoneticModel) => JSX.Element;
  readonly fallback?: JSX.Element;
}) {
  const result = createMemo(() => PhoneticModelLoader.loader(props.language).catch(error => {
    catchError(error);
    throw error;
  }));
  return <Loading fallback={props.fallback ?? <LoadingProgress/>}><Show when={result()}>
    {(value) => <PhoneticModelContext value={value()}>{props.children(value())}</PhoneticModelContext>}
  </Show></Loading>;
}
PhoneticModelLoader.loader = loaderImpl as PhoneticModel.Loader;
