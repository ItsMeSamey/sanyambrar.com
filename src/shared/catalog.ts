export type ToolId='text'|'base'|'diff'|'markdown'|'number';
export type ToolInfo={id:ToolId;label:string;title:string;note:string};

export const SITE_NAV=[
  {label:'Work',href:'/work/'},
] as const;

export const TOOLS:readonly ToolInfo[]=[
  {id:'text',label:'Text',title:'Text Inspector',note:'Word, character, line and Unicode inspection in one editor.'},
  {id:'base',label:'Encode',title:'Encode / Decode',note:'Base64, URL, Base32, Base58, hex, binary and text encodings.'},
  {id:'diff',label:'Diff',title:'Live Diff',note:'Fast live text diff with inline change highlighting.'},
  {id:'number',label:'Numbers',title:'Number Lab',note:'Inspect and convert integers across bases 2–62.'},
  {id:'markdown',label:'Markdown',title:'Markdown',note:'Live local Markdown editor and preview.'},
] as const;

export const toolInfo=(id:string)=>TOOLS.find(tool=>tool.id===id);
