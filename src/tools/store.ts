export const store={get:(k:string,d='')=>{try{return localStorage.getItem(`tool.${k}`)??d}catch{return d}},set:(k:string,v:string)=>{try{localStorage.setItem(`tool.${k}`,v)}catch{}}}
