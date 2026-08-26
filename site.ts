import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { SITE_NAV, TOOLS } from "./src/shared/catalog.ts";

type Entry = { title:string; href:string; kind:string; note:string; tags?:string[] };
const games:Entry[]=[
  {title:"Wordle",href:"./wordle",kind:"Game",note:"A Wordle clone.",tags:["solidjs","word game"]},
  {title:"Keybr",href:"./keybr",kind:"Game",note:"A local-first fork of keybr.com.",tags:["typing","local-first"]},
  {title:"Chain Reaction",href:"./chain",kind:"Game",note:"Canvas-rendered chain reaction with local AI.",tags:["canvas","game","ai"]},
];
const tools:Entry[]=TOOLS.map(tool=>({title:tool.title,href:`./tools?tool=${tool.id}`,kind:'Tool',note:tool.note}));
const projects:Entry[]=[
  {title:"zhtml",href:"./projects/zhtml",kind:"Project",note:"Throughput-oriented HTML parser in Zig.",tags:["zig","parser","performance"]},
  {title:"Reverb",href:"./projects/reverb",kind:"Project",note:"Android rolling audio recorder backed by an in-memory circular buffer.",tags:["kotlin","android","audio"]},
  {title:"OneSerial",href:"./projects/oneserial",kind:"Project",note:"Nested Zig data structures in one contiguous allocation.",tags:["zig","serialization","memory"]},
  {title:"CNN",href:"./projects/cnn",kind:"Project",note:"Convolutional network implemented from scratch in Zig.",tags:["zig","ml","mnist"]},
];
const moreProjects:Entry[]=[
  {title:"zxml",href:"https://github.com/SmallThingz/zxml",kind:"Project",note:"Fast XML parsing with explicit memory management.",tags:["zig","xml"]},
  {title:"java debug shell",href:"https://github.com/SmallThingz/java_debug_shell",kind:"Project",note:"Attach, inspect and evaluate inside a running JVM.",tags:["java","jvm"]},
];
const posts:Entry[]=[{title:"btop's broken lock",href:"./blog/posts/btop-mutex.html",kind:"Writing",note:"the mutex that wasn't",tags:["c++","concurrency","btop"]}];
const contributions:Entry[]=[
  {title:'aristocratos/btop · PR #1649',href:'https://github.com/aristocratos/btop/pull/1649',kind:'OSS',note:'Data races, mutex-like locking and signal-safety fixes.',tags:['c++','concurrency']},
  {title:'karlseguin/http.zig',href:'https://github.com/karlseguin/http.zig',kind:'OSS',note:'Memory leak fixes, CORS performance and Zig build updates.',tags:['zig','http']},
  {title:'gofiber/fiber',href:'https://github.com/gofiber/fiber',kind:'OSS',note:'Route parameter binding and request-context lifecycle fixes.',tags:['go','http']},
];

