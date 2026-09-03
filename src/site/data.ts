import { TOOLS } from '../shared/catalog.ts';

export type Entry={title:string;href:string;kind:string;note:string;tags?:string[];demo?:boolean};
export type ProjectDetail={title:string;dek:string;facts:string[];body:string;links:Entry[];demo?:'reverb-ui'|'cnn-draw'};

export const games:Entry[]=[
  {title:'Wordle',href:'/wordle.html',kind:'Game',note:'A Wordle clone.',tags:['solidjs','word game']},
  {title:'Keybr',href:'/keybr.html',kind:'Game',note:'A local-first fork of keybr.com.',tags:['typing','local-first']},
  {title:'Chain Reaction',href:'/chain/',kind:'Game',note:'Chain reaction clone with local AI.',tags:['canvas','game','ai']},
];
export const tools:Entry[]=TOOLS.map(tool=>({title:tool.title,href:`/tools/?tool=${tool.id}`,kind:'Tool',note:tool.note}));
export const projects:Entry[]=[
  {title:'Reverb',href:'/projects/reverb/',kind:'Project',note:'Android recorder that keeps a rolling audio window in memory.',tags:['kotlin','android','audio'],demo:true},
  {title:'CNN',href:'/projects/cnn/',kind:'Project',note:'CNN in Zig. Draw something and run the model in-browser with WASM.',tags:['python / zig','ml','mnist'],demo:true},
];

export const posts:Entry[]=[{title:"btop's broken lock",href:'/blog/posts/btop-mutex.html',kind:'Writing',note:"the mutex that wasn't",tags:['c++','concurrency','btop']}];
export const contributions:Entry[]=[
  {title:'aristocratos/btop · PR #1649',href:'https://github.com/aristocratos/btop/pull/1649',kind:'OSS',note:'Data races, mutex-like locking and signal-safety fixes.',tags:['c++','concurrency']},
  {title:'karlseguin/http.zig',href:'https://github.com/karlseguin/http.zig',kind:'OSS',note:'Memory leak fixes, CORS performance and Zig build updates.',tags:['zig','http']},
  {title:'gofiber/fiber',href:'https://github.com/gofiber/fiber',kind:'OSS',note:'Route parameter binding and request-context lifecycle fixes.',tags:['go','http']},
];
export const details:Record<string,ProjectDetail>={
 zhtml:{title:'zhtml',dek:'HTML parsing optimized for throughput.',facts:['Zig','GiB/s-class parsing','deliberately incomplete HTML compliance'],body:'zhtml is built around a narrow trade: spend less work on browser-grade error recovery and more work moving bytes through the hot path. The useful part is not a framework around the parser. It is the scanner, tokenizer and memory behavior.',links:[{title:'Source',href:'https://github.com/SmallThingz/zhtml',kind:'GitHub',note:'SmallThingz/zhtml'},{title:'zxml',href:'https://github.com/SmallThingz/zxml',kind:'Related',note:'The XML-side parser.'}]},
 reverb:{title:'Reverb',dek:'Keep recent audio without continuously writing it to disk.',facts:['Kotlin','Android','in-memory circular history'],body:'Reverb records in the background into a bounded in-memory history. Saving is explicit: the user asks for the recent window, rather than the app continuously persisting everything. The architecture is mostly about lifecycle, bounded memory and making capture recovery predictable.',demo:'reverb-ui',links:[{title:'Source',href:'https://github.com/SmallThingz/reverb',kind:'GitHub',note:'SmallThingz/reverb'},{title:'F-Droid',href:'https://f-droid.org/packages/app.smallthingz.reverb/',kind:'Android',note:'Install Reverb from F-Droid'}]},
 oneserial:{title:'OneSerial',dek:'Nested structures in one contiguous allocation.',facts:['Zig','single allocation','zero-copy serialization'],body:'OneSerial treats layout as the API. Nested structures are packed into one allocation so ownership, locality and serialization remain explicit. It is useful when pointer-heavy object graphs are the thing getting in the way.',links:[{title:'Source',href:'https://github.com/SmallThingz/oneserial',kind:'GitHub',note:'SmallThingz/oneserial'}]},
 cnn:{title:'CNN',dek:'A convolutional neural network with Python training and Zig inference.',facts:['Python / Zig','99.43% MNIST','WASM inference'],body:'The model is trained from Python tooling, then inference runs in Zig with the weights embedded into the WASM build. The browser demo feeds the same 28 × 28 grayscale input directly into that module.',demo:'cnn-draw',links:[{title:'Source',href:'https://github.com/ItsMeSamey/mnist_cnn',kind:'GitHub',note:'ItsMeSamey/mnist_cnn'}]},
};
export const searchIndex=[...games,...tools,...posts,...projects,...contributions,{title:'Home',href:'/',kind:'Page',note:'Games, tools and writing.'},{title:'Work',href:'/work/',kind:'Page',note:'Projects and open-source contributions.'}];
