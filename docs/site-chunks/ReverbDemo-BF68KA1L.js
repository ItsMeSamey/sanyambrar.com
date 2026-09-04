import{O as e,X as t,Z as n,k as r}from"./site-app-DWxkniMd.js";var i=`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<title>Reverb</title>
<style>

:root{
  --primary:var(--site-accent-fg,var(--site-accent,#2DD4BF));
  --on-primary:var(--site-accent-on-fg,var(--site-on-fg,#003730));
  --primary-container:var(--site-accent-bg,color-mix(in srgb,var(--primary) 18%,var(--site-bg,#0D1324)));
  --on-primary-container:var(--site-accent-on-bg,var(--site-fg,#E2E9E7));
  --secondary:color-mix(in srgb,var(--site-fg,#E2E9E7) 68%,var(--site-bg,#0D1324));
  --on-secondary:var(--site-bg,#0D1324);
  --secondary-container:color-mix(in srgb,var(--site-fg,#E2E9E7) 14%,var(--site-bg,#0D1324));
  --on-secondary-container:color-mix(in srgb,var(--site-fg,#E2E9E7) 88%,var(--site-bg,#0D1324));
  --tertiary:var(--site-effort-fg,var(--primary));
  --blob-neutral:color-mix(in srgb,var(--site-fg,#E2E9E7) 44%,var(--site-bg,#0D1324));
  --blob-primary:color-mix(in srgb,var(--site-accent-fg,var(--site-accent,#2DD4BF)) 78%,var(--blob-neutral) 22%);
  --blob-tertiary:color-mix(in srgb,var(--blob-primary) 78%,var(--site-fg,#E2E9E7) 22%);
  --surface:color-mix(in srgb,var(--site-bg,#0D1324) 94%,var(--primary) 6%);
  --on-surface:var(--site-fg,#E2E9E7);
  --surface-variant:color-mix(in srgb,var(--on-surface) 18%,var(--surface));
  --on-surface-variant:var(--site-muted,color-mix(in srgb,var(--on-surface) 64%,var(--surface)));
  --outline:var(--site-line,color-mix(in srgb,var(--on-surface) 36%,var(--surface)));
  --outline-variant:color-mix(in srgb,var(--on-surface) 16%,var(--surface));
  --surface-container-low:color-mix(in srgb,var(--on-surface) 5%,var(--surface));
  --surface-container:color-mix(in srgb,var(--on-surface) 7%,var(--surface));
  --surface-container-high:color-mix(in srgb,var(--on-surface) 10%,var(--surface));
  --surface-container-highest:color-mix(in srgb,var(--on-surface) 14%,var(--surface));
  --error:var(--site-error-fg,var(--site-error,#FFB4AB));
  --scrim:color-mix(in srgb,var(--site-shadow-tint,#000) 32%,transparent);
  --reverb-stage:color-mix(in srgb,var(--site-bg,#080B12) 94%,var(--primary) 6%);
  --phone-frame:color-mix(in srgb,var(--on-surface) 30%,var(--surface));
  --phone-cutout:color-mix(in srgb,var(--on-surface) 42%,var(--surface));
  --status-h:24px; --nav-h:24px;
}
*{box-sizing:border-box;-webkit-user-select:none;user-select:none}
html,body{margin:0;min-height:100%;background:transparent;color:var(--on-surface);font-family:Roboto,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
button,input{font:inherit}
button{border:0;padding:0;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
@media(pointer:fine){
:host([data-cursor-mode="invert"]) *{cursor:none!important}
:host([data-cursor-mode="hardware"]) *,:host([data-cursor-mode="hardware"]) *::before,:host([data-cursor-mode="hardware"]) *::after{cursor:var(--samey-hw-dot),default!important}
:host([data-cursor-mode="hardware"]) input,:host([data-cursor-mode="hardware"]) textarea{cursor:var(--samey-hw-text),var(--samey-hw-dot),text!important}
:host([data-cursor-mode="hardware"]) input[type=range],:host([data-cursor-mode="hardware"]) [role=slider]{cursor:var(--samey-hw-grab),var(--samey-hw-dot),grab!important}
}
.stage{width:100%;height:100%;min-height:0;display:grid;place-items:center;padding:18px;background:transparent;position:relative;overflow:hidden}
.phone{width:min(412px,100%);height:min(820px,100%);min-height:0;max-height:820px;position:relative;overflow:hidden;border:6px solid var(--phone-frame);border-radius:38px;background:var(--surface);color:var(--on-surface);box-shadow:0 22px 56px color-mix(in srgb,var(--site-shadow-tint,#000) 22%,transparent),inset 0 0 0 1px color-mix(in srgb,var(--on-surface) 9%,transparent);isolation:isolate;z-index:2}
.phone::before{content:"";position:absolute;z-index:80;top:7px;left:50%;width:58px;height:5px;transform:translateX(-50%);border-radius:999px;background:var(--phone-cutout);opacity:.86;pointer-events:none}
.gesture-hint{--gesture-hint-opacity:.48;position:absolute;z-index:3;width:54px;height:96px;pointer-events:none;color:var(--on-surface-variant);opacity:var(--gesture-hint-opacity);filter:drop-shadow(0 2px 7px color-mix(in srgb,var(--site-shadow-tint,#000) 35%,transparent));animation:gesture-hint-life 6.75s linear 1 forwards}
.gesture-hint.left{left:max(10px,calc(50% - 270px));top:22%}
.gesture-hint.right{right:max(10px,calc(50% - 270px));bottom:18%}
.gesture-hint svg{width:100%;height:100%;overflow:visible}
.gesture-hint .gesture-finger{transform-origin:50% 50%;animation:gesture-down 2.25s cubic-bezier(.2,0,0,1) 3}
.gesture-hint.right .gesture-finger{animation-name:gesture-up}
.gesture-hint .gesture-path{opacity:.38;stroke-dasharray:4 5}
@keyframes gesture-down{0%,16%{transform:translateY(-10px);opacity:.18}38%,68%{opacity:.78}78%,100%{transform:translateY(14px);opacity:.12}}
@keyframes gesture-up{0%,16%{transform:translateY(12px);opacity:.18}38%,68%{opacity:.78}78%,100%{transform:translateY(-14px);opacity:.12}}
@keyframes gesture-hint-life{0%,88%{opacity:var(--gesture-hint-opacity)}100%{opacity:0}}
.screen{position:absolute;inset:0;background:var(--surface)}
.home{display:flex;flex-direction:column;transform:translateY(0);opacity:1;transition:transform 180ms cubic-bezier(.2,0,0,1),opacity 160ms linear}
.statusbar{height:var(--status-h);flex:none;background:var(--surface)}
.navbar{height:var(--nav-h);flex:none;background:var(--surface)}
.icon{display:block;width:24px;height:24px;fill:currentColor;overflow:visible}
.topbar{height:66px;position:relative;flex:none;padding:0 14px;background:var(--surface)}
.brand{position:absolute;left:50%;top:10px;transform:translateX(-50%);width:46px;height:46px;border-radius:15px;background:var(--surface);display:grid;place-items:center}
.brand svg{width:42px;height:42px}
.settings-button{position:absolute;right:14px;top:9px;width:48px;height:48px;background:transparent;color:var(--on-surface-variant);display:grid;place-items:center;border-radius:50%}
.settings-button svg{width:23px;height:23px}
.settings-button:active,.icon-button:active,.action-button:active{background:color-mix(in srgb,var(--on-surface) 8%,transparent)}
.capture{flex:1;min-height:0;padding:0 18px;display:flex;flex-direction:column;align-items:center}
.blob-area{width:100%;min-height:0;flex:1;display:grid;place-items:center}
.blob-control{background:transparent;border:0;padding:0;color:inherit;position:relative;display:grid;place-items:center;width:min(90%,372px);aspect-ratio:1;user-select:none;touch-action:pan-y;transition:transform 100ms linear}
.blob-control.pressed{transform:scale(.96)}
#blobCanvas{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none}
.blob-content{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;pointer-events:none;color:var(--on-surface-variant)}
.blob-control.live .blob-content{color:var(--on-primary)}
.blob-content .capture-icon{width:38px;height:38px}
.blob-time{margin-top:10px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:18px;font-weight:500;line-height:22px;white-space:nowrap}
.blob-summary{margin-top:2px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px;line-height:18px;color:currentColor;opacity:.76;white-space:nowrap;max-height:18px;transition:opacity 120ms linear,max-height 120ms linear}
.blob-summary.hidden{opacity:0;max-height:0;margin-top:0}
.buffer-selector{flex:none;padding:6px;border-radius:22px;background:var(--surface-container-high);display:flex;gap:6px}
.buffer-segment{width:112px;min-height:52px;border-radius:16px;background:var(--surface-container-highest);color:var(--on-surface-variant);padding:8px 12px;text-align:center;display:flex;flex-direction:column;justify-content:center;align-items:center}
.buffer-segment.selected{background:var(--primary);color:var(--on-primary)}
.buffer-segment .label{font-size:14px;font-weight:600;line-height:20px;letter-spacing:.1px;white-space:nowrap}
.buffer-segment .stat{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;font-weight:400;line-height:16px;opacity:.78;white-space:nowrap}
.control-gap{height:10px;flex:none}
.actions-surface{flex:none;background:var(--surface-container-high);border-radius:28px;padding:8px;display:flex;gap:8px}
.action-button{width:54px;height:54px;border-radius:50%;background:transparent;display:grid;place-items:center;color:var(--on-surface)}
.action-button.destructive{color:var(--error)}
.action-button svg{width:25px;height:25px}
.capture-bottom{height:18px;flex:none}

/* Settings screen */
.settings-screen{z-index:5;display:flex;flex-direction:column;transform:translateY(-100%);transition:transform 220ms cubic-bezier(.2,0,0,1);background:var(--surface)}
.phone.settings-open .settings-screen{transform:translateY(0)}
.phone.settings-open .home{transform:translateY(10%);opacity:0}
.settings-appbar{height:64px;flex:none;display:grid;grid-template-columns:64px 1fr 64px;align-items:center;background:var(--surface)}
.settings-appbar h1{margin:0;text-align:center;font-size:22px;line-height:28px;font-weight:700}
.icon-button{width:48px;height:48px;margin:auto;background:transparent;border-radius:50%;display:grid;place-items:center;color:var(--on-surface)}
.icon-button.disabled{color:color-mix(in srgb,var(--on-surface) 38%,transparent);pointer-events:none}
.settings-body{flex:1;min-height:0;overflow:auto;background:var(--surface);padding-bottom:24px;scrollbar-width:none}
.settings-body::-webkit-scrollbar,.library-list::-webkit-scrollbar{display:none}
.section-title{font-size:16px;line-height:24px;font-weight:600;color:var(--on-surface);padding:12px 16px}
.reliability-card{margin:4px 16px;border-radius:20px;background:var(--surface-container-low);padding:12px 14px;display:flex;align-items:center;gap:8px}
.reliability-copy{min-width:0;flex:1;padding-right:8px}
.reliability-copy .title{font-size:16px;line-height:24px;color:var(--on-surface)}
.reliability-copy .summary{font-size:12px;line-height:16px;color:var(--on-surface-variant);margin-top:2px}
.text-button{background:transparent;color:var(--primary);font-size:14px;line-height:20px;font-weight:600;letter-spacing:.1px;padding:10px 12px;border-radius:20px;white-space:nowrap}
.text-button:active{background:color-mix(in srgb,var(--primary) 8%,transparent)}
.spacer12{height:12px}
.spacer8{height:8px}
.spacer16{height:16px}
.field-wrap{padding:12px 16px}
.field-wrap.compact{padding:0}
.field-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;padding:0 16px}
.field-row + .field-row{padding-top:12px}
.m3-fieldset{position:relative;margin:0;border:1px solid var(--outline);border-radius:18px;min-height:56px;padding:0 44px 0 16px;color:var(--on-surface);background:transparent;display:flex;align-items:center;min-width:0;transition:opacity 120ms,border-color 120ms}
.m3-fieldset legend{padding:0 4px;color:var(--on-surface-variant);font-size:12px;line-height:16px;margin-left:-8px}
.m3-fieldset.dropdown{cursor:pointer}
.m3-value{font-size:16px;line-height:24px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.m3-prefix{color:var(--on-surface);margin-right:3px}
.dropdown-arrow{position:absolute;right:15px;top:50%;margin-top:-12px;width:24px;height:24px;color:var(--on-surface-variant);display:grid;place-items:center}
.dropdown-arrow:after{content:"";width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid currentColor}
.field-shell{min-width:0}
.field-shell.inactive{opacity:.6}
.supporting{font-size:12px;line-height:16px;color:var(--on-surface-variant);padding:4px 16px 0;min-height:20px}
.buffer-label{font-size:14px;line-height:20px;font-weight:600;letter-spacing:.1px;color:var(--on-surface-variant);padding:0 4px 8px}
.retention-block{padding:0 16px}
.retention-fields{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}
.retention-fields input{width:100%;border:0;outline:0;background:transparent;color:inherit;font-size:16px;line-height:24px;padding:0;min-width:0}
.export-limit{font-size:12px;line-height:16px;color:var(--on-surface-variant);padding:8px 20px}
.storage-card{margin:4px 16px;border-radius:20px;background:var(--surface-container-low);padding:10px 16px}
.storage-row{display:flex;align-items:center;min-height:48px}
.storage-path{flex:1;font-size:16px;line-height:24px;color:var(--on-surface-variant);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.storage-row .icon-button{margin:0}
.storage-card .text-button{margin-left:-12px}
.switch-row{margin:4px 16px;border-radius:20px;background:var(--surface-container-low);padding:12px 14px;display:flex;align-items:center}
.switch-copy{min-width:0;flex:1;padding-right:8px}
.switch-copy .title{font-size:16px;line-height:24px}
.switch-copy .summary{font-size:12px;line-height:16px;color:var(--on-surface-variant);margin-top:2px}
.m3-switch{width:52px;height:32px;padding:4px;border-radius:18px;background:var(--outline-variant);position:relative;flex:none;transition:background 150ms}
.m3-switch:before{content:"";position:absolute;width:24px;height:24px;left:4px;top:4px;border-radius:50%;background:var(--on-surface-variant);transition:transform 150ms,background 150ms}
.m3-switch.on{background:var(--primary)}
.m3-switch.on:before{transform:translateX(20px);background:var(--on-primary)}
.dropdown-menu{position:fixed;z-index:30;min-width:170px;max-width:300px;background:var(--surface-container);border-radius:4px;padding:8px 0;box-shadow:0 6px 18px color-mix(in srgb,var(--site-shadow-tint,#000) 48%,transparent);display:none;overflow:hidden}
.dropdown-menu.show{display:block}
.dropdown-item{display:block;width:100%;min-height:48px;padding:12px 16px;text-align:left;background:transparent;color:var(--on-surface);font-size:14px;line-height:20px}
.dropdown-item:hover{background:color-mix(in srgb,var(--on-surface) 8%,transparent)}

/* Library modal bottom sheet */
.scrim{position:absolute;inset:0;z-index:10;background:rgba(0,0,0,0);pointer-events:none;transition:background 180ms linear}
.library-sheet{position:absolute;z-index:11;left:0;right:0;bottom:0;height:88%;background:var(--surface-container-low);border-radius:28px 28px 0 0;transform:translateY(102%);transition:transform 240ms cubic-bezier(.2,0,0,1);display:flex;flex-direction:column;overflow:hidden}
.phone.library-open .scrim{background:var(--scrim);pointer-events:auto}
.phone.library-open .library-sheet{transform:translateY(0)}
.drag-handle-wrap{height:32px;flex:none;display:grid;place-items:center}
.drag-handle{width:32px;height:4px;border-radius:2px;background:var(--on-surface-variant);opacity:.4}
.library-screen{flex:1;min-height:0;display:flex;flex-direction:column}
.library-list{flex:1;min-height:0;overflow:auto;padding:0 16px 84px;scrollbar-width:none}
.date-header{font-size:14px;line-height:20px;font-weight:600;letter-spacing:.04px;color:var(--on-surface-variant);padding:28px 0 8px}
.recording-card{width:100%;border-radius:16px;background:var(--surface-container-high);margin-bottom:10px;padding:12px 14px;display:flex;align-items:center;gap:12px;text-align:left;box-shadow:0 1px 2px color-mix(in srgb,var(--site-shadow-tint,#000) 16%,transparent)}
.recording-card:active{background:var(--surface-container-highest)}
.audio-round{width:44px;height:44px;border-radius:50%;background:var(--surface-variant);display:grid;place-items:center;flex:none}
.audio-round svg{width:24px;height:24px}
.recording-main{min-width:0;flex:1}
.recording-title{display:block;font-size:16px;line-height:24px;font-weight:500;color:var(--on-surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.recording-subtitle{display:block;margin-top:4px;font-size:14px;line-height:20px;color:var(--on-surface-variant);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.recording-trail{text-align:right;flex:none}
.recording-trail .top{display:block;font-size:14px;line-height:20px;font-weight:600;color:var(--on-surface)}
.recording-trail .bottom{display:block;margin-top:4px;font-size:12px;line-height:16px;color:var(--on-surface-variant)}

/* lightweight dialogs used only for stub interactions */
.dialog-layer{position:absolute;inset:0;z-index:40;background:var(--scrim);display:none;place-items:center;padding:28px}
.dialog-layer.show{display:grid}
.dialog{width:100%;max-width:330px;border-radius:18px;background:var(--surface-container-high);padding:22px 24px;color:var(--on-surface);box-shadow:0 16px 40px color-mix(in srgb,var(--site-shadow-tint,#000) 48%,transparent)}
.dialog-title-row{display:flex;align-items:center;margin-bottom:12px}
.dialog-title{font-size:22px;line-height:28px;font-weight:700;flex:1}
.dialog-body{font-size:14px;line-height:20px;color:var(--on-surface-variant)}
.about-scrim{position:absolute;inset:0;z-index:41;background:rgba(0,0,0,0);pointer-events:none;transition:background 160ms linear}
.about-sheet{position:absolute;z-index:42;left:0;right:0;top:0;border-radius:0 0 32px 32px;background:var(--surface-container-high);box-shadow:0 16px 42px color-mix(in srgb,var(--site-shadow-tint,#000) 50%,transparent);padding:calc(var(--status-h) + 12px) 24px 26px;transform:translateY(-105%);opacity:.96;transition:transform 220ms cubic-bezier(.2,0,0,1),opacity 160ms linear}
.phone.about-open .about-scrim{background:var(--scrim);pointer-events:auto}
.phone.about-open .about-sheet{transform:translateY(0);opacity:1}
.about-close{position:absolute;right:12px;top:calc(var(--status-h) + 4px);margin:0}
.about-logo{width:104px;height:104px;margin:0 auto;border-radius:30px;background:var(--surface);display:grid;place-items:center}
.about-logo svg{width:90px;height:90px}
.about-name{margin-top:14px;text-align:center;font-size:24px;line-height:30px;font-weight:600}
.about-version{text-align:center;margin-top:2px;color:var(--on-surface-variant);font-size:14px;line-height:20px}
.about-repo{width:100%;margin-top:18px;text-decoration:none;color:inherit;border-radius:20px;background:var(--surface-container-highest);padding:15px 18px;display:flex;align-items:center;gap:14px;text-align:left}
.about-repo:active{background:color-mix(in srgb,var(--surface-container-highest) 88%,var(--on-surface) 12%)}
.about-repo svg{width:24px;height:24px;flex:none}
.about-repo-copy{min-width:0;display:flex;flex-direction:column;gap:2px}
.about-repo-copy strong{font-size:14px;line-height:20px;font-weight:600}
.about-repo-copy span{color:var(--on-surface-variant);font-size:12px;line-height:16px}
.toast{position:absolute;left:50%;bottom:92px;z-index:50;transform:translate(-50%,10px);background:var(--surface-container-highest);color:var(--on-surface);padding:10px 14px;border-radius:12px;font-size:13px;line-height:18px;opacity:0;pointer-events:none;transition:opacity 160ms,transform 160ms;white-space:nowrap}
.toast.show{opacity:1;transform:translate(-50%,0)}


:host([data-fullscreen]) .stage{padding:0;background:transparent}
:host([data-fullscreen]) .phone{width:100%;height:100%;max-height:none;border:0;border-radius:0;box-shadow:none}
:host([data-fullscreen]) .phone::before{display:none}
:host([data-fullscreen]) .gesture-hint{display:none}
@media(max-width:500px){
  .stage{padding:0 12px;background:transparent}
  .phone{width:100%;height:100%;max-height:none}
  .gesture-hint.left{left:14px}.gesture-hint.right{right:14px}
  .gesture-hint{--gesture-hint-opacity:.38;z-index:4}
}
@media(prefers-reduced-motion:reduce){.gesture-hint{animation:none;opacity:0}.gesture-hint .gesture-finger{animation:none}}
</style>
</head>
<body>
<div class="stage">
  <div class="gesture-hint left" aria-hidden="true">
    <svg viewBox="0 0 54 96" fill="none">
      <path class="gesture-path" d="M27 12v56" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M20 61l7 8 7-8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <g class="gesture-finger">
        <path d="M27 21a4 4 0 0 1 4 4v18.5l2.4-2.4a3.9 3.9 0 0 1 5.5 0 3.8 3.8 0 0 1 .8 1.2l1.3-1.1a3.9 3.9 0 0 1 5.4.5c.6.8.9 1.7.9 2.7v8.1C47.3 62.2 40 69 30.6 69h-1.2c-5.4 0-10.5-2.6-13.6-7l-5.1-7.2a3.9 3.9 0 0 1 6.1-4.8l6.2 6.7V25a4 4 0 0 1 4-4Z" fill="var(--surface-container-highest)" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="27" cy="17" r="3" fill="var(--surface)" stroke="var(--primary)" stroke-width="1.8"/>
      </g>
    </svg>
  </div>
  <div class="gesture-hint right" aria-hidden="true">
    <svg viewBox="0 0 54 96" fill="none">
      <path class="gesture-path" d="M27 84V28" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M20 35l7-8 7 8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <g class="gesture-finger">
        <path d="M27 41a4 4 0 0 1 4 4v18.5l2.4-2.4a3.9 3.9 0 0 1 5.5 0 3.8 3.8 0 0 1 .8 1.2l1.3-1.1a3.9 3.9 0 0 1 5.4.5c.6.8.9 1.7.9 2.7v8.1C47.3 82.2 40 89 30.6 89h-1.2c-5.4 0-10.5-2.6-13.6-7l-5.1-7.2a3.9 3.9 0 0 1 6.1-4.8l6.2 6.7V45a4 4 0 0 1 4-4Z" fill="var(--surface-container-highest)" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="27" cy="37" r="3" fill="var(--surface)" stroke="var(--primary)" stroke-width="1.8"/>
      </g>
    </svg>
  </div>
<div class="phone" id="phone">
  <section class="screen home" id="homeScreen">
    <div class="statusbar"></div>
    <header class="topbar">
      <button class="brand" id="brandButton" aria-label="Reverb">
        <svg viewBox="0 0 512 512" aria-hidden="true">
          <g transform="translate(44.5 0)" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="26">
            <path d="M183.686,358 L212.357,154 L278.357,154 C328.357,154 357.859,186 351.676,230 C345.492,274 306.995,306 256.995,306 L190.995,306" stroke="var(--primary)" stroke-opacity=".16"/>
            <path d="M252.995,306 L337.686,358" stroke="var(--primary)" stroke-opacity=".16"/>
            <path d="M155.686,358 L184.357,154 L250.357,154 C300.357,154 329.859,186 323.676,230 C317.492,274 278.995,306 228.995,306 L162.995,306" stroke="var(--primary)" stroke-opacity=".34"/>
            <path d="M224.995,306 L309.686,358" stroke="var(--primary)" stroke-opacity=".34"/>
            <path d="M127.686,358 L156.357,154 L222.357,154 C272.357,154 301.859,186 295.676,230 C289.492,274 250.995,306 200.995,306 L134.995,306" stroke="var(--on-surface)"/>
            <path d="M196.995,306 L281.686,358" stroke="var(--on-surface)"/>
          </g>
        </svg>
      </button>
      <button class="settings-button" id="openSettings" aria-label="Open settings">
        <svg class="icon" viewBox="0 0 24 24"><path d="M19.1,12.9c0,-0.3 0.1,-0.6 0.1,-0.9s0,-0.6 -0.1,-0.9l2,-1.6c0.2,-0.1 0.2,-0.4 0.1,-0.6l-1.9,-3.3c-0.1,-0.2 -0.4,-0.3 -0.6,-0.2l-2.4,1c-0.5,-0.4 -1.1,-0.7 -1.7,-0.9l-0.4,-2.5c0,-0.2 -0.2,-0.4 -0.5,-0.4h-3.8c-0.2,0 -0.4,0.2 -0.5,0.4l-0.4,2.5c-0.6,0.2 -1.2,0.5 -1.7,0.9l-2.4,-1c-0.2,-0.1 -0.5,0 -0.6,0.2l-1.9,3.3c-0.1,0.2 -0.1,0.5 0.1,0.6l2,1.6c0,0.3 -0.1,0.6 -0.1,0.9s0,0.6 0.1,0.9l-2,1.6c-0.2,0.1 -0.2,0.4 -0.1,0.6l1.9,3.3c0.1,0.2 0.4,0.3 0.6,0.2l2.4,-1c0.5,0.4 1.1,0.7 1.7,0.9l0.4,2.5c0,0.2 0.2,0.4 0.5,0.4h3.8c0.2,0 0.4,-0.2 0.5,-0.4l0.4,-2.5c0.6,-0.2 1.2,-0.5 1.7,-0.9l2.4,1c0.2,0.1 0.5,0 0.6,-0.2l1.9,-3.3c0.1,-0.2 0.1,-0.5 -0.1,-0.6zM12,15.6c-2,0 -3.6,-1.6 -3.6,-3.6S10,8.4 12,8.4s3.6,1.6 3.6,3.6 -1.6,3.6 -3.6,3.6z"/></svg>
      </button>
    </header>

    <main class="capture">
      <div class="blob-area">
        <button class="blob-control" id="blobControl" aria-label="Tap to start capture">
          <canvas id="blobCanvas"></canvas>
          <div class="blob-content">
            <svg class="icon capture-icon" id="blobIcon" viewBox="0 0 24 24" aria-hidden="true"><path id="blobIconPath" d="M3,14c0,-0.55 0.45,-1 1,-1s1,0.45 1,1v2c0,0.55 -0.45,1 -1,1s-1,-0.45 -1,-1zM6.5,11c0,-0.55 0.45,-1 1,-1s1,0.45 1,1v8c0,0.55 -0.45,1 -1,1s-1,-0.45 -1,-1zM10,8c0,-0.55 0.45,-1 1,-1s1,0.45 1,1v14c0,0.55 -0.45,1 -1,1s-1,-0.45 -1,-1zM13.5,5c0,-0.55 0.45,-1 1,-1s1,0.45 1,1v14c0,0.55 -0.45,1 -1,1s-1,-0.45 -1,-1zM17,8c0,-0.55 0.45,-1 1,-1s1,0.45 1,1v8c0,0.55 -0.45,1 -1,1s-1,-0.45 -1,-1zM20.5,11c0,-0.55 0.45,-1 1,-1s1,0.45 1,1v2c0,0.55 -0.45,1 -1,1s-1,-0.45 -1,-1z"/></svg>
            <div class="blob-time" id="blobTime">12:48</div>
            <div class="blob-summary hidden" id="blobSummary">22.5 MiB</div>
          </div>
        </button>
      </div>

      <div class="buffer-selector" role="radiogroup" aria-label="Buffer">
        <button class="buffer-segment selected" data-buffer="one"><span class="label">One-shot</span><span class="stat" id="oneStat">12:48</span></button>
        <button class="buffer-segment" data-buffer="loop"><span class="label">Looping</span><span class="stat" id="loopStat">47:19</span></button>
      </div>
      <div class="control-gap"></div>
      <div class="actions-surface">
        <button class="action-button" data-toast="Export full" aria-label="Export full"><svg class="icon" viewBox="0 0 24 24"><path d="M17,3H5c-1.11,0 -2,0.9 -2,2v14c0,1.1 0.89,2 2,2h14c1.1,0 2,-0.9 2,-2V7l-4,-4zM12,19c-1.66,0 -3,-1.34 -3,-3s1.34,-3 3,-3 3,1.34 3,3 -1.34,3 -3,3zM15,9H5V5h10v4z"/></svg></button>
        <button class="action-button" data-toast="Export range" aria-label="Export range"><svg class="icon" viewBox="0 0 24 24"><path d="M4,4h2v16H4zM18,4h2v16h-2zM8,7h8v2H8zM11,11h2v4.17l1.59,-1.58L16,15l-4,4 -4,-4 1.41,-1.41L11,15.17z"/></svg></button>
        <button class="action-button destructive" data-toast="Clear" aria-label="Clear"><svg class="icon" viewBox="0 0 24 24"><path d="M9,3h6l1,1h4v2H4V4h4zM7,8h10v11c0,1.1 -0.9,2 -2,2H9c-1.1,0 -2,-0.9 -2,-2z"/></svg></button>
        <button class="action-button" id="openLibrary" aria-label="Files"><svg class="icon" viewBox="0 0 24 24"><path d="M14,2H6c-1.1,0 -2,0.9 -2,2v16c0,1.1 0.9,2 2,2h12c1.1,0 2,-0.9 2,-2V8zM14,4.5 17.5,8H14zM12,18v-3.55c0.37,-0.21 0.62,-0.61 0.62,-1.06 0,-0.67 -0.54,-1.21 -1.21,-1.21S10.2,12.72 10.2,13.39c0,0.45 0.25,0.85 0.62,1.06V18c-0.37,0.21 -0.62,0.61 -0.62,1.06 0,0.67 0.54,1.21 1.21,1.21s1.21,-0.54 1.21,-1.21c0,-0.45 -0.25,-0.85 -0.62,-1.06z"/></svg></button>
      </div>
      <div class="capture-bottom"></div>
    </main>
    <div class="navbar"></div>
  </section>

  <section class="screen settings-screen" id="settingsScreen">
    <div class="statusbar"></div>
    <header class="settings-appbar">
      <button class="icon-button" id="settingsNav" aria-label="Close">
        <svg class="icon" id="settingsNavClose" viewBox="0 0 24 24"><path d="M6.5,6.5L17.5,17.5M17.5,6.5L6.5,17.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
        <svg class="icon" id="settingsNavUndo" viewBox="0 0 24 24" style="display:none"><path d="M12.5,8C9.99,8 7.7,9.01 6,10.65V6H4v8h8v-2H7.26c1.31,-1.24 3.14,-2 5.24,-2 3.86,0 7.19,2.95 7.5,6.8h2.02C21.71,11.85 17.68,8 12.5,8z"/></svg>
      </button>
      <h1>Settings</h1>
      <button class="icon-button disabled" id="settingsDone" aria-label="Done"><svg class="icon" viewBox="0 0 24 24"><path d="M5.8,12.6L9.8,16.6M9.8,16.6L18.2,8.2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    </header>
    <div class="settings-body" id="settingsBody">
      <div class="section-title">Background</div>
      <div class="reliability-card">
        <div class="reliability-copy"><div class="title">Battery optimization</div><div class="summary">Battery optimization: restricted</div></div>
        <button class="text-button" data-toast="Battery settings">Battery settings</button>
      </div>
      <div class="spacer12"></div>

      <div class="field-wrap">
        <fieldset class="m3-fieldset dropdown" data-options="System|Light|Dark"><legend>Theme</legend><span class="m3-value">System</span><span class="dropdown-arrow"></span></fieldset>
      </div>
      <div class="spacer12"></div>

      <div class="section-title">Retention</div>
      <div class="retention-block" data-buffer-retention="one">
        <div class="buffer-label">One-shot</div>
        <div class="retention-fields">
          <div class="field-shell" data-retention="time">
            <fieldset class="m3-fieldset"><legend>Time</legend><span class="m3-prefix"></span><input value="30:00" inputmode="text" aria-label="One-shot time"></fieldset>
          </div>
          <div class="field-shell inactive" data-retention="size">
            <fieldset class="m3-fieldset"><legend>Size (MiB)</legend><span class="m3-prefix">=</span><input value="151.4" inputmode="decimal" aria-label="One-shot size"></fieldset>
            <div class="supporting">Estimated file size: 151.4 MiB</div>
          </div>
        </div>
      </div>
      <div class="spacer8"></div>
      <div class="retention-block" data-buffer-retention="loop">
        <div class="buffer-label">Looping</div>
        <div class="retention-fields">
          <div class="field-shell" data-retention="time">
            <fieldset class="m3-fieldset"><legend>Time</legend><span class="m3-prefix"></span><input value="2:00:00" inputmode="text" aria-label="Looping time"></fieldset>
          </div>
          <div class="field-shell inactive" data-retention="size">
            <fieldset class="m3-fieldset"><legend>Size (MiB)</legend><span class="m3-prefix">=</span><input value="605.6" inputmode="decimal" aria-label="Looping size"></fieldset>
            <div class="supporting">Estimated file size: 605.6 MiB</div>
          </div>
        </div>
      </div>
      <div class="export-limit">Export limit: 13:31:35</div>
      <div class="spacer12"></div>

      <div class="section-title">Audio</div>
      <div class="field-wrap" style="padding-top:0;padding-bottom:0">
        <fieldset class="m3-fieldset dropdown" data-options="Mono|Stereo"><legend>Channels</legend><span class="m3-value">Mono</span><span class="dropdown-arrow"></span></fieldset>
      </div>
      <div class="field-row">
        <fieldset class="m3-fieldset dropdown" data-options="8-bit integer|16-bit integer|32-bit float"><legend>Bit depth</legend><span class="m3-value">16-bit integer</span><span class="dropdown-arrow"></span></fieldset>
        <fieldset class="m3-fieldset dropdown" data-options="96 kHz|88.2 kHz|64 kHz|48 kHz|44.1 kHz|32 kHz|24 kHz|22.05 kHz|16 kHz|12 kHz|11.025 kHz|8 kHz|7.35 kHz"><legend>Rate</legend><span class="m3-value">44.1 kHz</span><span class="dropdown-arrow"></span></fieldset>
      </div>
      <div class="field-row">
        <fieldset class="m3-fieldset dropdown" data-options="Voice|Voice comm|Voice perf|Camcorder|Default|Mic|Unprocessed"><legend>Source</legend><span class="m3-value">Voice</span><span class="dropdown-arrow"></span></fieldset>
        <fieldset class="m3-fieldset dropdown" data-options="System|Prefer mic"><legend>Route</legend><span class="m3-value">System</span><span class="dropdown-arrow"></span></fieldset>
      </div>

      <div class="section-title">Storage</div>
      <div class="storage-card">
        <div class="storage-row"><div class="storage-path">App storage/Reverb</div><button class="icon-button" data-toast="Choose folder" aria-label="Choose"><svg class="icon" viewBox="0 0 24 24"><path d="M3,6c0,-1.1 0.9,-2 2,-2h4.2c0.5,0 1,0.2 1.4,0.6L12,6h7c1.1,0 2,0.9 2,2v8c0,2.2 -1.8,4 -4,4H7c-2.2,0 -4,-1.8 -4,-4z"/></svg></button></div>
        <button class="text-button" data-toast="No recordings to move">Move existing</button>
      </div>

      <div class="spacer16"></div>
      <div class="switch-row">
        <div class="switch-copy"><div class="title">Keep CPU awake</div><div class="summary">Generally not recommended. Keeps the CPU awake while live buffering, improving survival at a higher battery cost.</div></div>
        <button class="m3-switch" id="wakeSwitch" role="switch" aria-checked="false" aria-label="Keep CPU awake"></button>
      </div>
    </div>
    <div class="navbar"></div>
  </section>

  <div class="scrim" id="libraryScrim"></div>
  <section class="library-sheet" id="librarySheet" aria-label="Files">
    <div class="drag-handle-wrap"><div class="drag-handle"></div></div>
    <div class="library-screen">
      <div class="library-list">
        <div class="date-header">30 August 2026</div>
        <button class="recording-card" data-recording="Interview notes.wav">
          <span class="audio-round"><svg class="icon" viewBox="0 0 24 24"><path d="M5,9h2v6H5zM9,6h2v12H9zM13,8h2v8H13zM17,10h2v4H17z"/></svg></span>
          <span class="recording-main"><span class="recording-title">Interview notes.wav</span><span class="recording-subtitle">18m 42s • WAV · PCM 16</span></span>
          <span class="recording-trail"><span class="top">8:41 AM</span><span class="bottom">94.4 MiB</span></span>
        </button>
        <button class="recording-card" data-recording="Guitar idea.wav">
          <span class="audio-round"><svg class="icon" viewBox="0 0 24 24"><path d="M5,9h2v6H5zM9,6h2v12H9zM13,8h2v8H13zM17,10h2v4H17z"/></svg></span>
          <span class="recording-main"><span class="recording-title">Guitar idea.wav</span><span class="recording-subtitle">3m 17s • WAV · PCM 16</span></span>
          <span class="recording-trail"><span class="top">7:14 AM</span><span class="bottom">16.6 MiB</span></span>
        </button>
        <div class="date-header">29 August 2026</div>
        <button class="recording-card" data-recording="Meeting.wav">
          <span class="audio-round"><svg class="icon" viewBox="0 0 24 24"><path d="M5,9h2v6H5zM9,6h2v12H9zM13,8h2v8H13zM17,10h2v4H17z"/></svg></span>
          <span class="recording-main"><span class="recording-title">Meeting.wav</span><span class="recording-subtitle">42m 8s • WAV · PCM 16</span></span>
          <span class="recording-trail"><span class="top">4:26 PM</span><span class="bottom">212.6 MiB</span></span>
        </button>
        <button class="recording-card" data-recording="Recording 2026-08-29 10-12-03.wav">
          <span class="audio-round"><svg class="icon" viewBox="0 0 24 24"><path d="M5,9h2v6H5zM9,6h2v12H9zM13,8h2v8H13zM17,10h2v4H17z"/></svg></span>
          <span class="recording-main"><span class="recording-title">Recording 2026-08-29 10-12-03.wav</span><span class="recording-subtitle">7m 54s • WAV · PCM 16</span></span>
          <span class="recording-trail"><span class="top">10:12 AM</span><span class="bottom">40.0 MiB</span></span>
        </button>
      </div>
    </div>
  </section>

  <div class="dropdown-menu" id="dropdownMenu"></div>
  <div class="about-scrim" id="aboutScrim"></div>
  <section class="about-sheet" id="aboutSheet" role="dialog" aria-modal="true" aria-label="About Reverb">
    <button class="icon-button about-close" id="aboutClose" aria-label="Close"><svg class="icon" viewBox="0 0 24 24"><path d="M6.5,6.5L17.5,17.5M17.5,6.5L6.5,17.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg></button>
    <div class="about-logo" aria-hidden="true">
      <svg viewBox="0 0 512 512">
        <g transform="translate(44.5 0)" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="26">
          <path d="M183.686,358 L212.357,154 L278.357,154 C328.357,154 357.859,186 351.676,230 C345.492,274 306.995,306 256.995,306 L190.995,306" stroke="var(--primary)" stroke-opacity=".16"/><path d="M252.995,306 L337.686,358" stroke="var(--primary)" stroke-opacity=".16"/>
          <path d="M155.686,358 L184.357,154 L250.357,154 C300.357,154 329.859,186 323.676,230 C317.492,274 278.995,306 228.995,306 L162.995,306" stroke="var(--primary)" stroke-opacity=".34"/><path d="M224.995,306 L309.686,358" stroke="var(--primary)" stroke-opacity=".34"/>
          <path d="M127.686,358 L156.357,154 L222.357,154 C272.357,154 301.859,186 295.676,230 C289.492,274 250.995,306 200.995,306 L134.995,306" stroke="var(--on-surface)"/><path d="M196.995,306 L281.686,358" stroke="var(--on-surface)"/>
        </g>
      </svg>
    </div>
    <div class="about-name">Reverb</div>
    <div class="about-version">Version 0.1.0</div>
    <a class="about-repo" id="aboutRepo" href="https://github.com/SmallThingz/reverb" target="_blank" rel="noopener noreferrer" aria-label="GitHub repository SmallThingz/reverb">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12,2C6.48,2 2,6.58 2,12.22c0,4.5 2.87,8.31 6.84,9.65c0.5,0.1 0.68,-0.22 0.68,-0.49c0,-0.24 -0.01,-1.04 -0.01,-1.89c-2.78,0.62 -3.37,-1.21 -3.37,-1.21c-0.45,-1.18 -1.11,-1.49 -1.11,-1.49c-0.91,-0.64 0.07,-0.63 0.07,-0.63c1,0.07 1.53,1.05 1.53,1.05c0.9,1.57 2.36,1.12 2.94,0.85c0.09,-0.67 0.35,-1.12 0.63,-1.37c-2.22,-0.26 -4.55,-1.14 -4.55,-5.06c0,-1.12 0.39,-2.03 1.03,-2.75c-0.1,-0.26 -0.45,-1.31 0.1,-2.73c0,0 0.84,-0.28 2.75,1.05c0.8,-0.23 1.65,-0.35 2.5,-0.35c0.85,0 1.7,0.12 2.5,0.35c1.91,-1.33 2.75,-1.05 2.75,-1.05c0.55,1.42 0.2,2.47 0.1,2.73c0.64,0.72 1.03,1.63 1.03,2.75c0,3.93 -2.33,4.8 -4.56,5.05c0.36,0.32 0.68,0.93 0.68,1.88c0,1.36 -0.01,2.45 -0.01,2.78c0,0.27 0.18,0.6 0.69,0.49C19.13,20.52 22,16.72 22,12.22C22,6.58 17.52,2 12,2z"/></svg>
      <span class="about-repo-copy"><strong>GitHub repository</strong><span>SmallThingz/reverb</span></span>
    </a>
  </section>
  <div class="dialog-layer" id="dialogLayer"><div class="dialog"><div class="dialog-title-row"><div class="dialog-title" id="dialogTitle">Reverb</div><button class="icon-button" id="dialogClose"><svg class="icon" viewBox="0 0 24 24"><path d="M6.5,6.5L17.5,17.5M17.5,6.5L6.5,17.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg></button></div><div class="dialog-body" id="dialogBody"></div></div></div>
  <div class="toast" id="toast"></div>
</div>
</div>

</body>
</html>
`;function a(e,t,n,r,i){let a=e.getElementById(`phone`),o=e.getElementById(`blobControl`),s=e.getElementById(`blobIconPath`),c=e.getElementById(`blobTime`),l=e.getElementById(`blobSummary`),u=e.getElementById(`oneStat`),d=e.getElementById(`loopStat`),f=e.getElementById(`toast`),p=e.getElementById(`dialogLayer`),m=e.getElementById(`dialogTitle`),h=e.getElementById(`dialogBody`),g=e.getElementById(`dropdownMenu`),_=!1,v=`one`,y=768,b=2839,x=1800,S=7200,C=88200,w=performance.now(),T=0,E=!1,D=new Map;function O(e){e=Math.max(0,Math.floor(e));let t=Math.floor(e/3600),n=Math.floor(e%3600/60),r=e%60;return t>0?`${t}:${String(n).padStart(2,`0`)}:${String(r).padStart(2,`0`)}`:`${n}:${String(r).padStart(2,`0`)}`}function ee(e){return`${(e*C/1048576).toFixed(1)} MiB`}function te(e){let t=String(e||``).trim().split(`:`);if(t.length<1||t.length>3||t.some(e=>!/^\d+$/.test(e)))return null;let n=t.map(Number);return n.some(e=>!Number.isFinite(e)||e<0)||t.length===3&&(n[1]>=60||n[2]>=60)||t.length===2&&n[1]>=60?null:t.length===3?n[0]*3600+n[1]*60+n[2]:t.length===2?n[0]*60+n[1]:n[0]}function ne(){return v===`one`?y:b}function k(){u.textContent=O(y),d.textContent=O(b),c.textContent=O(ne()),l.textContent=ee(ne())}function A(t){let n=t===`one`?x:S,r=e.querySelector(`[data-buffer-retention="${t}"] [data-retention="time"] input`),i=e.querySelector(`[data-buffer-retention="${t}"] [data-retention="size"] input`),a=e.querySelector(`[data-buffer-retention="${t}"] [data-retention="size"] .supporting`);r&&(r.value=O(n));let o=(n*C/1048576).toFixed(1);i&&(i.value=o),a&&(a.textContent=`Estimated file size: ${o} MiB`)}function j(e,t){t=Math.max(0,Math.floor(t)),e===`one`?(x=t,y=Math.min(y,x)):(S=t,b=Math.min(b,S)),A(e),k()}function re(e){if(e<=0)return;let t=Math.max(0,x-y),n=Math.min(e,t);y+=n;let r=e-n;r>0&&S>0&&(b=Math.min(S,b+r))}function ie(e){r(T),f.textContent=e,f.classList.add(`show`),T=n(()=>f.classList.remove(`show`),1200)}function ae(e,t){m.textContent=e,h.textContent=t,p.classList.add(`show`)}e.getElementById(`openSettings`).onclick=()=>a.classList.add(`settings-open`),e.getElementById(`openLibrary`).onclick=()=>a.classList.add(`library-open`),e.getElementById(`libraryScrim`).onclick=()=>a.classList.remove(`library-open`),e.getElementById(`dialogClose`).onclick=()=>p.classList.remove(`show`),p.addEventListener(`click`,e=>{e.target===p&&p.classList.remove(`show`)});let oe=e.getElementById(`aboutScrim`),M=()=>a.classList.remove(`about-open`);e.getElementById(`brandButton`).onclick=()=>a.classList.add(`about-open`),e.getElementById(`aboutClose`).onclick=M,oe.onclick=M,e.querySelectorAll(`[data-toast]`).forEach(e=>e.addEventListener(`click`,()=>ie(e.dataset.toast))),e.querySelectorAll(`.recording-card`).forEach(e=>e.addEventListener(`click`,()=>ae(e.dataset.recording,`In the Android app this opens RecordingPlayerDialog.`))),e.querySelectorAll(`.buffer-segment`).forEach(t=>t.addEventListener(`click`,()=>{v=t.dataset.buffer,e.querySelectorAll(`.buffer-segment`).forEach(e=>e.classList.toggle(`selected`,e===t)),k()})),o.addEventListener(`pointerdown`,()=>o.classList.add(`pressed`)),[`pointerup`,`pointercancel`,`pointerleave`].forEach(e=>o.addEventListener(e,()=>o.classList.remove(`pressed`))),o.onclick=()=>{_=!_,o.classList.toggle(`live`,_),o.setAttribute(`aria-label`,_?`Tap to pause capture`:`Tap to start capture`),s.setAttribute(`d`,_?`M7,5h4v14H7zM13,5h4v14h-4z`:`M3,14c0,-0.55 0.45,-1 1,-1s1,0.45 1,1v2c0,0.55 -0.45,1 -1,1s-1,-0.45 -1,-1zM6.5,11c0,-0.55 0.45,-1 1,-1s1,0.45 1,1v8c0,0.55 -0.45,1 -1,1s-1,-0.45 -1,-1zM10,8c0,-0.55 0.45,-1 1,-1s1,0.45 1,1v14c0,0.55 -0.45,1 -1,1s-1,-0.45 -1,-1zM13.5,5c0,-0.55 0.45,-1 1,-1s1,0.45 1,1v14c0,0.55 -0.45,1 -1,1s-1,-0.45 -1,-1zM17,8c0,-0.55 0.45,-1 1,-1s1,0.45 1,1v8c0,0.55 -0.45,1 -1,1s-1,-0.45 -1,-1zM20.5,11c0,-0.55 0.45,-1 1,-1s1,0.45 1,1v2c0,0.55 -0.45,1 -1,1s-1,-0.45 -1,-1z`),l.classList.toggle(`hidden`,!_),$.setActive(_)};function N(e){if(_&&e-w>=1e3){let t=Math.floor((e-w)/1e3);w+=t*1e3,re(t),k()}else _||(w=e);t(N)}k(),t(N);let P=[...e.querySelectorAll(`.settings-body input,.settings-body .m3-value`)],F=e.getElementById(`wakeSwitch`),I=`time`;function L(){P.forEach((e,t)=>D.set(t,e instanceof HTMLInputElement?e.value:e.textContent)),D.set(`oneLimitSeconds`,x),D.set(`loopLimitSeconds`,S),D.set(`wake`,F.classList.contains(`on`)),D.set(`retentionMode`,I)}L();function R(t=!0){E=t,e.getElementById(`settingsDone`).classList.toggle(`disabled`,!t),e.getElementById(`settingsNavClose`).style.display=t?`none`:`block`,e.getElementById(`settingsNavUndo`).style.display=t?`block`:`none`,e.getElementById(`settingsNav`).setAttribute(`aria-label`,t?`Undo`:`Close`)}function se(){P.forEach((e,t)=>{let n=D.get(t);e instanceof HTMLInputElement?e.value=n:e.textContent=n}),x=D.get(`oneLimitSeconds`),S=D.get(`loopLimitSeconds`),y=Math.min(y,x),b=Math.min(b,S),A(`one`),A(`loop`),k();let e=D.get(`wake`);F.classList.toggle(`on`,e),F.setAttribute(`aria-checked`,String(e)),z(D.get(`retentionMode`),!1),R(!1)}e.getElementById(`settingsNav`).onclick=()=>{E?se():a.classList.remove(`settings-open`)},e.getElementById(`settingsDone`).onclick=()=>{E&&(L(),R(!1),a.classList.remove(`settings-open`))},e.querySelectorAll(`.settings-body input`).forEach(e=>e.addEventListener(`input`,()=>R(!0))),e.querySelectorAll(`[data-buffer-retention]`).forEach(e=>{let t=e.dataset.bufferRetention,n=e.querySelector(`[data-retention="time"] input`),r=e.querySelector(`[data-retention="size"] input`);n&&n.addEventListener(`change`,()=>{let e=te(n.value);e==null?A(t):j(t,e)}),r&&r.addEventListener(`change`,()=>{let e=Number.parseFloat(r.value);Number.isFinite(e)&&e>=0?j(t,e*1024*1024/C):A(t)})}),F.onclick=()=>{let e=!F.classList.contains(`on`);F.classList.toggle(`on`,e),F.setAttribute(`aria-checked`,String(e)),R(!0)};function z(t,n=!0){I=t,e.querySelectorAll(`[data-retention]`).forEach(e=>{let n=e.dataset.retention===t;e.classList.toggle(`inactive`,!n);let r=e.querySelector(`.m3-prefix`);r&&(r.textContent=n?``:`=`)}),n&&R(!0)}e.querySelectorAll(`[data-retention="time"] input`).forEach(e=>e.addEventListener(`focus`,()=>z(`time`))),e.querySelectorAll(`[data-retention="size"] input`).forEach(e=>e.addEventListener(`focus`,()=>z(`size`)));let B=null;function V(){g.classList.remove(`show`),g.innerHTML=``,B=null}e.addEventListener(`pointerdown`,e=>{B&&!g.contains(e.target)&&!B.contains(e.target)&&V()},!0),e.querySelectorAll(`.m3-fieldset.dropdown`).forEach(t=>t.addEventListener(`click`,n=>{n.stopPropagation(),V(),B=t;let r=t.getBoundingClientRect(),i=a.getBoundingClientRect(),o=(t.dataset.options||``).split(`|`);g.innerHTML=``,o.forEach(n=>{let r=e.createElement(`button`);r.className=`dropdown-item`,r.textContent=n,r.onclick=()=>{t.querySelector(`.m3-value`).textContent=n,R(!0),V()},g.appendChild(r)}),g.style.left=`${Math.min(r.left,i.right-Math.max(180,r.width))}px`,g.style.top=`${Math.min(r.bottom+2,window.innerHeight-12-o.length*48)}px`,g.style.width=`${Math.max(180,r.width)}px`,g.classList.add(`show`)}));function H(e,t){if(a.classList.contains(`settings-open`)||a.classList.contains(`library-open`)||t instanceof Element&&t.closest(`button,input,a,[role="button"],[role="switch"],.m3-fieldset`))return null;let n=o.getBoundingClientRect();return e<n.top?`settings`:e>n.bottom?`library`:null}function U(e,t){return e===`settings`&&t>=52?(a.classList.add(`settings-open`),!0):e===`library`&&t<=-52&&(a.classList.add(`library-open`),!0)}let W=null,G=null,K=e=>{W!==null&&G&&U(G,e.clientY-W)&&q()},q=()=>{W=null,G=null,a.removeEventListener(`pointermove`,K)};a.addEventListener(`pointerdown`,e=>{e.pointerType!==`touch`&&(G=H(e.clientY,e.target),W=G?e.clientY:null,G&&a.addEventListener(`pointermove`,K,{passive:!0}))}),a.addEventListener(`pointerup`,q),a.addEventListener(`pointercancel`,q);let J=null,Y=null;a.addEventListener(`touchstart`,e=>{if(e.touches.length!==1)return;let t=e.touches[0];Y=H(t.clientY,e.target),J=Y?t.clientY:null,Y&&e.preventDefault()},{passive:!1}),a.addEventListener(`touchmove`,e=>{if(J===null||!Y||e.touches.length!==1)return;e.preventDefault();let t=e.touches[0];U(Y,t.clientY-J)&&(J=null,Y=null)},{passive:!1});let X=()=>{J=null,Y=null};a.addEventListener(`touchend`,X),a.addEventListener(`touchcancel`,X);function Z(t,n,r){let i=e.createElement(`span`);i.style.cssText=`position:absolute;pointer-events:none;visibility:hidden;color:var(${n},${r})`,(t.parentNode||e.documentElement)?.appendChild(i);let a=getComputedStyle(i).color||r;return i.remove(),a}function ce(n){let r=n.getContext(`webgl`,{alpha:!0,premultipliedAlpha:!0,antialias:!0});if(!r)return Q(n);let a=r.getShaderPrecisionFormat(r.FRAGMENT_SHADER,r.HIGH_FLOAT),o=`precision ${a&&a.precision?`highp`:`mediump`} float;
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
}`;function s(e,t){let n=r.createShader(e);if(r.shaderSource(n,t),r.compileShader(n),!r.getShaderParameter(n,r.COMPILE_STATUS))throw Error(r.getShaderInfoLog(n));return n}let c=r.createProgram();if(r.attachShader(c,s(r.VERTEX_SHADER,`attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}`)),r.attachShader(c,s(r.FRAGMENT_SHADER,o)),r.linkProgram(c),!r.getProgramParameter(c,r.LINK_STATUS))throw Error(r.getProgramInfoLog(c)||`Unable to link Reverb demo shader`);r.useProgram(c);let l=r.createBuffer();r.bindBuffer(r.ARRAY_BUFFER,l),r.bufferData(r.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),r.STATIC_DRAW);let u=r.getAttribLocation(c,`a`);r.enableVertexAttribArray(u),r.vertexAttribPointer(u,2,r.FLOAT,!1,0,0);let d={};[`resolution`,`time`,`activity`,`life`,`active`,`bands0`,`bands1`,`primaryColor`,`tertiaryColor`,`pausedColor`].forEach(e=>d[e]=r.getUniformLocation(c,e));let f=e.createElement(`canvas`),p=f.getContext(`2d`);f.width=f.height=1;function m(e,t){if(!p)return[0,0,0,1];p.clearRect(0,0,1,1),p.fillStyle=`#000`,p.fillStyle=Z(n,e,t),p.fillRect(0,0,1,1);let r=p.getImageData(0,0,1,1).data;return[r[0]/255,r[1]/255,r[2]/255,r[3]/255]}function h(){r.useProgram(c),r.uniform4fv(d.primaryColor,m(`--blob-primary`,`#2DD4BF`)),r.uniform4fv(d.tertiaryColor,m(`--blob-tertiary`,`#ACCBE5`)),r.uniform4fv(d.pausedColor,m(`--surface-container-highest`,`#2A3244`))}h();let g=.38,_=.38,v=0,y=0,b=new Float32Array(8),x=new Float32Array(8),S=!1,C=performance.now(),w=0;function T(){let e=Math.min(i||1,2),t=n.getBoundingClientRect(),a=Math.max(1,Math.round(t.width*e)),o=Math.max(1,Math.round(t.height*e));(n.width!==a||n.height!==o)&&(n.width=a,n.height=o,r.viewport(0,0,a,o)),r.uniform2f(d.resolution,a,o)}function E(e){let t=Math.max(.25,Math.min(3,e*30)),n=v>y?.34:.16,r=Math.min(.82,n*t);y+=(v-y)*r;for(let e=0;e<8;e++)n=b[e]>x[e]?.3:.13,r=Math.min(.8,n*t),x[e]+=(b[e]-x[e])*r;n=g>_?.18:.15,r=Math.min(.65,n*t),_+=(g-_)*r,Math.abs(_-g)<=.006&&(_=g)}function D(e){if(!S){v=0,b.fill(0);return}if(e-w<85)return;w=e;let t=e/1e3;v=.2+.22*(.5+.5*Math.sin(t*1.7))+.09*Math.random();for(let e=0;e<8;e++){let n=.5+.5*Math.sin(t*(1.13+e*.16)+e*.83),r=.5+.5*Math.sin(t*.41+e*1.7);b[e]=Math.max(.025,Math.min(.82,.07+n*(.12+.21*v)+r*.07+Math.random()*.09))}}function O(e){T();let n=Math.max(.001,Math.min(.1,(e-C)/1e3));C=e,D(e),E(n),r.clearColor(0,0,0,0),r.clear(r.COLOR_BUFFER_BIT),r.useProgram(c),r.uniform1f(d.time,e/1e3),r.uniform1f(d.activity,y),r.uniform1f(d.life,_),r.uniform1f(d.active,+!!S),r.uniform4fv(d.bands0,x.subarray(0,4)),r.uniform4fv(d.bands1,x.subarray(4,8)),r.drawArrays(r.TRIANGLES,0,6),t(O)}return t(O),{setActive(e){S=e,g=e?1:.38,e||(v=0,b.fill(0))},refreshTheme:h}}function le(e){try{return ce(e)}catch(t){return console.warn(`Reverb demo WebGL unavailable; using 2D fallback`,t),Q(e)}}function Q(e){let n=e,r=n.getContext(`2d`);if(!r&&n.parentNode){let e=n.cloneNode(!1);n.replaceWith(e),n=e,r=n.getContext(`2d`)}if(!r)return n.style.background=`radial-gradient(circle at 45% 42%,color-mix(in srgb,var(--blob-primary) 90%,transparent) 0 13%,color-mix(in srgb,var(--blob-tertiary) 45%,transparent) 22%,transparent 42%)`,{setActive(e){n.style.opacity=e?`1`:`.56`},refreshTheme(){}};let a=`#2DD4BF`,o=`#ACCBE5`,s=`#2A3244`;function c(){a=Z(n,`--blob-primary`,`#2DD4BF`),o=Z(n,`--blob-tertiary`,`#ACCBE5`),s=Z(n,`--surface-container-highest`,`#2A3244`)}c();let l=.38,u=.38,d=0,f=0,p=!1,m=performance.now(),h=0,g=new Float32Array(8),_=new Float32Array(8),v=new Float32Array(40),y=new Float32Array(40);function b(e){if(!p){d=0,g.fill(0);return}if(e-h<85)return;h=e;let t=e/1e3;d=.2+.22*(.5+.5*Math.sin(t*1.7))+.09*Math.random();for(let e=0;e<8;e++){let n=.5+.5*Math.sin(t*(1.13+e*.16)+e*.83),r=.5+.5*Math.sin(t*.41+e*1.7);g[e]=Math.max(.025,Math.min(.82,.07+n*(.12+.21*d)+r*.07+Math.random()*.09))}}function x(e){let t=Math.max(.25,Math.min(3,e*30)),n=d>f?.34:.16,r=Math.min(.82,n*t);f+=(d-f)*r;for(let e=0;e<8;e++)n=g[e]>_[e]?.3:.13,r=Math.min(.8,n*t),_[e]+=(g[e]-_[e])*r;n=l>u?.18:.15,r=Math.min(.65,n*t),u+=(l-u)*r,Math.abs(u-l)<=.006&&(u=l)}function S(e){let c=n.getBoundingClientRect(),l=Math.min(i||1,2),d=Math.max(1,Math.round(c.width*l)),h=Math.max(1,Math.round(c.height*l));(n.width!==d||n.height!==h)&&(n.width=d,n.height=h);let g=Math.max(.001,Math.min(.1,(e-m)/1e3));m=e,b(e),x(g),r.clearRect(0,0,d,h);let C=Math.min(d,h),w=d*.5,T=h*.5,E=C*(.095+u*(.235+f*.018));for(let t=0;t<40;t++){let n=t/40*Math.PI*2-Math.PI/2,r=_[Math.floor(t*8/40)],i=p?Math.sin(n*3+e/1e3*.8)*C*.005+Math.sin(n*5-e/1e3*.55)*C*.0025:0,a=E+(p?r*C*.078+i:0);v[t]=w+Math.cos(n)*a,y[t]=T+Math.sin(n)*a}r.beginPath(),r.moveTo((v[0]+v[1])*.5,(y[0]+y[1])*.5);for(let e=1;e<=40;e++){let t=e%40,n=(e+1)%40;r.quadraticCurveTo(v[t],y[t],(v[t]+v[n])*.5,(y[t]+y[n])*.5)}if(r.closePath(),p){let e=r.createLinearGradient(0,0,d,h);e.addColorStop(0,a),e.addColorStop(1,o),r.fillStyle=e}else r.fillStyle=s;r.fill(),t(S)}return t(S),{setActive(e){p=e,l=e?1:.38,e||(d=0,g.fill(0))},refreshTheme:c}}let $=le(e.getElementById(`blobCanvas`));return{refreshTheme(){$.refreshTheme?.()}}}var o=e(`<section class=reverb-demo-section aria-labelledby=reverb-ui-demo-title><div class=reverb-demo-head><h2 id=reverb-ui-demo-title>UI demo</h2><a class=reverb-demo-store-link href=https://f-droid.org/packages/app.smallthingz.reverb/ target=_blank rel="noopener noreferrer">Available on F-Droid <span aria-hidden=true>↗</span></a></div><div class=reverb-demo-frame-shell><div class=reverb-demo-frame><div class=reverb-demo-host role=group aria-label="Interactive Reverb UI demo"></div><button class=reverb-demo-fullscreen-button type=button aria-label="Fullscreen demo"aria-pressed=false><svg class=expand-icon viewBox="0 0 24 24"aria-hidden=true><path d="M4 9V4h5v2H6v3H4zm11-5h5v5h-2V6h-3V4zM6 15v3h3v2H4v-5h2zm12 3v-3h2v5h-5v-2h3z"></path></svg><svg class=collapse-icon viewBox="0 0 24 24"aria-hidden=true><path d="M9 4v5H4V7h3V4h2zm6 0h2v3h3v2h-5V4zM4 15h5v5H7v-3H4v-2zm11 0h5v2h-3v3h-2v-5z">`),s=`__sameyReverbFullscreen`;function c(e,t,n){if(e.getAnimations().forEach(e=>e.cancel()),n)return;let r=e.getBoundingClientRect();if(!t.width||!t.height||!r.width||!r.height)return;let i=t.left-r.left,a=t.top-r.top,o=t.width/r.width,s=t.height/r.height;e.animate([{transformOrigin:`top left`,transform:`translate(${i}px,${a}px) scale(${o},${s})`},{transformOrigin:`top left`,transform:`translate(0,0) scale(1,1)`}],{duration:280,easing:`cubic-bezier(.2,0,0,1)`})}function l(e,t,n){let r=`reverb-${Math.random().toString(36).slice(2)}`,i=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches,a=!1,o=``,l=``,u=()=>!!(history.state&&history.state[s]===r),d=r=>{if(r===a)return;let s=e.getBoundingClientRect();a=r,n.classList.toggle(`is-active`,r),n.setAttribute(`aria-label`,r?`Exit fullscreen demo`:`Fullscreen demo`),n.setAttribute(`aria-pressed`,String(r)),r?(o=document.body.style.overflow,l=document.documentElement.style.overflow,document.body.style.overflow=`hidden`,document.documentElement.style.overflow=`hidden`,e.classList.add(`is-fullscreen`),t.setAttribute(`data-fullscreen`,``)):(e.classList.remove(`is-fullscreen`),t.removeAttribute(`data-fullscreen`),document.body.style.overflow=o,document.documentElement.style.overflow=l),c(e,s,i)},f=()=>{if(a)return;let e=history.state&&typeof history.state==`object`?history.state:{};history.pushState({...e,[s]:r},``,location.href),d(!0)},p=()=>{a&&(u()?history.back():d(!1))},m=()=>a?p():f(),h=()=>d(u());return n.addEventListener(`click`,m),window.addEventListener(`popstate`,h),()=>{n.removeEventListener(`click`,m),window.removeEventListener(`popstate`,h),a&&(e.classList.remove(`is-fullscreen`),t.removeAttribute(`data-fullscreen`),document.body.style.overflow=o,document.documentElement.style.overflow=l)}}function u(e){let t=new DOMParser().parseFromString(i,`text/html`),n=t.querySelector(`style`)?.textContent??``,r=e.attachShadow({mode:`open`}),o=document.createElement(`style`);o.textContent=n.split(`:root`).join(`:host`).split(`html,body`).join(`:host`),r.append(o);for(let e of Array.from(t.body.childNodes))e instanceof HTMLScriptElement||r.append(e.cloneNode(!0));let s=!1,c=new Set,l=new Set,u=e=>{let t=0;return t=window.requestAnimationFrame(n=>{c.delete(t),s||e(n)}),c.add(t),t},d=(e,t,...n)=>{let r=0;return r=window.setTimeout(()=>{l.delete(r),s||e(...n)},t),l.add(r),r},f=e=>{e!=null&&(l.delete(e),window.clearTimeout(e))},p={createElement:document.createElement.bind(document),getElementById:e=>r.querySelector(`#${e}`),querySelector:e=>r.querySelector(e),querySelectorAll:e=>r.querySelectorAll(e),addEventListener:(e,t,n)=>r.addEventListener(e,t,n)},m=()=>e.setAttribute(`data-cursor-mode`,document.documentElement.dataset.cursorMode||`invert`);m();let h=a(p,u,d,f,window.devicePixelRatio||1),g=()=>{m(),h?.refreshTheme?.()};return window.addEventListener(`samey-themechange`,g),()=>{s=!0,window.removeEventListener(`samey-themechange`,g);for(let e of c)window.cancelAnimationFrame(e);for(let e of l)window.clearTimeout(e);c.clear(),l.clear(),r.replaceChildren()}}function d(){let e,i,a,s=()=>{};return n(()=>{let t=u(i),n=l(e,i,a);s=()=>{n(),t()}}),t(()=>s()),(()=>{var t=o(),n=t.firstChild.nextSibling.firstChild,s=n.firstChild,c=s.nextSibling,l=e;typeof l==`function`?r(l,n):e=n;var u=i;typeof u==`function`?r(u,s):i=s;var d=a;return typeof d==`function`?r(d,c):a=c,t})()}export{d as ReverbDemo};