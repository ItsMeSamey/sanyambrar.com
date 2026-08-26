export type ToolId='ascii'|'base'|'diff'|'markdown'|'number'|'words';
export type ToolInfo={id:ToolId;label:string;title:string;note:string};

export const SITE_NAV=[
  {label:'Home',href:'./'},
  {label:'Work',href:'./work'},
  {label:'Lab',href:'./lab'},
] as const;

export const TOOLS:readonly ToolInfo[]=[
  {id:'ascii',label:'ASCII',title:'ASCII Check',note:'Find non-ASCII code points.'},
  {id:'base',label:'Base',title:'Format Converter',note:'Base64, Base32, Base58, hex, binary and text encodings.'},
  {id:'diff',label:'Diff',title:'Live Diff',note:'Small line diff for text.'},
  {id:'markdown',label:'Markdown',title:'Markdown',note:'Minimal live Markdown renderer.'},
  {id:'number',label:'Numbers',title:'Number Converter',note:'Convert integers between bases 2–62.'},
  {id:'words',label:'Words',title:'Word Count',note:'Count words without sending text anywhere.'},
] as const;

export const toolInfo=(id:string)=>TOOLS.find(tool=>tool.id===id);
