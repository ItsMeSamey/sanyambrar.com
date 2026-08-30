// Interactive Reverb demo runtime. Kept as a normal module so Vite can
// parse/transform it for the site's browser target (including Android WebView).
export function runReverbDemoRuntime(document, requestAnimationFrame, setTimeout, clearTimeout, devicePixelRatio) {
  const phone = document.getElementById('phone');
  const blobControl = document.getElementById('blobControl');
  const blobIconPath = document.getElementById('blobIconPath');
  const blobTime = document.getElementById('blobTime');
  const blobSummary = document.getElementById('blobSummary');
  const oneStat = document.getElementById('oneStat');
  const loopStat = document.getElementById('loopStat');
  const toast = document.getElementById('toast');
  const dialogLayer = document.getElementById('dialogLayer');
  const dialogTitle = document.getElementById('dialogTitle');
  const dialogBody = document.getElementById('dialogBody');
  const dropdownMenu = document.getElementById('dropdownMenu');
  const PAUSE_PATH = 'M7,5h4v14H7zM13,5h4v14h-4z';
  const WAVE_PATH = 'M3,14c0,-0.55 0.45,-1 1,-1s1,0.45 1,1v2c0,0.55 -0.45,1 -1,1s-1,-0.45 -1,-1zM6.5,11c0,-0.55 0.45,-1 1,-1s1,0.45 1,1v8c0,0.55 -0.45,1 -1,1s-1,-0.45 -1,-1zM10,8c0,-0.55 0.45,-1 1,-1s1,0.45 1,1v14c0,0.55 -0.45,1 -1,1s-1,-0.45 -1,-1zM13.5,5c0,-0.55 0.45,-1 1,-1s1,0.45 1,1v14c0,0.55 -0.45,1 -1,1s-1,-0.45 -1,-1zM17,8c0,-0.55 0.45,-1 1,-1s1,0.45 1,1v8c0,0.55 -0.45,1 -1,1s-1,-0.45 -1,-1zM20.5,11c0,-0.55 0.45,-1 1,-1s1,0.45 1,1v2c0,0.55 -0.45,1 -1,1s-1,-0.45 -1,-1z';

  let live = false;
  let selectedBuffer = 'one';
  let oneSeconds = 12 * 60 + 48;
  let loopSeconds = 47 * 60 + 19;
  let oneLimitSeconds = 30 * 60;
  let loopLimitSeconds = 2 * 60 * 60;
  const bytesPerSecond = 44100 * 2;
  let lastTick = performance.now();
  let toastTimer = 0;
  let settingsDirty = false;
  const settingsInitial = new Map();

  function formatShortTimer(sec){
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
    if(h>0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return m>=10 ? `${m}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
  }
  function formatMiB(sec){ return `${(sec*bytesPerSecond/(1024*1024)).toFixed(1)} MiB`; }
  function parseDuration(value){
    const parts=String(value||'').trim().split(':');
    if(parts.length<1||parts.length>3||parts.some(x=>!/^\d+$/.test(x))) return null;
    const nums=parts.map(Number);
    if(nums.some(x=>!Number.isFinite(x)||x<0)) return null;
    if(parts.length===3 && (nums[1]>=60||nums[2]>=60)) return null;
    if(parts.length===2 && nums[1]>=60) return null;
    return parts.length===3?nums[0]*3600+nums[1]*60+nums[2]:parts.length===2?nums[0]*60+nums[1]:nums[0];
  }
  function currentSeconds(){ return selectedBuffer==='one' ? oneSeconds : loopSeconds; }
  function updateMetrics(){
    oneStat.textContent = formatShortTimer(oneSeconds);
    loopStat.textContent = formatShortTimer(loopSeconds);
    blobTime.textContent = formatShortTimer(currentSeconds());
    blobSummary.textContent = formatMiB(currentSeconds());
  }
  function syncRetentionFields(slot){
    const limit=slot==='one'?oneLimitSeconds:loopLimitSeconds;
    const time=document.querySelector(`[data-buffer-retention="${slot}"] [data-retention="time"] input`);
    const size=document.querySelector(`[data-buffer-retention="${slot}"] [data-retention="size"] input`);
    const supporting=document.querySelector(`[data-buffer-retention="${slot}"] [data-retention="size"] .supporting`);
    if(time) time.value=formatShortTimer(limit);
    const mib=(limit*bytesPerSecond/(1024*1024)).toFixed(1);
    if(size) size.value=mib;
    if(supporting) supporting.textContent=`Estimated file size: ${mib} MiB`;
  }
  function applyRetention(slot,seconds){
    seconds=Math.max(0,Math.floor(seconds));
    if(slot==='one'){oneLimitSeconds=seconds;oneSeconds=Math.min(oneSeconds,oneLimitSeconds)}
    else{loopLimitSeconds=seconds;loopSeconds=Math.min(loopSeconds,loopLimitSeconds)}
    syncRetentionFields(slot);
    updateMetrics();
  }
  function appendCapture(seconds){
    if(seconds<=0) return;
    // Reverb writes into the non-overwriting one-shot store first. Only the
    // overflow reaches the looping store, whose oldest samples are replaced
    // once its retention window is full.
    const oneRoom=Math.max(0,oneLimitSeconds-oneSeconds);
    const toOne=Math.min(seconds,oneRoom);
    oneSeconds+=toOne;
    const overflow=seconds-toOne;
    if(overflow>0 && loopLimitSeconds>0) loopSeconds=Math.min(loopLimitSeconds,loopSeconds+overflow);
  }
  function showToast(message){
    clearTimeout(toastTimer); toast.textContent = message; toast.classList.add('show');
    toastTimer=setTimeout(()=>toast.classList.remove('show'),1200);
  }
  function showDialog(title, body){ dialogTitle.textContent=title; dialogBody.textContent=body; dialogLayer.classList.add('show'); }

  document.getElementById('openSettings').onclick = () => phone.classList.add('settings-open');
  document.getElementById('openLibrary').onclick = () => phone.classList.add('library-open');
  document.getElementById('libraryScrim').onclick = () => phone.classList.remove('library-open');
  document.getElementById('dialogClose').onclick = () => dialogLayer.classList.remove('show');
  dialogLayer.addEventListener('click',e=>{if(e.target===dialogLayer) dialogLayer.classList.remove('show')});
  const aboutScrim=document.getElementById('aboutScrim');
  const closeAbout=()=>phone.classList.remove('about-open');
  document.getElementById('brandButton').onclick = () => phone.classList.add('about-open');
  document.getElementById('aboutClose').onclick = closeAbout;
  aboutScrim.onclick = closeAbout;

  document.querySelectorAll('[data-toast]').forEach(el=>el.addEventListener('click',()=>showToast(el.dataset.toast)));
  document.querySelectorAll('.recording-card').forEach(el=>el.addEventListener('click',()=>showDialog(el.dataset.recording,'In the Android app this opens RecordingPlayerDialog.')));

  document.querySelectorAll('.buffer-segment').forEach(seg => seg.addEventListener('click',()=>{
    selectedBuffer=seg.dataset.buffer;
    document.querySelectorAll('.buffer-segment').forEach(x=>x.classList.toggle('selected',x===seg));
    updateMetrics();
  }));

  blobControl.addEventListener('pointerdown',()=>blobControl.classList.add('pressed'));
  ['pointerup','pointercancel','pointerleave'].forEach(ev=>blobControl.addEventListener(ev,()=>blobControl.classList.remove('pressed')));
  blobControl.onclick = () => {
    live=!live;
    blobControl.classList.toggle('live',live);
    blobControl.setAttribute('aria-label',live?'Tap to pause capture':'Tap to start capture');
    blobIconPath.setAttribute('d',live?PAUSE_PATH:WAVE_PATH);
    blobSummary.classList.toggle('hidden',!live);
    blobShader.setActive(live);
  };

  function tick(now){
    if(live && now-lastTick>=1000){
      const n=Math.floor((now-lastTick)/1000); lastTick += n*1000;
      appendCapture(n);
      updateMetrics();
    } else if(!live) lastTick=now;
    requestAnimationFrame(tick);
  }
  updateMetrics(); requestAnimationFrame(tick);

  // Settings: dirty state is relative to the last applied (Done) snapshot.
  const tracked = [...document.querySelectorAll('.settings-body input,.settings-body .m3-value')];
  const wakeSwitch=document.getElementById('wakeSwitch');
  let retentionMode='time';
  function captureSettingsSnapshot(){
    tracked.forEach((el,i)=>settingsInitial.set(i,el instanceof HTMLInputElement?el.value:el.textContent));
    settingsInitial.set('oneLimitSeconds',oneLimitSeconds);
    settingsInitial.set('loopLimitSeconds',loopLimitSeconds);
    settingsInitial.set('wake',wakeSwitch.classList.contains('on'));
    settingsInitial.set('retentionMode',retentionMode);
  }
  captureSettingsSnapshot();
  function setDirty(v=true){
    settingsDirty=v;
    document.getElementById('settingsDone').classList.toggle('disabled',!v);
    document.getElementById('settingsNavClose').style.display=v?'none':'block';
    document.getElementById('settingsNavUndo').style.display=v?'block':'none';
    document.getElementById('settingsNav').setAttribute('aria-label',v?'Undo':'Close');
  }
  function restoreSettings(){
    tracked.forEach((el,i)=>{const v=settingsInitial.get(i); if(el instanceof HTMLInputElement) el.value=v; else el.textContent=v;});
    oneLimitSeconds=settingsInitial.get('oneLimitSeconds'); loopLimitSeconds=settingsInitial.get('loopLimitSeconds');
    oneSeconds=Math.min(oneSeconds,oneLimitSeconds); loopSeconds=Math.min(loopSeconds,loopLimitSeconds);
    syncRetentionFields('one'); syncRetentionFields('loop'); updateMetrics();
    const wake=settingsInitial.get('wake'); wakeSwitch.classList.toggle('on',wake); wakeSwitch.setAttribute('aria-checked',String(wake));
    setRetentionMode(settingsInitial.get('retentionMode'),false); setDirty(false);
  }
  document.getElementById('settingsNav').onclick=()=>{ if(settingsDirty) restoreSettings(); else phone.classList.remove('settings-open'); };
  document.getElementById('settingsDone').onclick=()=>{ if(!settingsDirty)return; captureSettingsSnapshot(); setDirty(false); phone.classList.remove('settings-open'); };
  document.querySelectorAll('.settings-body input').forEach(inp=>inp.addEventListener('input',()=>setDirty(true)));
  document.querySelectorAll('[data-buffer-retention]').forEach(block=>{
    const slot=block.dataset.bufferRetention;
    const time=block.querySelector('[data-retention="time"] input');
    const size=block.querySelector('[data-retention="size"] input');
    if(time) time.addEventListener('change',()=>{const seconds=parseDuration(time.value);if(seconds!=null)applyRetention(slot,seconds);else syncRetentionFields(slot)});
    if(size) size.addEventListener('change',()=>{const mib=Number.parseFloat(size.value);if(Number.isFinite(mib)&&mib>=0)applyRetention(slot,mib*1024*1024/bytesPerSecond);else syncRetentionFields(slot)});
  });
  wakeSwitch.onclick=()=>{const on=!wakeSwitch.classList.contains('on');wakeSwitch.classList.toggle('on',on);wakeSwitch.setAttribute('aria-checked',String(on));setDirty(true)};

  function setRetentionMode(mode,dirty=true){
    retentionMode=mode;
    document.querySelectorAll('[data-retention]').forEach(shell=>{
      const active=shell.dataset.retention===mode; shell.classList.toggle('inactive',!active);
      const prefix=shell.querySelector('.m3-prefix'); if(prefix) prefix.textContent=active?'':'=';
    });
    if(dirty)setDirty(true);
  }
  document.querySelectorAll('[data-retention="time"] input').forEach(x=>x.addEventListener('focus',()=>setRetentionMode('time')));
  document.querySelectorAll('[data-retention="size"] input').forEach(x=>x.addEventListener('focus',()=>setRetentionMode('size')));

  let activeDropdown=null;
  function closeDropdown(){dropdownMenu.classList.remove('show');dropdownMenu.innerHTML='';activeDropdown=null}
  document.addEventListener('pointerdown',e=>{if(activeDropdown && !dropdownMenu.contains(e.target) && !activeDropdown.contains(e.target)) closeDropdown()},true);
  document.querySelectorAll('.m3-fieldset.dropdown').forEach(field=>field.addEventListener('click',e=>{
    e.stopPropagation(); closeDropdown(); activeDropdown=field;
    const rect=field.getBoundingClientRect(); const phoneRect=phone.getBoundingClientRect();
    const options=(field.dataset.options||'').split('|');
    dropdownMenu.innerHTML='';
    options.forEach(opt=>{const b=document.createElement('button');b.className='dropdown-item';b.textContent=opt;b.onclick=()=>{field.querySelector('.m3-value').textContent=opt;setDirty(true);closeDropdown()};dropdownMenu.appendChild(b)});
    dropdownMenu.style.left=`${Math.min(rect.left,phoneRect.right-Math.max(180,rect.width))}px`;
    dropdownMenu.style.top=`${Math.min(rect.bottom+2,window.innerHeight-12-options.length*48)}px`;
    dropdownMenu.style.width=`${Math.max(180,rect.width)}px`;
    dropdownMenu.classList.add('show');
  }));

  // Source gestures are armed only outside the blob. The blob itself remains a
  // normal vertical-pan surface so the surrounding portfolio page can scroll.
  const gestureInteractive='button,input,a,[role=\"button\"],[role=\"switch\"],.m3-fieldset';
  function gestureMode(clientY,target){
    if(phone.classList.contains('settings-open')||phone.classList.contains('library-open'))return null;
    if(target instanceof Element && target.closest(gestureInteractive))return null;
    const blobRect=blobControl.getBoundingClientRect();
    if(clientY<blobRect.top)return 'settings';
    if(clientY>blobRect.bottom)return 'library';
    return null;
  }
  function completeGesture(mode,deltaY){
    if(mode==='settings'&&deltaY>=52){phone.classList.add('settings-open');return true}
    if(mode==='library'&&deltaY<=-52){phone.classList.add('library-open');return true}
    return false;
  }

  let dragStartY=null,dragMode=null;
  phone.addEventListener('pointerdown',e=>{
    if(e.pointerType==='touch')return;
    dragMode=gestureMode(e.clientY,e.target);
    dragStartY=dragMode?e.clientY:null;
  });
  phone.addEventListener('pointermove',e=>{
    if(dragStartY===null||!dragMode)return;
    if(completeGesture(dragMode,e.clientY-dragStartY)){dragStartY=null;dragMode=null}
  });
  const clearPointerGesture=()=>{dragStartY=null;dragMode=null};
  phone.addEventListener('pointerup',clearPointerGesture); phone.addEventListener('pointercancel',clearPointerGesture);

  let touchStartY=null,touchMode=null;
  phone.addEventListener('touchstart',e=>{
    if(e.touches.length!==1)return;
    const touch=e.touches[0];
    touchMode=gestureMode(touch.clientY,e.target);
    touchStartY=touchMode?touch.clientY:null;
    // Only the reduced gesture regions suppress page scrolling.
    if(touchMode)e.preventDefault();
  },{passive:false});
  phone.addEventListener('touchmove',e=>{
    if(touchStartY===null||!touchMode||e.touches.length!==1)return;
    e.preventDefault();
    const touch=e.touches[0];
    if(completeGesture(touchMode,touch.clientY-touchStartY)){touchStartY=null;touchMode=null}
  },{passive:false});
  const clearTouchGesture=()=>{touchStartY=null;touchMode=null};
  phone.addEventListener('touchend',clearTouchGesture); phone.addEventListener('touchcancel',clearTouchGesture);

  // WebGL port of AudioBlobView's RuntimeShader. Formula/constants are kept source-equivalent.
  function makeWebGLBlob(canvas){
    const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:true});
    if(!gl){ return makeFallbackBlob(canvas); }
    const vs=`attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}`;
    const precisionInfo=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT);
    const fragmentPrecision=precisionInfo&&precisionInfo.precision?'highp':'mediump';
    const fs=`precision ${fragmentPrecision} float;
uniform vec2 resolution;uniform float time;uniform float activity;uniform float life;uniform float active;
uniform vec4 bands0;uniform vec4 bands1;uniform vec4 primaryColor;uniform vec4 tertiaryColor;uniform vec4 pausedColor;
float ssInv(float a,float b,float x){return 1.0-smoothstep(a,b,x);}
void main(){
  float minSize=min(resolution.x,resolution.y);
  vec2 fragCoord=vec2(gl_FragCoord.x,resolution.y-gl_FragCoord.y);
  vec2 p=(fragCoord-resolution*0.5)/minSize;
  float angle=atan(p.y,p.x); float radius=length(p);
  float low=dot(bands0,vec4(0.34,0.30,0.21,0.15));
  float high=dot(bands1,vec4(0.34,0.30,0.21,0.15));
  float h3=sin(angle*3.0+time*0.78); float h7=sin(angle*7.0-time*0.39+1.8);
  float audioWave=h3*low*0.66+h7*high*0.44;
  float idle=h3*0.0056+h7*0.0024;
  float liveRadius=0.330+activity*0.018;
  float baseRadius=mix(0.095,liveRadius,life);
  float blobRadius=baseRadius+active*life*(idle+audioWave*(0.078+activity*0.020));
  float distanceToEdge=radius-blobRadius;
  float body=ssInv(-0.006,0.012,distanceToEdge);
  float glow=active*life*(1.0-body)*ssInv(0.0,0.024,max(distanceToEdge,0.0))*(0.055+activity*0.12);
  float gradientMix=clamp(0.46+p.x*0.9-p.y*0.55,0.0,1.0);
  vec4 activeColor=mix(primaryColor,tertiaryColor,gradientMix);
  float colorLife=smoothstep(0.36,0.86,life);
  vec4 bodyColor=mix(pausedColor,activeColor,colorLife);
  vec4 glowColor=mix(primaryColor,tertiaryColor,0.58);
  float alpha=body+glow;
  vec3 premultiplied=bodyColor.rgb*body+glowColor.rgb*glow;
  gl_FragColor=vec4(premultiplied,alpha);
}`;
    function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
    const prog=gl.createProgram();gl.attachShader(prog,shader(gl.VERTEX_SHADER,vs));gl.attachShader(prog,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(prog)||'Unable to link Reverb demo shader');gl.useProgram(prog);
    const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const locA=gl.getAttribLocation(prog,'a');gl.enableVertexAttribArray(locA);gl.vertexAttribPointer(locA,2,gl.FLOAT,false,0,0);
    const u={};['resolution','time','activity','life','active','bands0','bands1','primaryColor','tertiaryColor','pausedColor'].forEach(n=>u[n]=gl.getUniformLocation(prog,n));
    const hex=h=>[parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255,1];
    const p=hex('#2DD4BF'),t=hex('#ACCBE5'),q=hex('#2A3244');
    gl.uniform4fv(u.primaryColor,p);gl.uniform4fv(u.tertiaryColor,t);gl.uniform4fv(u.pausedColor,q);
    let targetLife=.38,currentLife=.38,targetActivity=0,currentActivity=0;const targetBands=new Float32Array(8),currentBands=new Float32Array(8);let activeState=false,last=performance.now(),signalClock=0;
    function resize(){const dpr=Math.min(devicePixelRatio||1,2);const r=canvas.getBoundingClientRect();const w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}gl.uniform2f(u.resolution,w,h)}
    function advance(dt){const normalized=Math.max(.25,Math.min(3,dt*30));let rate=targetActivity>currentActivity?.34:.16,mix=Math.min(.82,rate*normalized);currentActivity+=(targetActivity-currentActivity)*mix;for(let i=0;i<8;i++){rate=targetBands[i]>currentBands[i]?.30:.13;mix=Math.min(.8,rate*normalized);currentBands[i]+=(targetBands[i]-currentBands[i])*mix}rate=targetLife>currentLife?.18:.15;mix=Math.min(.65,rate*normalized);currentLife+=(targetLife-currentLife)*mix;if(Math.abs(currentLife-targetLife)<=.006)currentLife=targetLife}
    function syntheticSignal(ts){if(!activeState){targetActivity=0;targetBands.fill(0);return}if(ts-signalClock<85)return;signalClock=ts;const x=ts/1000;targetActivity=.20+.22*(.5+.5*Math.sin(x*1.7))+.09*Math.random();for(let i=0;i<8;i++){const harmonic=.5+.5*Math.sin(x*(1.13+i*.16)+i*.83);const pulse=.5+.5*Math.sin(x*.41+i*1.7);targetBands[i]=Math.max(.025,Math.min(.82,.07+harmonic*(.12+.21*targetActivity)+pulse*.07+Math.random()*.09))}}
    function frame(now){resize();const dt=Math.max(.001,Math.min(.1,(now-last)/1000));last=now;syntheticSignal(now);advance(dt);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(prog);gl.uniform1f(u.time,now/1000);gl.uniform1f(u.activity,currentActivity);gl.uniform1f(u.life,currentLife);gl.uniform1f(u.active,activeState?1:0);gl.uniform4fv(u.bands0,currentBands.subarray(0,4));gl.uniform4fv(u.bands1,currentBands.subarray(4,8));gl.drawArrays(gl.TRIANGLES,0,6);requestAnimationFrame(frame)}
    requestAnimationFrame(frame);
    return {setActive(v){activeState=v;targetLife=v?1:.38;if(!v){targetActivity=0;targetBands.fill(0)}}};
  }
  function makeBlobShader(canvas){
    try { return makeWebGLBlob(canvas); }
    catch (error) {
      console.warn('Reverb demo WebGL unavailable; using 2D fallback', error);
      return makeFallbackBlob(canvas);
    }
  }

  function makeFallbackBlob(sourceCanvas){
    let canvas=sourceCanvas,ctx=canvas.getContext('2d');
    if(!ctx && canvas.parentNode){
      // Once a WebGL context has been created the same canvas cannot switch to
      // 2D. Replace it so shader/link failures still get the animated fallback.
      const replacement=canvas.cloneNode(false);
      canvas.replaceWith(replacement); canvas=replacement; ctx=canvas.getContext('2d');
    }
    if(!ctx){
      canvas.style.background='radial-gradient(circle at 45% 42%,rgba(45,212,191,.9) 0 13%,rgba(172,203,229,.45) 22%,transparent 42%)';
      return {setActive(v){canvas.style.opacity=v?'1':'.56'}};
    }
    let targetLife=.38,currentLife=.38,targetActivity=0,currentActivity=0,activeState=false,last=performance.now(),signalClock=0;
    const targetBands=new Float32Array(8),currentBands=new Float32Array(8),x=new Float32Array(40),y=new Float32Array(40);
    function syntheticSignal(ts){
      if(!activeState){targetActivity=0;targetBands.fill(0);return}
      if(ts-signalClock<85)return; signalClock=ts;
      const x=ts/1000; targetActivity=.20+.22*(.5+.5*Math.sin(x*1.7))+.09*Math.random();
      for(let i=0;i<8;i++){
        const harmonic=.5+.5*Math.sin(x*(1.13+i*.16)+i*.83), pulse=.5+.5*Math.sin(x*.41+i*1.7);
        targetBands[i]=Math.max(.025,Math.min(.82,.07+harmonic*(.12+.21*targetActivity)+pulse*.07+Math.random()*.09));
      }
    }
    function advance(dt){
      const normalized=Math.max(.25,Math.min(3,dt*30));
      let rate=targetActivity>currentActivity?.34:.16,mix=Math.min(.82,rate*normalized);
      currentActivity+=(targetActivity-currentActivity)*mix;
      for(let i=0;i<8;i++){
        rate=targetBands[i]>currentBands[i]?.30:.13; mix=Math.min(.8,rate*normalized);
        currentBands[i]+=(targetBands[i]-currentBands[i])*mix;
      }
      rate=targetLife>currentLife?.18:.15; mix=Math.min(.65,rate*normalized);
      currentLife+=(targetLife-currentLife)*mix; if(Math.abs(currentLife-targetLife)<=.006)currentLife=targetLife;
    }
    function frame(now){
      const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
      const dt=Math.max(.001,Math.min(.1,(now-last)/1000)); last=now; syntheticSignal(now); advance(dt); ctx.clearRect(0,0,w,h);
      const min=Math.min(w,h),cx=w*.5,cy=h*.5,base=min*(.095+currentLife*(.235+currentActivity*.018));
      for(let i=0;i<40;i++){
        const angle=i/40*Math.PI*2-Math.PI/2, band=currentBands[Math.floor(i*8/40)];
        const idle=activeState?(Math.sin(angle*3+now/1000*.8)*min*.005+Math.sin(angle*5-now/1000*.55)*min*.0025):0;
        const radius=base+(activeState?band*min*.078+idle:0); x[i]=cx+Math.cos(angle)*radius; y[i]=cy+Math.sin(angle)*radius;
      }
      ctx.beginPath(); ctx.moveTo((x[0]+x[1])*.5,(y[0]+y[1])*.5);
      for(let i=1;i<=40;i++){const cur=i%40,next=(i+1)%40;ctx.quadraticCurveTo(x[cur],y[cur],(x[cur]+x[next])*.5,(y[cur]+y[next])*.5)}ctx.closePath();
      if(activeState){const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#2DD4BF');g.addColorStop(1,'#ACCBE5');ctx.fillStyle=g}else ctx.fillStyle='#2A3244';
      ctx.fill(); requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return{setActive(v){activeState=v;targetLife=v?1:.38;if(!v){targetActivity=0;targetBands.fill(0)}}};
  }
  const blobShader=makeBlobShader(document.getElementById('blobCanvas'));

}
