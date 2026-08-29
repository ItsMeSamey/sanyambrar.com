import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

type MonacoEnvironment = {
  getWorker(_: string, label: string): Worker;
};

const environment: MonacoEnvironment = {
  getWorker(_moduleId, label) {
    if (label === 'json') return new JsonWorker();
    return new EditorWorker();
  },
};

(globalThis as typeof globalThis & { MonacoEnvironment?: MonacoEnvironment }).MonacoEnvironment = environment;

type LanguageLoader = () => Promise<unknown>;
const languageLoaders: Record<string, LanguageLoader> = {
  javascript: () => import('monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution'),
  typescript: () => import('monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution'),
  json: () => import('monaco-editor/esm/vs/language/json/monaco.contribution'),
  html: () => import('monaco-editor/esm/vs/basic-languages/html/html.contribution'),
  css: () => import('monaco-editor/esm/vs/basic-languages/css/css.contribution'),
  markdown: () => import('monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution'),
  python: () => import('monaco-editor/esm/vs/basic-languages/python/python.contribution'),
  rust: () => import('monaco-editor/esm/vs/basic-languages/rust/rust.contribution'),
  go: () => import('monaco-editor/esm/vs/basic-languages/go/go.contribution'),
  java: () => import('monaco-editor/esm/vs/basic-languages/java/java.contribution'),
  cpp: () => import('monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution'),
  c: () => import('monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution'),
  shell: () => import('monaco-editor/esm/vs/basic-languages/shell/shell.contribution'),
  sql: () => import('monaco-editor/esm/vs/basic-languages/sql/sql.contribution'),
  yaml: () => import('monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution'),
  xml: () => import('monaco-editor/esm/vs/basic-languages/xml/xml.contribution'),
};

const loading = new Map<string, Promise<unknown>>();
export function ensureMonacoLanguage(language: string) {
  const loader = languageLoaders[language];
  if (!loader) return Promise.resolve();
  let promise = loading.get(language);
  if (!promise) {
    const releaseLoading = (globalThis as typeof globalThis & { SameyLoadingBegin?: () => () => void }).SameyLoadingBegin?.() ?? (() => {});
    promise = loader().finally(releaseLoading);
    loading.set(language, promise);
  }
  return promise;
}

export { monaco };
