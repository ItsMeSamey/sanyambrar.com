(() => {
  'use strict';
  const root=document.querySelector('.tools-view');
  const context=document.getElementById('tool-context');
  if(!root||!context)return;

  const TOOLS=[['text','Text','Text Inspector'],['base','Encode','Encode / Decode'],['diff','Diff','Live Diff'],['number','Numbers','Number Lab'],['markdown','Markdown','Markdown']];
  const legacy={ascii:'text',words:'text'};
  const valid=new Set(TOOLS.map(x=>x[0]));
  const route=()=>{const raw=new URLSearchParams(location.search).get('tool')||'text';return legacy[raw]||(valid.has(raw)?raw:'text')};
  const stateKey=(tool,name)=>`tool.${tool}.${name}`;
  const localGet=(tool,name,fallback='')=>{try{return localStorage.getItem(stateKey(tool,name))??fallback}catch{return fallback}};
  const localSet=(tool,name,value)=>{try{localStorage.setItem(stateKey(tool,name),value)}catch{}};
  const query=()=>new URLSearchParams(location.search);
  const get=(name,fallback='')=>query().get(name)??localGet(route(),name,fallback);
  const shareable=v=>v&&v.length<1800;
  const set=(name,value)=>{const tool=route(),q=query();localSet(tool,name,value);q.set('tool',tool);shareable(value)?q.set(name,value):q.delete(name);history.replaceState(null,'',`${location.pathname}?${q}${location.hash}`)};
  const setRoute=(tool,text)=>{if(text!=null)localSet(tool,'text',text);const q=new URLSearchParams();q.set('tool',tool);if(text!=null&&shareable(text))q.set('text',text);history.pushState(null,'',`${location.pathname}?${q}`);render()};
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const copy=value=>navigator.clipboard?.writeText(value).catch(()=>{});
  const sendMarkup=(value,exclude=route())=>`<select class="tool-send" data-send="${esc(value)}" aria-label="Send to another tool"><option value="">Send to…</option>${TOOLS.filter(x=>x[0]!==exclude).map(x=>`<option value="${x[0]}">${x[2]}</option>`).join('')}</select>`;
  const setContext=(html='')=>{context.innerHTML=html};
  const syncTabs=()=>document.querySelectorAll('.tool-tabs [data-tool]').forEach(a=>a.toggleAttribute('aria-current',a.dataset.tool===route()));
  document.querySelector('.tool-tabs')?.addEventListener('click',e=>{const a=e.target.closest('[data-tool]');if(!a)return;e.preventDefault();if(a.dataset.tool!==route())setRoute(a.dataset.tool)});
  context.addEventListener('change',e=>{const s=e.target.closest('[data-send]');if(s&&s.value){setRoute(s.value,s.dataset.send);s.value=''}});
  const onPop=()=>{if(/\/tools(?:\.html)?\/?$/.test(location.pathname))render()};
  addEventListener('popstate',onPop);
  addEventListener('samey-pageleave',()=>removeEventListener('popstate',onPop),{once:true});

  function syncOverlay(textarea,mirror){const sync=()=>{mirror.scrollTop=textarea.scrollTop;mirror.scrollLeft=textarea.scrollLeft};textarea.addEventListener('scroll',sync,{passive:true});sync()}
  const segmentText=s=>{let out='',buf='',kind='space';const flush=()=>{if(buf){out+=`<span class="inspect-${kind}">${esc(buf)}</span>`;buf=''}};for(const c of s){const next=c.codePointAt(0)>127?'non':/[A-Za-z0-9_]/.test(c)?'word':'space';if(next!==kind){flush();kind=next}buf+=c}flush();return out||' '};
  function textStats(s){return{words:s.match(/[A-Za-z0-9_]+|[\p{L}\p{N}]+/gu)?.length??0,chars:[...s].length,bytes:new TextEncoder().encode(s).length,lines:s?s.split('\n').length:0,non:[...s].filter(c=>c.codePointAt(0)>127).length}}
  function textContext(s){const x=textStats(s);setContext(`<span><strong>${x.words.toLocaleString()}</strong> words</span><span>${x.chars.toLocaleString()} chars</span><span>${x.lines.toLocaleString()} lines</span><span class="${x.non?'danger':''}"><strong>${x.non.toLocaleString()}</strong> non-ASCII</span>${sendMarkup(s)}`)}
  function textTool(){
    let value=get('text','Hello World! Café résumé naïve\n你好世界！\nEmoji: 🎉🚀💡');
    root.innerHTML=`<section class="text-tool"><div class="rich-editor"><pre id="text-mirror" aria-hidden="true">${segmentText(value)}</pre><textarea id="text-input" class="tool-textarea" spellcheck="false">${esc(value)}</textarea></div></section>`;
    const input=root.querySelector('#text-input'),mirror=root.querySelector('#text-mirror');syncOverlay(input,mirror);textContext(value);
    input.addEventListener('input',()=>{value=input.value;set('text',value);mirror.innerHTML=segmentText(value);textContext(value)});
  }

  const te=new TextEncoder(),td=new TextDecoder('utf-8',{fatal:true}),B58='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',B88='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+,-./:;=?@[]^_{|}~';
  const b2s=b=>String.fromCharCode(...b),s2b=s=>Uint8Array.from(s,c=>c.charCodeAt(0));
  const bxE=(b,a)=>{if(!b.length)return'';let n=0n;for(const x of b)n=n*256n+BigInt(x);let o='';for(;n;n/=BigInt(a.length))o=a[Number(n%BigInt(a.length))]+o;let z=0;while(z<b.length&&!b[z])z++;return a[0].repeat(z)+o};
  const bxD=(s,a)=>{s=s.trim();let n=0n;for(const c of s){const v=a.indexOf(c);if(v<0)throw Error('Invalid character: '+c);n=n*BigInt(a.length)+BigInt(v)}const o=[];for(;n;n>>=8n)o.unshift(Number(n&255n));let z=0;while(z<s.length&&s[z]===a[0])z++;return Uint8Array.from([...Array(z).fill(0),...o])};
  const hE=b=>[...b].map(x=>x.toString(16).padStart(2,'0')).join(''),hD=s=>{s=s.replace(/\s|^0x/gi,'');if(s.length%2||!/^\s*$|^[\da-f]+$/i.test(s))throw Error('Invalid hex');return Uint8Array.from(s.match(/../g)?.map(x=>parseInt(x,16))??[])};
  const binE=b=>[...b].map(x=>x.toString(2).padStart(8,'0')).join(' '),binD=s=>{s=s.replace(/[\s_]/g,'');if(s.length%8||!/^[01]*$/.test(s))throw Error('Invalid binary');return Uint8Array.from(s.match(/.{8}/g)?.map(x=>parseInt(x,2))??[])};
  const b32='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',b32E=b=>{let o='',buf=0,bits=0;for(const x of b){buf=buf<<8|x;bits+=8;while(bits>=5){o+=b32[buf>>>(bits-5)&31];bits-=5}}if(bits)o+=b32[buf<<(5-bits)&31];while(o.length%8)o+='=';return o},b32D=s=>{s=s.toUpperCase().replace(/[\s-=]/g,'');let buf=0,bits=0,o=[];for(const c of s){const v=b32.indexOf(c);if(v<0)throw Error('Invalid Base32');buf=buf<<5|v;bits+=5;if(bits>=8){o.push(buf>>>(bits-8)&255);bits-=8}}return Uint8Array.from(o)};
  const htmlE=s=>[...s].map(c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]??(c.codePointAt(0)>127?`&#${c.codePointAt(0)};`:c))).join(''),htmlD=s=>{const x=document.createElement('textarea');x.innerHTML=s;return x.value};
  const uniE=s=>[...s].map(c=>{const n=c.codePointAt(0);return n>=32&&n<=126&&c!='\\'?c:n<=0xffff?`\\u${n.toString(16).padStart(4,'0')}`:`\\u{${n.toString(16)}}`}).join(''),uniD=s=>s.replace(/\\u\{([\da-f]{1,6})\}|\\u([\da-f]{4})|\\x([\da-f]{2})/gi,(_,a,b,c)=>String.fromCodePoint(parseInt(a||b||c,16))),rot=s=>s.replace(/[A-Za-z]/g,c=>String.fromCharCode((c<='Z'?65:97)+(c.charCodeAt(0)-(c<='Z'?65:97)+13)%26));
  const FORMATS=[['base64','Base64'],['base64url','Base64URL'],['base32','Base32'],['base58','Base58'],['base88','Base88'],['hex','Hex'],['binary','Binary'],['url','URL'],['html','HTML'],['json','JSON string'],['unicode','Unicode'],['rot13','ROT13']];
  const convert=(f,s,decode=false)=>{if(f==='base64')return decode?td.decode(s2b(atob(s.replace(/\s/g,'')))):btoa(b2s(te.encode(s)));if(f==='base64url'){if(decode){let x=s.replace(/-/g,'+').replace(/_/g,'/');x+='='.repeat((4-x.length%4)%4);return td.decode(s2b(atob(x)))}return btoa(b2s(te.encode(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}if(f==='base32')return decode?td.decode(b32D(s)):b32E(te.encode(s));if(f==='base58')return decode?td.decode(bxD(s,B58)):bxE(te.encode(s),B58);if(f==='base88')return decode?td.decode(bxD(s,B88)):bxE(te.encode(s),B88);if(f==='hex')return decode?td.decode(hD(s)):hE(te.encode(s));if(f==='binary')return decode?td.decode(binD(s)):binE(te.encode(s));if(f==='url')return decode?decodeURIComponent(s):encodeURIComponent(s);if(f==='html')return decode?htmlD(s):htmlE(s);if(f==='json'){if(decode){const v=JSON.parse(s);if(typeof v!=='string')throw Error('JSON value is not a string');return v}return JSON.stringify(s)}if(f==='unicode')return decode?uniD(s):uniE(s);return rot(s)};
  function baseTool(){
    let format=get('format','base64'),mode=get('mode','encode')==='decode'?'decode':'encode',input=get('text',''),output='',error='';
    const run=()=>{try{output=convert(format,input,mode==='decode');error=''}catch(e){output='';error=e.message||String(e)}};
    const contextHtml=()=>`<span class="context-segment"><button type="button" data-codec-set="encode"${mode==='encode'?' data-active':''}>Encode</button><button type="button" data-codec-set="decode"${mode==='decode'?' data-active':''}>Decode</button></span><select id="codec-format" aria-label="Format">${FORMATS.map(([v,l])=>`<option value="${v}"${v===format?' selected':''}>${l}</option>`).join('')}</select><button type="button" data-codec-swap>Swap</button>${sendMarkup(output)}`;
    run();
    root.innerHTML=`<section class="codec-tool"><label class="codec-pane"><span class="pane-caption" id="codec-source-label">${mode==='encode'?'Source':'Encoded input'}</span><span class="pane-count" id="codec-in-count"></span><textarea id="codec-input" class="tool-textarea" spellcheck="false">${esc(input)}</textarea></label><section class="codec-pane"><span class="pane-caption" id="codec-output-label">${mode==='encode'?'Encoded output':'Decoded output'}</span><span class="pane-count" id="codec-out-count"></span><pre id="codec-output"></pre><button class="pane-action" data-codec-copy>Copy</button></section><div id="codec-error" class="codec-error" hidden></div></section>`;
    const inputEl=root.querySelector('#codec-input'),out=root.querySelector('#codec-output'),err=root.querySelector('#codec-error'),inCount=root.querySelector('#codec-in-count'),outCount=root.querySelector('#codec-out-count');
    const paint=()=>{run();set('text',input);set('format',format);set('mode',mode);out.textContent=output;err.hidden=!error;err.textContent=error;inCount.textContent=`${[...input].length} chars`;outCount.textContent=`${[...output].length} chars`;root.querySelector('[data-codec-copy]').disabled=!output;setContext(contextHtml());wireContext()};
    const wireContext=()=>{context.querySelectorAll('[data-codec-set]').forEach(b=>b.onclick=()=>{mode=b.dataset.codecSet;root.querySelector('#codec-source-label').textContent=mode==='encode'?'Source':'Encoded input';root.querySelector('#codec-output-label').textContent=mode==='encode'?'Encoded output':'Decoded output';paint()});context.querySelector('#codec-format').onchange=e=>{format=e.target.value;paint()};context.querySelector('[data-codec-swap]').onclick=()=>{if(!output)return;input=output;inputEl.value=input;mode=mode==='encode'?'decode':'encode';paint()}};
    inputEl.addEventListener('input',()=>{input=inputEl.value;paint()});root.querySelector('[data-codec-copy]').onclick=()=>copy(output);paint();
  }

  function fastMyers(xs,ys){
    let i=0,N=xs.length,M=ys.length;while(i<N&&i<M&&xs[i]===ys[i])i++;if(i===N&&i===M)return[];while(N>i&&M>i&&xs[N-1]===ys[M-1])N--,M--;
    const n=N-i,m=M-i,Z=(Math.min(n,m)+1)*2,L=n+m,b=new(L<256?Uint8Array:L<65536?Uint16Array:Uint32Array)(2*Z);
    const s={i,N:n,j:i,M:m,Z,b,eq:(x,y)=>xs[x]===ys[y],pxs:-1,pxe:-1,pys:-1,pye:-1,oxs:-1,oxe:-1,oys:-1,oye:-1,stackTop:0,stack:[]};
    const out=[];let c=0;
    while(c<=1){c=fastMyersStep(s,c);if(c===1)out.push([s.oxs,s.oxe,s.oys,s.oye]);else if(s.pxs>=0){out.push([s.pxs,s.pxe,s.pys,s.pye]);break}}
    return out;
  }
  function fastMyersStep(s,c){
    const{b,eq,stack}=s;let{i,N,j,M,Z,stackTop}=s;
    for(;;){switch(c){case 0:{
      block:while(N>0&&M>0){
        b.fill(0,0,2*Z);const W=N-M,L=N+M,parity=L&1,ox=i+N-1,oy=j+M-1,hmax=(L+parity)/2;let z;
        loop:for(let h=0;h<=hmax;h++){
          const kmin=2*Math.max(0,h-M)-h,kmax=h-2*Math.max(0,h-N);
          for(let k=kmin;k<=kmax;k+=2){const km=b[k-1-Z*Math.floor((k-1)/Z)],kp=b[k+1-Z*Math.floor((k+1)/Z)],u=k===-h||(k!==h&&km<kp)?kp:km+1,v=u-k;let x=u,y=v;while(x<N&&y<M&&eq(i+x,j+y))x++,y++;b[k-Z*Math.floor(k/Z)]=x;if(parity===1&&(z=W-k)>=1-h&&z<h&&x+b[Z+z-Z*Math.floor(z/Z)]>=N){if(h>1||x!==u){stack[stackTop++]=i+x;stack[stackTop++]=N-x;stack[stackTop++]=j+y;stack[stackTop++]=M-y;N=u;M=v;Z=2*(Math.min(N,M)+1);continue block}break loop}}
          for(let k=kmin;k<=kmax;k+=2){const km=b[Z+k-1-Z*Math.floor((k-1)/Z)],kp=b[Z+k+1-Z*Math.floor((k+1)/Z)],u=k===-h||(k!==h&&km<kp)?kp:km+1,v=u-k;let x=u,y=v;while(x<N&&y<M&&eq(ox-x,oy-y))x++,y++;b[Z+k-Z*Math.floor(k/Z)]=x;if(parity===0&&(z=W-k)>=-h&&z<=h&&x+b[z-Z*Math.floor(z/Z)]>=N){if(h>0||x!==u){stack[stackTop++]=i+N-u;stack[stackTop++]=u;stack[stackTop++]=j+M-v;stack[stackTop++]=v;N-=x;M-=y;Z=2*(Math.min(N,M)+1);continue block}break loop}}
        }
        if(N===M)continue;if(M>N){i+=N;j+=N;M-=N;N=0}else{i+=M;j+=M;N-=M;M=0}break;
      }
      if(N+M!==0){if(s.pxe===i||s.pye===j){s.pxe=i+N;s.pye=j+M}else{const sx=s.pxs;s.oxs=s.pxs;s.oxe=s.pxe;s.oys=s.pys;s.oye=s.pye;s.pxs=i;s.pxe=i+N;s.pys=j;s.pye=j+M;if(sx>=0){s.i=i;s.N=N;s.j=j;s.M=M;s.Z=Z;s.stackTop=stackTop;return 1}}}
    }case 1:{if(stackTop===0)return 2;M=stack[--stackTop];j=stack[--stackTop];N=stack[--stackTop];i=stack[--stackTop];Z=2*(Math.min(N,M)+1);c=0}}
    }
  }

  function diffPaint(a,b){let ax=0,by=0,left='',right='',changes=0;for(const[x0,x1,y0,y1]of fastMyers(a,b)){changes++;if(ax<x0)left+=`<span class="diff-same">${esc(a.slice(ax,x0))}</span>`;if(by<y0)right+=`<span class="diff-same">${esc(b.slice(by,y0))}</span>`;if(x0<x1)left+=`<span class="diff-del">${esc(a.slice(x0,x1))}</span>`;if(y0<y1)right+=`<span class="diff-add">${esc(b.slice(y0,y1))}</span>`;ax=x1;by=y1}if(ax<a.length)left+=`<span class="diff-same">${esc(a.slice(ax))}</span>`;if(by<b.length)right+=`<span class="diff-same">${esc(b.slice(by))}</span>`;return{left:left||' ',right:right||' ',changes}}
  function diffTool(){
    let a=get('text','Hello World\n\nThis is the original text.'),b=get('right','Hello World\n\nThis is the modified text.');
    root.innerHTML=`<section class="diff-tool"><label class="diff-side"><span class="diff-label">Original</span><div class="rich-editor"><pre id="diff-a-mirror" aria-hidden="true"></pre><textarea id="diff-a" class="tool-textarea" spellcheck="false" wrap="off">${esc(a)}</textarea></div></label><label class="diff-side"><span class="diff-label">Modified</span><div class="rich-editor"><pre id="diff-b-mirror" aria-hidden="true"></pre><textarea id="diff-b" class="tool-textarea" spellcheck="false" wrap="off">${esc(b)}</textarea></div></label></section>`;
    const aEl=root.querySelector('#diff-a'),bEl=root.querySelector('#diff-b'),am=root.querySelector('#diff-a-mirror'),bm=root.querySelector('#diff-b-mirror');syncOverlay(aEl,am);syncOverlay(bEl,bm);
    const draw=()=>{const m=diffPaint(a,b);am.innerHTML=m.left;bm.innerHTML=m.right;setContext(`<span><strong>${m.changes}</strong> change${m.changes===1?'':'s'}</span><span>Myers diff</span><button type="button" data-diff-swap>Swap</button>${sendMarkup(b)}`);context.querySelector('[data-diff-swap]').onclick=()=>{const x=a;a=b;b=x;aEl.value=a;bEl.value=b;set('text',a);set('right',b);draw()}};
    aEl.addEventListener('input',()=>{a=aEl.value;set('text',a);draw()});bEl.addEventListener('input',()=>{b=bEl.value;set('right',b);draw()});draw();
  }

  const digits='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',clean=s=>s.trim().replace(/[\s_,']/g,'');
  function parseN(s,b){s=clean(s);if(!s)throw Error('Enter a number');let neg=s[0]=='-';if(neg||s[0]=='+')s=s.slice(1);if(b===16)s=s.replace(/^0x/i,'');if(b===8)s=s.replace(/^0o/i,'');if(b===2)s=s.replace(/^0b/i,'');if(!s)throw Error('Enter a number');let n=0n;for(const c0 of s){const c=b<=36?c0.toUpperCase():c0,v=digits.indexOf(c);if(v<0||v>=b)throw Error(`“${c0}” is not valid in base ${b}`);n=n*BigInt(b)+BigInt(v)}return neg?-n:n}
  function fmt(n,b){if(!n)return'0';const neg=n<0n;if(neg)n=-n;let s='';for(;n;n/=BigInt(b))s=digits[Number(n%BigInt(b))]+s;return(neg?'-':'')+s}
  const grouped=(s,n)=>{const neg=s.startsWith('-'),x=neg?s.slice(1):s,parts=[];for(let i=x.length;i>0;i-=n)parts.unshift(x.slice(Math.max(0,i-n),i));return(neg?'-':'')+parts.join(' ')};
  function numberTool(){
    let base=Math.min(62,Math.max(2,+get('base','10')||10)),custom=Math.min(62,Math.max(2,+get('custom','36')||36)),text=get('text','255'),value=null,error='';
    root.innerHTML=`<section class="number-tool"><div class="number-layout"><aside class="number-source"><h1>Number</h1><p>Edit the source or any representation. Everything else follows.</p><textarea id="number-input" class="tool-input" spellcheck="false">${esc(text)}</textarea><div class="radix-choices">${[2,8,10,16].map(b=>`<button type="button" data-base="${b}">base ${b}</button>`).join('')}</div><label class="number-custom-source">Source radix <input id="source-base" class="tool-input" type="number" min="2" max="62" value="${base}"></label><div id="number-error" class="number-error" hidden></div><div id="number-facts" class="number-facts"></div></aside><main class="number-main"><h2>Representations</h2><div class="number-grid"></div><section class="bit-panel"><header><h2>Binary structure</h2><span id="bit-caption"></span></header><div id="bit-values" class="bit-values"></div></section></main></div></section>`;
    const input=root.querySelector('#number-input'),sourceBase=root.querySelector('#source-base'),grid=root.querySelector('.number-grid'),facts=root.querySelector('#number-facts'),bits=root.querySelector('#bit-values'),bitCaption=root.querySelector('#bit-caption'),err=root.querySelector('#number-error');
    const calculate=()=>{try{value=parseN(text,base);error=''}catch(e){value=null;error=e.message||String(e)}};
    const reps=()=>value===null?[]:[['Binary',2,fmt(value,2),4],['Octal',8,fmt(value,8),3],['Decimal',10,fmt(value,10),3],['Hexadecimal',16,fmt(value,16),4],[`Base ${custom}`,custom,fmt(value,custom),4]];
    const buildGrid=()=>{grid.innerHTML=reps().map(([label,b,v,g])=>`<label class="number-card"><header><span>${label}</span><span>base ${b}</span></header><textarea spellcheck="false" data-number-radix="${b}" data-number-value="${esc(v)}">${esc(grouped(v,g))}</textarea><button type="button" data-copy-number="${esc(v)}">Copy</button></label>`).join('')};
    const paint=(rebuild=true)=>{calculate();const abs=value===null?0n:(value<0n?-value:value),bitCount=value===null?0:Math.max(1,abs.toString(2).length);if(rebuild)buildGrid();else{for(const[label,b,v,g]of reps()){const ta=grid.querySelector(`[data-number-radix="${b}"]`);if(ta&&ta!==document.activeElement){ta.value=grouped(v,g);ta.dataset.numberValue=v}const copyBtn=ta?.closest('.number-card')?.querySelector('[data-copy-number]');if(copyBtn)copyBtn.dataset.copyNumber=v}}facts.innerHTML=value===null?'':`<span><b>${bitCount}</b> bits</span><span><b>${Math.ceil(bitCount/8)}</b> bytes</span><span><b>${clean(text).replace(/^[-+]/,'').length}</b> digits</span>`;const raw=value===null?'':abs.toString(2).padStart(Math.ceil(bitCount/4)*4,'0');bits.innerHTML=(raw.match(/.{1,4}/g)||[]).map((x,i)=>`<code title="bits ${Math.max(0,raw.length-(i+1)*4)}–${raw.length-i*4-1}">${x}</code>`).join('');bitCaption.textContent=value===null?'':`${bitCount} significant bit${bitCount===1?'':'s'}`;err.hidden=!error;err.textContent=error;root.querySelectorAll('[data-base]').forEach(x=>x.classList.toggle('active',+x.dataset.base===base));setContext(`<label>custom base <input id="custom-base" type="number" min="2" max="62" value="${custom}"></label>${sendMarkup(value===null?'':String(value))}`);context.querySelector('#custom-base').oninput=e=>{custom=Math.min(62,Math.max(2,+e.target.value||2));set('custom',String(custom));paint(true)}};
    input.oninput=()=>{text=input.value;set('text',text);paint(true)};sourceBase.oninput=()=>{base=Math.min(62,Math.max(2,+sourceBase.value||2));set('base',String(base));paint(true)};root.querySelectorAll('[data-base]').forEach(b=>b.onclick=()=>{base=+b.dataset.base;sourceBase.value=String(base);set('base',String(base));paint(true)});grid.addEventListener('input',e=>{const ta=e.target.closest('[data-number-radix]');if(!ta)return;base=+ta.dataset.numberRadix;text=clean(ta.value);input.value=text;sourceBase.value=String(base);set('text',text);set('base',String(base));paint(false)});grid.addEventListener('click',e=>{const b=e.target.closest('[data-copy-number]');if(b){e.preventDefault();copy(b.dataset.copyNumber)}});paint(true);
  }

  const inlineMd=s=>esc(s).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/~~([^~]+)~~/g,'<del>$1</del>').replace(/\*([^*]+)\*/g,'<em>$1</em>').replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  function markdown(s){
    const lines=s.replace(/\r/g,'').split('\n'),out=[];let i=0;
    while(i<lines.length){const line=lines[i];if(/^```/.test(line)){const lang=line.slice(3).trim();let code='';i++;while(i<lines.length&&!/^```/.test(lines[i]))code+=(code?'\n':'')+lines[i++];if(i<lines.length)i++;out.push(`<pre${lang?` data-language="${esc(lang)}"`:''}><code>${esc(code)}</code></pre>`);continue}if(/^#{1,6}\s/.test(line)){const m=line.match(/^(#{1,6})\s+(.*)$/);out.push(`<h${m[1].length}>${inlineMd(m[2])}</h${m[1].length}>`);i++;continue}if(/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)){out.push('<hr>');i++;continue}if(/^>\s?/.test(line)){const q=[];while(i<lines.length&&/^>\s?/.test(lines[i]))q.push(lines[i++].replace(/^>\s?/,''));out.push(`<blockquote>${q.map(x=>inlineMd(x)).join('<br>')}</blockquote>`);continue}if(/^[-*+]\s+/.test(line)){const items=[];while(i<lines.length&&/^[-*+]\s+/.test(lines[i]))items.push(`<li>${inlineMd(lines[i++].replace(/^[-*+]\s+/,''))}</li>`);out.push(`<ul>${items.join('')}</ul>`);continue}if(/^\d+\.\s+/.test(line)){const items=[];while(i<lines.length&&/^\d+\.\s+/.test(lines[i]))items.push(`<li>${inlineMd(lines[i++].replace(/^\d+\.\s+/,''))}</li>`);out.push(`<ol>${items.join('')}</ol>`);continue}if(i+1<lines.length&&line.includes('|')&&/^\s*\|?\s*:?-{3,}/.test(lines[i+1])){const rows=[];const cells=x=>x.replace(/^\s*\||\|\s*$/g,'').split('|').map(v=>v.trim());const head=cells(line);i+=2;while(i<lines.length&&lines[i].includes('|')&&lines[i].trim())rows.push(cells(lines[i++]));out.push(`<table><thead><tr>${head.map(x=>`<th>${inlineMd(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${inlineMd(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);continue}if(!line.trim()){i++;continue}const p=[line];i++;while(i<lines.length&&lines[i].trim()&&!/^(#{1,6}\s|```|>\s?|[-*+]\s+|\d+\.\s+)/.test(lines[i]))p.push(lines[i++]);out.push(`<p>${p.map(inlineMd).join('<br>')}</p>`)}return out.join('')||'<p></p>';
  }
  function markdownTool(){
    let value=get('text','# Markdown\n\n**Bold**, *italic*, `code`.\n\n- Live local preview\n- Shared site theme');let linked=localGet('markdown','linked','1')!=='0',syncing=false;
    root.innerHTML=`<section class="markdown-tool"><label class="markdown-source"><textarea id="md-input" spellcheck="false">${esc(value)}</textarea></label><article id="md-output" class="markdown-preview">${markdown(value)}</article></section>`;
    const input=root.querySelector('#md-input'),out=root.querySelector('#md-output');
    const paintContext=()=>{setContext(`<span><strong>${[...value].length}</strong> chars</span><button type="button" data-md-link>${linked?'Linked':'Unlinked'}</button>${sendMarkup(value)}`);context.querySelector('[data-md-link]').onclick=()=>{linked=!linked;localSet('markdown','linked',linked?'1':'0');paintContext()}};
    const sync=(from,to)=>{if(!linked||syncing)return;syncing=true;const maxFrom=from.scrollHeight-from.clientHeight,maxTo=to.scrollHeight-to.clientHeight;to.scrollTop=maxFrom>0?from.scrollTop/maxFrom*maxTo:0;requestAnimationFrame(()=>syncing=false)};
    input.addEventListener('input',()=>{value=input.value;set('text',value);out.innerHTML=markdown(value);paintContext()});input.addEventListener('scroll',()=>sync(input,out),{passive:true});out.addEventListener('scroll',()=>sync(out,input),{passive:true});paintContext();
  }

  function render(){syncTabs();({text:textTool,base:baseTool,diff:diffTool,number:numberTool,markdown:markdownTool}[route()]||textTool)();syncTabs();document.title=`${TOOLS.find(x=>x[0]===route())?.[2]||'Tools'} · Sanyam Brar`}
  render();
})();
