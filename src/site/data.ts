import { TOOLS } from '../shared/catalog.ts';

export type ProjectDemoId='reverb-ui'|'cnn-draw'|'zhtml-parse'|'oneserial-pack';
export type Entry={title:string;href:string;kind:string;note:string;tags?:string[];demo?:boolean;demoId?:ProjectDemoId;date?:string;summary?:string};
export type ProjectDetail={title:string;dek:string;facts:string[];body:string;links:Entry[];demo?:ProjectDemoId};

export const games:Entry[]=[
  {title:'Wordle',href:'/wordle',kind:'Game',note:'A Wordle clone.',tags:['solidjs','word game']},
  {title:'Keybr',href:'/keybr',kind:'Game',note:'A local-first fork of keybr.com.',tags:['typing','local-first']},
  {title:'Chain Reaction',href:'/chain/',kind:'Game',note:'Chain reaction clone with local AI.',tags:['canvas','game','ai']},
  {title:'Afterimage',href:'/afterimage/',kind:'Game',note:'18 games for memory, focus and speed.',tags:['solidjs','memory','local-first']},
];
const tools:Entry[]=TOOLS.map(tool=>({title:tool.title,href:`/tools/?tool=${tool.id}`,kind:'Tool',note:tool.note}));
export const projects:Entry[]=[
  {title:'Reverb',href:'/projects/reverb/',kind:'Project',note:'Android recorder that keeps a rolling audio window in memory.',tags:['kotlin','android','audio'],demo:true,demoId:'reverb-ui'},
  {title:'CNN',href:'/projects/cnn/',kind:'Project',note:'CNN in Zig. Draw something and run the model in-browser with WASM.',tags:['python / zig','ml','mnist'],demo:true,demoId:'cnn-draw'},
  {title:'zhtml',href:'/projects/zhtml/',kind:'Project',note:'An HTML parser and CSS selector engine written in Zig.',tags:['zig','html','parsing'],demo:true,demoId:'zhtml-parse'},
  {title:'OneSerial',href:'/projects/oneserial/',kind:'Project',note:'Nested structures packed into one contiguous allocation.',tags:['zig','zero-copy','serialization'],demo:true,demoId:'oneserial-pack'},
];

export const posts:Entry[]=[
  {title:"btop's broken lock",href:'/blog/1',kind:'Writing',note:'Two threads could hold the same lock.',tags:['c++','concurrency','btop'],date:'2026-08-25',summary:'Following a btop crash led me to a lock that could let two threads in at once. From there I traced another race through Runner::active.'},
];
export const contributions:Entry[]=[
  {title:'aristocratos/btop · PR #1649',href:'https://github.com/aristocratos/btop/pull/1649',kind:'OSS',note:'Data races, mutex-like locking and signal-safety fixes.',tags:['c++','concurrency']},
  {title:'karlseguin/http.zig',href:'https://github.com/karlseguin/http.zig',kind:'OSS',note:'Memory leak fixes, CORS performance and Zig build updates.',tags:['zig','http']},
  {title:'gofiber/fiber',href:'https://github.com/gofiber/fiber',kind:'OSS',note:'Route parameter binding and request-context lifecycle fixes.',tags:['go','http']},
];
export const details:Record<string,ProjectDetail>={
 zhtml:{demo:'zhtml-parse',title:'zhtml',dek:'HTML parsing optimized for throughput.',facts:['Zig','HTML parser','CSS selectors'],body:'Parse HTML into a tree and query it with CSS selectors. zhtml prioritises throughput; its handling of malformed HTML differs from a browser.',links:[{title:'Source',href:'https://github.com/SmallThingz/zhtml',kind:'GitHub',note:'SmallThingz/zhtml'},{title:'zxml',href:'https://github.com/SmallThingz/zxml',kind:'Related',note:'The XML-side parser.'}]},
 reverb:{title:'Reverb',dek:'Keep recent audio without continuously writing it to disk.',facts:['Kotlin','Android','in-memory circular history'],body:'Reverb keeps recent audio in memory so you can save what just happened. Choose a time or size limit, then save the whole buffer or a selected range.',demo:'reverb-ui',links:[{title:'Source',href:'https://github.com/SmallThingz/reverb',kind:'GitHub',note:'SmallThingz/reverb'},{title:'F-Droid',href:'https://f-droid.org/packages/app.smallthingz.reverb/',kind:'Android',note:'Install Reverb from F-Droid'}]},
 oneserial:{demo:'oneserial-pack',title:'OneSerial',dek:'Nested structures in one contiguous allocation.',facts:['Zig','single allocation','zero-copy serialization'],body:'Pack nested data into one contiguous allocation. Validated typed views read the serialized data directly, including strings and arrays.',links:[{title:'Source',href:'https://github.com/SmallThingz/oneserial',kind:'GitHub',note:'SmallThingz/oneserial'}]},
 cnn:{title:'CNN',dek:'A convolutional neural network with Python training and Zig inference.',facts:['Python / Zig','99.43% MNIST','WASM inference'],body:'Draw a digit. A convolutional neural network trained in Python classifies the 28 × 28 grayscale image using Zig inference compiled to WebAssembly.',demo:'cnn-draw',links:[{title:'Source',href:'https://github.com/ItsMeSamey/mnist_cnn',kind:'GitHub',note:'ItsMeSamey/mnist_cnn'}]},
};
export const searchIndex=[...games,...tools,...posts,...projects,...contributions,{title:'Home',href:'/',kind:'Page',note:'Games, tools and writing.'},{title:'Work',href:'/work/',kind:'Page',note:'Projects and open-source contributions.'}];