const labs:Entry[]=[
  {title:"IEEE-754 microscope",href:"./lab#float",kind:"Lab",note:"Inspect sign, exponent and mantissa bits of a float32."},
  {title:"Unicode lens",href:"./lab#unicode",kind:"Lab",note:"Break text into code points and UTF-8 bytes."},
  {title:"Hash avalanche",href:"./lab#hash",kind:"Lab",note:"Compare SHA-256 bit flips from tiny input changes."},
];
const nav=SITE_NAV.map(x=>[x.label,x.href] as const);
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
const ext=(href:string)=>/^https?:/.test(href)?' target="_blank" rel="noopener noreferrer"':'';
const head=(title:string,page:string)=>`<!doctype html><html lang="en" data-spa data-home-href="./" data-site-page="${page}"><head>${page==='project'?'<base href="../">':''}<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light dark"><title>${esc(title)}</title><script src="./appearance.generated.js"></script><script src="./theme.js"></script><script src="./site-index.js"></script><script src="./site.js" defer></script><link rel="stylesheet" href="./home.css"></head><body>`;
const header=(active:string)=>`<header class="top"><a class="brand" href="./">Sanyam Brar</a><nav class="top-nav" aria-label="Primary">${nav.map(([label,href])=>`<a href="${href}"${label.toLowerCase()===active?' aria-current="page"':''}>${label}</a>`).join('')}<button class="search-trigger" type="button" data-open-search aria-label="Search">⌘K</button></nav></header>`;
const intro=()=>`<section class="intro" aria-label="About"><div class="intro-meta"><span>Zig</span><span>C++</span><span>Go</span><span>Java</span></div><div class="intro-links"><a href="https://github.com/ItsMeSamey" data-copy-label="Sanyam Brar on GitHub" target="_blank" rel="noopener noreferrer">GitHub ↗</a><a href="https://github.com/SmallThingz" data-copy-label="SmallThingz on GitHub" target="_blank" rel="noopener noreferrer">SmallThingz ↗</a></div></section>`;
const section=(id:string,title:string,body:string)=>`<section aria-labelledby="${id}"><div class="section-head"><h1 id="${id}">${title}</h1></div>${body}</section>`;
const compact=(xs:Entry[])=>`<div class="compact-list">${xs.map(x=>`<a class="compact-row" href="${x.href}"${ext(x.href)} data-copy-label="${esc(x.title)}"><span><span class="compact-name">${esc(x.title)}</span><span class="compact-note">${esc(x.note)}</span></span><span class="row-kind">${x.kind}</span><span class="arrow" aria-hidden="true">›</span></a>`).join('')}</div>`;
const gameTitle=(i:number)=>i===0
  ? `<span class="game-title game-wordle" aria-label="Wordle"><i>W</i><i>O</i><i>R</i><i>D</i><i>L</i><i>E</i></span>`
  : i===1
    ? `<span class="game-title game-keybr" aria-label="Keybr"><i>k</i><i>e</i><i class="keybr-error">y</i><i>b</i><i>r</i><b aria-hidden="true"></b></span>`
    : `<span class="game-title game-chain" aria-label="Chain Reaction"><span>CHAIN</span><svg viewBox="0 0 54 18" aria-hidden="true"><path d="M9 9h36"/><circle cx="9" cy="9" r="5"/><circle cx="27" cy="9" r="5"/><circle cx="45" cy="9" r="5"/></svg><span>REACTION</span></span>`;
