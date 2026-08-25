import { createSignal, For } from 'solid-js'
type Opt={title?:string;description?:string;variant?:string;duration?:number}; type Item=Opt&{id:number}; const [items,setItems]=createSignal<Item[]>([]); let id=0;
export function showToast(o:Opt){const item={...o,id:++id};setItems(v=>[...v,item]);setTimeout(()=>setItems(v=>v.filter(x=>x.id!==item.id)),o.duration??3000)}
export function Toaster(){return <div class='fixed right-4 top-4 z-[100] flex max-w-sm flex-col gap-2'><For each={items()}>{x=><div class='rounded border bg-background p-3 text-foreground shadow'><strong>{x.title}</strong>{x.description&&<div class='text-sm text-muted-foreground'>{x.description}</div>}</div>}</For></div>}
