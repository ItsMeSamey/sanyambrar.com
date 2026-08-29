import * as monaco from 'monaco-editor/editor/editor.api';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/language/json/json.worker?worker';

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
  javascript: () => import('monaco-editor/languages/definitions/javascript/register'),
  typescript: () => import('monaco-editor/languages/definitions/typescript/register'),
  json: () => import('monaco-editor/language/json/monaco.contribution'),
  html: () => import('monaco-editor/languages/definitions/html/register'),
  css: () => import('monaco-editor/languages/definitions/css/register'),
  markdown: () => import('monaco-editor/languages/definitions/markdown/register'),
  python: () => import('monaco-editor/languages/definitions/python/register'),
  rust: () => import('monaco-editor/languages/definitions/rust/register'),
  go: () => import('monaco-editor/languages/definitions/go/register'),
  java: () => import('monaco-editor/languages/definitions/java/register'),
  cpp: () => import('monaco-editor/languages/definitions/cpp/register'),
  c: () => import('monaco-editor/languages/definitions/cpp/register'),
  shell: () => import('monaco-editor/languages/definitions/shell/register'),
  sql: () => import('monaco-editor/languages/definitions/sql/register'),
  yaml: () => import('monaco-editor/languages/definitions/yaml/register'),
  xml: () => import('monaco-editor/languages/definitions/xml/register'),
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