const gameCards=()=>`<div class="grid">${games.map((x,i)=>`<a class="card game-card-${i}" href="${x.href}" data-copy-label="${esc(x.title)}"><div class="card-top">${gameTitle(i)}<span class="arrow">›</span></div><div class="card-copy">${esc(x.note)}</div></a>`).join('')}</div>`;
const projectCards=(xs:Entry[])=>`<div class="project-grid">${xs.map(x=>`<a class="project" href="${x.href}"${ext(x.href)} data-copy-label="${esc(x.title)}"><div class="project-head"><span class="project-name">${esc(x.title)}</span><span class="lang">${esc(x.tags?.[0]||'')}</span></div><p>${esc(x.note)}</p><div class="metric">${esc((x.tags||[]).slice(1).join(' · '))}</div></a>`).join('')}</div>`;
const foot=()=>`</body></html>`;
const home=()=>head('Sanyam Brar','home')+header('home')+`<main>${intro()}${section('games-title','Games',gameCards())}${section('tools-title','Tools',compact(tools))}${section('writing-title','Writing',compact(posts))}</main>`+foot();
const work=()=>head('Work · Sanyam Brar','work')+header('work')+`<main>${intro()}${section('projects-title','Selected projects',projectCards(projects))}${section('more-title','More',compact(moreProjects))}${section('contributions-title','Contributions',compact(contributions))}</main>`+foot();
const lab=()=>head('Lab · Sanyam Brar','lab')+header('lab')+`<main><section class="lab-intro"><h1>Lab</h1><p>Small technical experiments. No backend, no telemetry.</p></section><section class="lab-grid"><article class="lab-panel" id="float" data-lab="float"><h2>IEEE-754 microscope</h2><input class="lab-input" value="0.1" inputmode="decimal"><pre class="lab-output"></pre></article><article class="lab-panel" id="unicode" data-lab="unicode"><h2>Unicode lens</h2><textarea class="lab-input">Aé🚀</textarea><pre class="lab-output"></pre></article><article class="lab-panel" id="hash" data-lab="hash"><h2>Hash avalanche</h2><div class="lab-pair"><input class="lab-input" value="hello"><input class="lab-input" value="hellp"></div><pre class="lab-output"></pre></article></section></main>`+foot();
const details:Record<string,{title:string;dek:string;facts:string[];body:string;links:Entry[]}>= {
 zhtml:{title:'zhtml',dek:'HTML parsing optimized for throughput.',facts:['Zig','GiB/s-class parsing','deliberately incomplete HTML compliance'],body:'zhtml is built around a narrow trade: spend less work on browser-grade error recovery and more work moving bytes through the hot path. The useful part is not a framework around the parser. It is the scanner, tokenizer and memory behavior.',links:[{title:'Source',href:'https://github.com/SmallThingz/zhtml',kind:'GitHub',note:'SmallThingz/zhtml'},{title:'zxml',href:'https://github.com/SmallThingz/zxml',kind:'Related',note:'The XML-side parser.'}]},
 reverb:{title:'Reverb',dek:'Keep recent audio without continuously writing it to disk.',facts:['Kotlin','Android','in-memory circular history'],body:'Reverb records in the background into a bounded in-memory history. Saving is explicit: the user asks for the recent window, rather than the app continuously persisting everything. The architecture is mostly about lifecycle, bounded memory and making capture recovery predictable.',links:[{title:'Source',href:'https://github.com/SmallThingz/reverb',kind:'GitHub',note:'SmallThingz/reverb'}]},
 oneserial:{title:'OneSerial',dek:'Nested structures in one contiguous allocation.',facts:['Zig','single allocation','zero-copy serialization'],body:'OneSerial treats layout as the API. Nested structures are packed into one allocation so ownership, locality and serialization remain explicit. It is useful when pointer-heavy object graphs are the thing getting in the way.',links:[{title:'Source',href:'https://github.com/SmallThingz/oneserial',kind:'GitHub',note:'SmallThingz/oneserial'}]},
 cnn:{title:'CNN',dek:'A convolutional neural network implemented from scratch in Zig.',facts:['Zig','~99% MNIST','Python weight interoperability'],body:'The project implements the network primitives rather than wrapping a machine-learning runtime. The interesting constraints are explicit buffers, predictable allocation behavior and moving weights between the Zig implementation and Python tooling.',links:[{title:'Source',href:'https://github.com/ItsMeSamey/cnn_digit_recognition_zig',kind:'GitHub',note:'cnn_digit_recognition_zig'}]},
};
const detail=(_slug:string,d:typeof details[string])=>head(`${d.title} · Sanyam Brar`,`project`)+header('work')+`<main class="detail"><a class="backline" href="./work">‹ Work</a><article class="project-detail"><p class="eyebrow">Project</p><h1>${esc(d.title)}</h1><p class="dek">${esc(d.dek)}</p><div class="fact-strip">${d.facts.map(x=>`<span>${esc(x)}</span>`).join('')}</div><section class="detail-copy"><h2>What it is</h2><p>${esc(d.body)}</p></section><section class="detail-copy"><h2>Related</h2>${compact(d.links)}</section></article></main>`+foot();
export const searchIndex=[...games,...tools,...posts,...projects,...moreProjects,...contributions,...labs,{title:'Home',href:'./',kind:'Page',note:'Games, tools and writing.'},{title:'Work',href:'./work',kind:'Page',note:'Projects and open-source contributions.'},{title:'Lab',href:'./lab',kind:'Page',note:'Small technical experiments.'}];
export async function generateSite(root:string){
  await mkdir(join(root,'projects'),{recursive:true});
  await Promise.all([
    writeFile(join(root,'index.html'),home()),writeFile(join(root,'work.html'),work()),writeFile(join(root,'lab.html'),lab()),
    ...Object.entries(details).map(([slug,d])=>writeFile(join(root,'projects',`${slug}.html`),detail(slug,d))),
    writeFile(join(root,'site-index.js'),`// Generated by site.ts.\nObject.defineProperty(globalThis,"SameySiteIndex",{value:Object.freeze(${JSON.stringify(searchIndex)}),configurable:false,writable:false});\n`),
  ]);
}
