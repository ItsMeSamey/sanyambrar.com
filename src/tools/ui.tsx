import type{JSX}from'solid-js';import{Button}from'~/registry/ui/button';
export{Button};
export function Input(p:JSX.InputHTMLAttributes<HTMLInputElement>){return <input {...p} class={`tool-input ${p.class??''}`}/>}
export function Textarea(p:JSX.TextareaHTMLAttributes<HTMLTextAreaElement>){return <textarea {...p} class={`tool-input tool-textarea ${p.class??''}`}/>}
export function Select(p:{value:string;onChange:(v:string)=>void;options:{value:string,label:string}[];class?:string}){return <select class={`tool-input ${p.class??''}`} value={p.value} onChange={e=>p.onChange(e.currentTarget.value)}>{p.options.map(x=><option value={x.value}>{x.label}</option>)}</select>}
export function ToolShell(p:{title:string;meta?:JSX.Element;actions?:JSX.Element;children:JSX.Element}){return <main class="tool-shell"><header class="tool-header"><strong>{p.title}</strong>{p.meta}<div class="tool-actions">{p.actions}</div></header><section class="tool-body">{p.children}</section></main>}
