import type{ToolId}from'../shared/catalog';

const PREFIX='tool.';
const local={
  get:(tool:ToolId,key:string,d='')=>{try{return localStorage.getItem(`${PREFIX}${tool}.${key}`)??d}catch{return d}},
  set:(tool:ToolId,key:string,v:string)=>{try{localStorage.setItem(`${PREFIX}${tool}.${key}`,v)}catch{}},
};
const params=()=>new URLSearchParams(location.search);
const routeFromUrl=()=>params().get('tool') as ToolId|null;
const write=(q:URLSearchParams,replace:boolean)=>history[replace?'replaceState':'pushState'](null,'',`${location.pathname}?${q}${location.hash}`);
const shareable=(v:string)=>v.length>0&&v.length<1800;

export const state={
  route:():ToolId=>routeFromUrl()||'ascii',
  get:(key:string,d='')=>params().get(key)??local.get(state.route(),key,d),
  set:(key:string,v:string)=>{const tool=state.route();local.set(tool,key,v);const q=params();q.set('tool',tool);shareable(v)?q.set(key,v):q.delete(key);write(q,true)},
  setRoute:(tool:ToolId)=>{const q=new URLSearchParams();q.set('tool',tool);write(q,false);dispatchEvent(new Event('toolroute'))},
  send:(tool:ToolId,key:string,v:string)=>{local.set(tool,key,v);const q=new URLSearchParams();q.set('tool',tool);if(shareable(v))q.set(key,v);write(q,false);dispatchEvent(new Event('toolroute'))},
};
