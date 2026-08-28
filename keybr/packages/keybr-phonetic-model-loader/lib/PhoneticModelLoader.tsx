import { catchError } from "@keybr/debug";
import { type Language } from "@keybr/keyboard";
import { LoadingProgress } from "@keybr/pages-shared";
import {
  type PhoneticModel,
  PhoneticModelContext,
} from "@keybr/phonetic-model";
import { type ReactNode, useEffect, useState } from "react";
import { loaderImpl } from "./loader.ts";

export function PhoneticModelLoader({
  language,
  children,
  fallback = <LoadingProgress />,
}: {
  readonly language: Language;
  readonly children: (result: PhoneticModel) => ReactNode;
  readonly fallback?: ReactNode;
}): ReactNode {
  return (
    <Loader key={language.id} language={language} fallback={fallback}>
      {children}
    </Loader>
  );
}

export namespace PhoneticModelLoader {
  export let loader: PhoneticModel.Loader = loaderImpl;
}

function Loader({
  language,
  children,
  fallback,
}: {
  readonly language: Language;
  readonly children: (result: PhoneticModel) => ReactNode;
  readonly fallback?: ReactNode;
}): ReactNode {
  const [result, error] = useLoader(language);
  if (error != null) {
    return <p role="alert">Could not load language model.</p>;
  } else if (result == null) {
    return fallback;
  } else {
    return (
      <PhoneticModelContext.Provider value={result}>
        {children(result)}
      </PhoneticModelContext.Provider>
    );
  }
}

function useLoader(language: Language) {
  const [result, setResult] = useState<PhoneticModel | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let didCancel = false;
    setResult(null);
    setError(null);

    PhoneticModelLoader.loader(language).then(
      (result) => {
        if (!didCancel) setResult(result);
      },
      (error) => {
        catchError(error);
        if (!didCancel) setError(error);
      },
    );

    return () => {
      didCancel = true;
    };
  }, [language]);

  return [result, error] as const;
}
