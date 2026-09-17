/// <reference types="vite/client" />

declare module "*.data" {
  const url: string;
  export default url;
}

declare module 'monaco-editor/language/json/monaco.contribution';
