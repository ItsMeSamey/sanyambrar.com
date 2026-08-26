import { createEffect, createSignal } from 'solid-js';
import { SiteHeader } from '../components/SiteChrome';

function FloatLab(){
  const [value,setValue]=createSignal('0.1');
  const output=()=>{const b=new ArrayBuffer(4),f=new Float32Array(b),u=new Uint32Array(b);f[0]=Number(value());const x=u[0]>>>0,sign=x>>>31,exp=(x>>>23)&255,mant=x&0x7fffff;return `${sign}  ${exp.toString(2).padStart(8,'0')}  ${mant.toString(2).padStart(23,'0')}\nsign       exponent                  mantissa\nhex  0x${x.toString(16).padStart(8,'0')}\nexp  ${exp} → ${exp===0?'subnormal/zero':exp===255?'special':exp-127}`};
  return <article class="lab-panel" id="float" data-lab="float"><h2>IEEE-754 microscope</h2><input class="lab-input" value={value()} onInput={e=>setValue(e.currentTarget.value)} inputmode="decimal"/><pre class="lab-output">{output()}</pre></article>;
}
function UnicodeLab(){
  const [value,setValue]=createSignal('Aé🚀'); const enc=new TextEncoder();
  const output=()=>[...value()].map(c=>{const cp=c.codePointAt(0)!;return `${c===' '?'␠':c}  U+${cp.toString(16).toUpperCase().padStart(4,'0')}  ${[...enc.encode(c)].map(x=>x.toString(16).padStart(2,'0')).join(' ')}`}).join('\n');
  return <article class="lab-panel" id="unicode" data-lab="unicode"><h2>Unicode lens</h2><textarea class="lab-input" value={value()} onInput={e=>setValue(e.currentTarget.value)}/><pre class="lab-output">{output()}</pre></article>;
}
function HashLab(){
  const [a,setA]=createSignal('hello'),[b,setB]=createSignal('hellp'),[out,setOut]=createSignal('Computing…'); let seq=0; const enc=new TextEncoder();
  createEffect(()=>{const av=a(),bv=b(),mine=++seq;Promise.all([av,bv].map(x=>crypto.subtle.digest('SHA-256',enc.encode(x)).then(v=>new Uint8Array(v)))).then(h=>{if(mine!==seq)return;let d=0;for(let i=0;i<32;i++)d+=(h[0][i]^h[1][i]).toString(2).replace(/0/g,'').length;setOut(`${[...h[0]].map(x=>x.toString(16).padStart(2,'0')).join('')}\n${[...h[1]].map(x=>x.toString(16).padStart(2,'0')).join('')}\n\n${d} / 256 bits differ`)});});
  return <article class="lab-panel" id="hash" data-lab="hash"><h2>Hash avalanche</h2><div class="lab-pair"><input class="lab-input" value={a()} onInput={e=>setA(e.currentTarget.value)}/><input class="lab-input" value={b()} onInput={e=>setB(e.currentTarget.value)}/></div><pre class="lab-output">{out()}</pre></article>;
}
export function Lab(){return <><SiteHeader active="lab"/><main><section class="lab-intro"><h1>Lab</h1><p>Small technical experiments. No backend, no telemetry.</p></section><section class="lab-grid"><FloatLab/><UnicodeLab/><HashLab/></section></main></>}
