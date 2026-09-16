import { loadJson, type WordList } from "@keybr/content";
import { type Language } from "@keybr/keyboard";

const WORDS_BY_PATH = import.meta.glob<string>("./data/words-*.json", {
  eager: true,
  import: "default",
  query: "?url",
});

export async function loadWordList(language: Language): Promise<WordList> {
  const data = WORDS_BY_PATH[`./data/words-${language.id}.json`];
  if (data == null) throw new Error(`Unsupported language: ${language.id}`);
  return loadJson<WordList>(data);
}
