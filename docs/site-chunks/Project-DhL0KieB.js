import{B as sameyCleanup,O as e,b as t,m as n}from"../site-app.js";import{r,t as i}from"./TopBar-CYeDz37p.js";import{t as a}from"./Entries-CIbE7Y5F.js";import{r as o}from"./SiteChrome-CaFplLTL.js";var s=t(`<main class=detail><article class=project-detail><p class=eyebrow>Project</p><h1></h1><p class=dek></p><div class=fact-strip></div><section class=detail-copy><h2>What it is</h2><p></p></section><div class=reverb-demo-slot></div><section class=detail-copy><h2>Related`),c=t(`<span>`),h="<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n<meta name=\"color-scheme\" content=\"dark\">\n<title>Reverb</title>\n<style>\n:root{\n  --primary:#2DD4BF; --on-primary:#003730; --primary-container:#005047; --on-primary-container:#74F8E5;\n  --secondary:#B0CCC6; --on-secondary:#1B3530; --secondary-container:#324B47; --on-secondary-container:#CCE8E2;\n  --tertiary:#ACCBE5;\n  --surface:#0D1324; --on-surface:#E2E9E7; --surface-variant:#3F4946; --on-surface-variant:#BEC9C5;\n  --outline:#89938F; --outline-variant:#3F4946;\n  --surface-container-low:#1D1B20; /* Material3 dark default: not overridden by ReverbTheme */\n  --surface-container:#211F26;\n  --surface-container-high:#20283A; --surface-container-highest:#2A3244;\n  --error:#FFB4AB; --scrim:rgba(0,0,0,.32);\n  --status-h:24px; --nav-h:24px;\n}\n*{box-sizing:border-box;-webkit-user-select:none;user-select:none}\nhtml,body{margin:0;min-height:100%;background:#080B12;color:var(--on-surface);font-family:Roboto,system-ui,-apple-system,\"Segoe UI\",sans-serif;-webkit-font-smoothing:antialiased}\nbutton,input{font:inherit}\nbutton{border:0;padding:0;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}\n@media(pointer:fine){*{cursor:none!important}}\n.stage{width:100%;height:100%;min-height:0;display:grid;place-items:center;padding:18px;background:radial-gradient(circle at 50% 40%,#111728 0,#080b12 62%);position:relative;overflow:hidden}\n.phone{width:min(412px,calc(100% - 36px));height:min(820px,calc(100% - 36px));min-height:0;max-height:820px;position:relative;overflow:hidden;background:var(--surface);color:var(--on-surface);box-shadow:0 28px 90px rgba(0,0,0,.58);isolation:isolate;z-index:2}\n.gesture-hint{position:absolute;z-index:3;width:54px;height:96px;pointer-events:none;color:var(--on-surface-variant);opacity:.48;filter:drop-shadow(0 2px 7px rgba(0,0,0,.35))}\n.gesture-hint.left{left:max(10px,calc(50% - 270px));top:22%}\n.gesture-hint.right{right:max(10px,calc(50% - 270px));bottom:18%}\n.gesture-hint svg{width:100%;height:100%;overflow:visible}\n.gesture-hint .gesture-finger{transform-origin:50% 50%;animation:gesture-down 2.25s cubic-bezier(.2,0,0,1) infinite}\n.gesture-hint.right .gesture-finger{animation-name:gesture-up}\n.gesture-hint .gesture-path{opacity:.38;stroke-dasharray:4 5}\n@keyframes gesture-down{0%,16%{transform:translateY(-10px);opacity:.18}38%,68%{opacity:.78}78%,100%{transform:translateY(14px);opacity:.12}}\n@keyframes gesture-up{0%,16%{transform:translateY(12px);opacity:.18}38%,68%{opacity:.78}78%,100%{transform:translateY(-14px);opacity:.12}}\n.screen{position:absolute;inset:0;background:var(--surface)}\n.home{display:flex;flex-direction:column;transform:translateY(0);opacity:1;transition:transform 180ms cubic-bezier(.2,0,0,1),opacity 160ms linear}\n.statusbar{height:var(--status-h);flex:none;background:var(--surface)}\n.navbar{height:var(--nav-h);flex:none;background:var(--surface)}\n.icon{display:block;width:24px;height:24px;fill:currentColor;overflow:visible}\n.topbar{height:66px;position:relative;flex:none;padding:0 14px;background:var(--surface)}\n.brand{position:absolute;left:50%;top:10px;transform:translateX(-50%);width:46px;height:46px;border-radius:15px;background:#0D1324;display:grid;place-items:center}\n.brand svg{width:42px;height:42px}\n.settings-button{position:absolute;right:14px;top:9px;width:48px;height:48px;background:transparent;color:var(--on-surface-variant);display:grid;place-items:center;border-radius:50%}\n.settings-button svg{width:23px;height:23px}\n.settings-button:active,.icon-button:active,.action-button:active{background:rgba(226,233,231,.08)}\n.capture{flex:1;min-height:0;padding:0 18px;display:flex;flex-direction:column;align-items:center}\n.blob-area{width:100%;min-height:0;flex:1;display:grid;place-items:center}\n.blob-control{background:transparent;border:0;padding:0;color:inherit;position:relative;display:grid;place-items:center;width:min(90%,372px);aspect-ratio:1;user-select:none;touch-action:pan-y;transition:transform 100ms linear}\n.blob-control.pressed{transform:scale(.96)}\n#blobCanvas{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none}\n.blob-content{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;pointer-events:none;color:var(--on-surface-variant)}\n.blob-control.live .blob-content{color:var(--on-primary)}\n.blob-content .capture-icon{width:38px;height:38px}\n.blob-time{margin-top:10px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:18px;font-weight:500;line-height:22px;white-space:nowrap}\n.blob-summary{margin-top:2px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px;line-height:18px;color:currentColor;opacity:.76;white-space:nowrap;max-height:18px;transition:opacity 120ms linear,max-height 120ms linear}\n.blob-summary.hidden{opacity:0;max-height:0;margin-top:0}\n.buffer-selector{flex:none;padding:6px;border-radius:22px;background:var(--surface-container-high);display:flex;gap:6px}\n.buffer-segment{width:112px;min-height:52px;border-radius:16px;background:var(--surface-container-highest);color:var(--on-surface-variant);padding:8px 12px;text-align:center;display:flex;flex-direction:column;justify-content:center;align-items:center}\n.buffer-segment.selected{background:var(--primary);color:var(--on-primary)}\n.buffer-segment .label{font-size:14px;font-weight:600;line-height:20px;letter-spacing:.1px;white-space:nowrap}\n.buffer-segment .stat{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;font-weight:400;line-height:16px;opacity:.78;white-space:nowrap}\n.control-gap{height:10px;flex:none}\n.actions-surface{flex:none;background:var(--surface-container-high);border-radius:28px;padding:8px;display:flex;gap:8px}\n.action-button{width:54px;height:54px;border-radius:50%;background:transparent;display:grid;place-items:center;color:var(--on-surface)}\n.action-button.destructive{color:var(--error)}\n.action-button svg{width:25px;height:25px}\n.capture-bottom{height:18px;flex:none}\n\n/* Settings screen */\n.settings-screen{z-index:5;display:flex;flex-direction:column;transform:translateY(-100%);transition:transform 220ms cubic-bezier(.2,0,0,1);background:var(--surface)}\n.phone.settings-open .settings-screen{transform:translateY(0)}\n.phone.settings-open .home{transform:translateY(10%);opacity:0}\n.settings-appbar{height:64px;flex:none;display:grid;grid-template-columns:64px 1fr 64px;align-items:center;background:var(--surface)}\n.settings-appbar h1{margin:0;text-align:center;font-size:22px;line-height:28px;font-weight:700}\n.icon-button{width:48px;height:48px;margin:auto;background:transparent;border-radius:50%;display:grid;place-items:center;color:var(--on-surface)}\n.icon-button.disabled{color:rgba(226,233,231,.38);pointer-events:none}\n.settings-body{flex:1;min-height:0;overflow:auto;background:var(--surface);padding-bottom:24px;scrollbar-width:none}\n.settings-body::-webkit-scrollbar,.library-list::-webkit-scrollbar{display:none}\n.section-title{font-size:16px;line-height:24px;font-weight:600;color:var(--on-surface);padding:12px 16px}\n.reliability-card{margin:4px 16px;border-radius:20px;background:var(--surface-container-low);padding:12px 14px;display:flex;align-items:center;gap:8px}\n.reliability-copy{min-width:0;flex:1;padding-right:8px}\n.reliability-copy .title{font-size:16px;line-height:24px;color:var(--on-surface)}\n.reliability-copy .summary{font-size:12px;line-height:16px;color:var(--on-surface-variant);margin-top:2px}\n.text-button{background:transparent;color:var(--primary);font-size:14px;line-height:20px;font-weight:600;letter-spacing:.1px;padding:10px 12px;border-radius:20px;white-space:nowrap}\n.text-button:active{background:rgba(45,212,191,.08)}\n.spacer12{height:12px}\n.spacer8{height:8px}\n.spacer16{height:16px}\n.field-wrap{padding:12px 16px}\n.field-wrap.compact{padding:0}\n.field-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;padding:0 16px}\n.field-row + .field-row{padding-top:12px}\n.m3-fieldset{position:relative;margin:0;border:1px solid var(--outline);border-radius:18px;min-height:56px;padding:0 44px 0 16px;color:var(--on-surface);background:transparent;display:flex;align-items:center;min-width:0;transition:opacity 120ms,border-color 120ms}\n.m3-fieldset legend{padding:0 4px;color:var(--on-surface-variant);font-size:12px;line-height:16px;margin-left:-8px}\n.m3-fieldset.dropdown{cursor:pointer}\n.m3-value{font-size:16px;line-height:24px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}\n.m3-prefix{color:var(--on-surface);margin-right:3px}\n.dropdown-arrow{position:absolute;right:15px;top:50%;margin-top:-12px;width:24px;height:24px;color:var(--on-surface-variant);display:grid;place-items:center}\n.dropdown-arrow:after{content:\"\";width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid currentColor}\n.field-shell{min-width:0}\n.field-shell.inactive{opacity:.6}\n.supporting{font-size:12px;line-height:16px;color:var(--on-surface-variant);padding:4px 16px 0;min-height:20px}\n.buffer-label{font-size:14px;line-height:20px;font-weight:600;letter-spacing:.1px;color:var(--on-surface-variant);padding:0 4px 8px}\n.retention-block{padding:0 16px}\n.retention-fields{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}\n.retention-fields input{width:100%;border:0;outline:0;background:transparent;color:inherit;font-size:16px;line-height:24px;padding:0;min-width:0}\n.export-limit{font-size:12px;line-height:16px;color:var(--on-surface-variant);padding:8px 20px}\n.storage-card{margin:4px 16px;border-radius:20px;background:var(--surface-container-low);padding:10px 16px}\n.storage-row{display:flex;align-items:center;min-height:48px}\n.storage-path{flex:1;font-size:16px;line-height:24px;color:var(--on-surface-variant);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.storage-row .icon-button{margin:0}\n.storage-card .text-button{margin-left:-12px}\n.switch-row{margin:4px 16px;border-radius:20px;background:var(--surface-container-low);padding:12px 14px;display:flex;align-items:center}\n.switch-copy{min-width:0;flex:1;padding-right:8px}\n.switch-copy .title{font-size:16px;line-height:24px}\n.switch-copy .summary{font-size:12px;line-height:16px;color:var(--on-surface-variant);margin-top:2px}\n.m3-switch{width:52px;height:32px;padding:4px;border-radius:18px;background:var(--outline-variant);position:relative;flex:none;transition:background 150ms}\n.m3-switch:before{content:\"\";position:absolute;width:24px;height:24px;left:4px;top:4px;border-radius:50%;background:var(--on-surface-variant);transition:transform 150ms,background 150ms}\n.m3-switch.on{background:var(--primary)}\n.m3-switch.on:before{transform:translateX(20px);background:var(--on-primary)}\n.dropdown-menu{position:fixed;z-index:30;min-width:170px;max-width:300px;background:var(--surface-container);border-radius:4px;padding:8px 0;box-shadow:0 6px 18px rgba(0,0,0,.48);display:none;overflow:hidden}\n.dropdown-menu.show{display:block}\n.dropdown-item{display:block;width:100%;min-height:48px;padding:12px 16px;text-align:left;background:transparent;color:var(--on-surface);font-size:14px;line-height:20px}\n.dropdown-item:hover{background:rgba(226,233,231,.08)}\n\n/* Library modal bottom sheet */\n.scrim{position:absolute;inset:0;z-index:10;background:rgba(0,0,0,0);pointer-events:none;transition:background 180ms linear}\n.library-sheet{position:absolute;z-index:11;left:0;right:0;bottom:0;height:88%;background:var(--surface-container-low);border-radius:28px 28px 0 0;transform:translateY(102%);transition:transform 240ms cubic-bezier(.2,0,0,1);display:flex;flex-direction:column;overflow:hidden}\n.phone.library-open .scrim{background:var(--scrim);pointer-events:auto}\n.phone.library-open .library-sheet{transform:translateY(0)}\n.drag-handle-wrap{height:32px;flex:none;display:grid;place-items:center}\n.drag-handle{width:32px;height:4px;border-radius:2px;background:var(--on-surface-variant);opacity:.4}\n.library-screen{flex:1;min-height:0;display:flex;flex-direction:column}\n.library-list{flex:1;min-height:0;overflow:auto;padding:0 16px 84px;scrollbar-width:none}\n.date-header{font-size:14px;line-height:20px;font-weight:600;letter-spacing:.04px;color:var(--on-surface-variant);padding:28px 0 8px}\n.recording-card{width:100%;border-radius:16px;background:#202127;margin-bottom:10px;padding:12px 14px;display:flex;align-items:center;gap:12px;text-align:left;box-shadow:0 1px 2px rgba(0,0,0,.16)}\n.recording-card:active{background:#25272d}\n.audio-round{width:44px;height:44px;border-radius:50%;background:var(--surface-variant);display:grid;place-items:center;flex:none}\n.audio-round svg{width:24px;height:24px}\n.recording-main{min-width:0;flex:1}\n.recording-title{display:block;font-size:16px;line-height:24px;font-weight:500;color:var(--on-surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.recording-subtitle{display:block;margin-top:4px;font-size:14px;line-height:20px;color:var(--on-surface-variant);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.recording-trail{text-align:right;flex:none}\n.recording-trail .top{display:block;font-size:14px;line-height:20px;font-weight:600;color:var(--on-surface)}\n.recording-trail .bottom{display:block;margin-top:4px;font-size:12px;line-height:16px;color:var(--on-surface-variant)}\n\n/* lightweight dialogs used only for stub interactions */\n.dialog-layer{position:absolute;inset:0;z-index:40;background:rgba(0,0,0,.32);display:none;place-items:center;padding:28px}\n.dialog-layer.show{display:grid}\n.dialog{width:100%;max-width:330px;border-radius:18px;background:var(--surface-container-high);padding:22px 24px;color:var(--on-surface);box-shadow:0 16px 40px rgba(0,0,0,.48)}\n.dialog-title-row{display:flex;align-items:center;margin-bottom:12px}\n.dialog-title{font-size:22px;line-height:28px;font-weight:700;flex:1}\n.dialog-body{font-size:14px;line-height:20px;color:var(--on-surface-variant)}\n.about-scrim{position:absolute;inset:0;z-index:41;background:rgba(0,0,0,0);pointer-events:none;transition:background 160ms linear}\n.about-sheet{position:absolute;z-index:42;left:0;right:0;top:0;border-radius:0 0 32px 32px;background:var(--surface-container-high);box-shadow:0 16px 42px rgba(0,0,0,.5);padding:calc(var(--status-h) + 12px) 24px 26px;transform:translateY(-105%);opacity:.96;transition:transform 220ms cubic-bezier(.2,0,0,1),opacity 160ms linear}\n.phone.about-open .about-scrim{background:var(--scrim);pointer-events:auto}\n.phone.about-open .about-sheet{transform:translateY(0);opacity:1}\n.about-close{position:absolute;right:12px;top:calc(var(--status-h) + 4px);margin:0}\n.about-logo{width:104px;height:104px;margin:0 auto;border-radius:30px;background:#0D1324;display:grid;place-items:center}\n.about-logo svg{width:90px;height:90px}\n.about-name{margin-top:14px;text-align:center;font-size:24px;line-height:30px;font-weight:600}\n.about-version{text-align:center;margin-top:2px;color:var(--on-surface-variant);font-size:14px;line-height:20px}\n.about-repo{width:100%;margin-top:18px;text-decoration:none;color:inherit;border-radius:20px;background:var(--surface-container-highest);padding:15px 18px;display:flex;align-items:center;gap:14px;text-align:left}\n.about-repo:active{background:color-mix(in srgb,var(--surface-container-highest) 88%,var(--on-surface) 12%)}\n.about-repo svg{width:24px;height:24px;flex:none}\n.about-repo-copy{min-width:0;display:flex;flex-direction:column;gap:2px}\n.about-repo-copy strong{font-size:14px;line-height:20px;font-weight:600}\n.about-repo-copy span{color:var(--on-surface-variant);font-size:12px;line-height:16px}\n.toast{position:absolute;left:50%;bottom:92px;z-index:50;transform:translate(-50%,10px);background:var(--surface-container-highest);color:var(--on-surface);padding:10px 14px;border-radius:12px;font-size:13px;line-height:18px;opacity:0;pointer-events:none;transition:opacity 160ms,transform 160ms;white-space:nowrap}\n.toast.show{opacity:1;transform:translate(-50%,0)}\n\n@media(max-width:500px){\n  .stage{padding:0 12px;background:var(--surface)}\n  .phone{width:100%;height:100%;max-height:none;box-shadow:none}\n  .gesture-hint.left{left:14px}.gesture-hint.right{right:14px}\n  .gesture-hint{opacity:.38;z-index:4}\n}\n@media(prefers-reduced-motion:reduce){.gesture-hint .gesture-finger{animation:none}}\n</style>\n</head>\n<body>\n<div class=\"stage\">\n  <div class=\"gesture-hint left\" aria-hidden=\"true\">\n    <svg viewBox=\"0 0 54 96\" fill=\"none\">\n      <path class=\"gesture-path\" d=\"M27 12v56\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"/>\n      <path d=\"M20 61l7 8 7-8\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n      <g class=\"gesture-finger\">\n        <path d=\"M23 30v20.5c0 7.5 5 12.5 11.5 12.5S46 58.7 46 51.7V42c0-2.4-1.3-4-3.2-4-1.2 0-2.2.6-2.8 1.7v-3.1c0-2.5-1.4-4.2-3.4-4.2-1.4 0-2.5.8-3.1 2.1v-3.2c0-2.5-1.4-4.2-3.4-4.2-1.5 0-2.7.9-3.2 2.4V30c0-2.7-1.5-4.5-3.7-4.5S20 27.3 20 30v13.3l-2.3-3.1c-1.5-2-3.7-2.3-5.3-.8-1.5 1.4-1.5 3.5 0 5.5l8.1 10.8\" fill=\"var(--surface-container-highest)\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <circle cx=\"23.2\" cy=\"21.2\" r=\"3.2\" fill=\"var(--primary)\"/>\n      </g>\n    </svg>\n  </div>\n  <div class=\"gesture-hint right\" aria-hidden=\"true\">\n    <svg viewBox=\"0 0 54 96\" fill=\"none\">\n      <path class=\"gesture-path\" d=\"M27 84V28\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"/>\n      <path d=\"M20 35l7-8 7 8\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n      <g class=\"gesture-finger\">\n        <path d=\"M23 50v20.5c0 7.5 5 12.5 11.5 12.5S46 78.7 46 71.7V62c0-2.4-1.3-4-3.2-4-1.2 0-2.2.6-2.8 1.7v-3.1c0-2.5-1.4-4.2-3.4-4.2-1.4 0-2.5.8-3.1 2.1v-3.2c0-2.5-1.4-4.2-3.4-4.2-1.5 0-2.7.9-3.2 2.4V50c0-2.7-1.5-4.5-3.7-4.5S20 47.3 20 50v13.3l-2.3-3.1c-1.5-2-3.7-2.3-5.3-.8-1.5 1.4-1.5 3.5 0 5.5l8.1 10.8\" fill=\"var(--surface-container-highest)\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <circle cx=\"23.2\" cy=\"41.2\" r=\"3.2\" fill=\"var(--primary)\"/>\n      </g>\n    </svg>\n  </div>\n<div class=\"phone\" id=\"phone\">\n  <section class=\"screen home\" id=\"homeScreen\">\n    <div class=\"statusbar\"></div>\n    <header class=\"topbar\">\n      <button class=\"brand\" id=\"brandButton\" aria-label=\"Reverb\">\n        <svg viewBox=\"0 0 512 512\" aria-hidden=\"true\">\n          <g transform=\"translate(44.5 0)\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"26\">\n            <path d=\"M183.686,358 L212.357,154 L278.357,154 C328.357,154 357.859,186 351.676,230 C345.492,274 306.995,306 256.995,306 L190.995,306\" stroke=\"#2DD4BF\" stroke-opacity=\".16\"/>\n            <path d=\"M252.995,306 L337.686,358\" stroke=\"#2DD4BF\" stroke-opacity=\".16\"/>\n            <path d=\"M155.686,358 L184.357,154 L250.357,154 C300.357,154 329.859,186 323.676,230 C317.492,274 278.995,306 228.995,306 L162.995,306\" stroke=\"#2DD4BF\" stroke-opacity=\".34\"/>\n            <path d=\"M224.995,306 L309.686,358\" stroke=\"#2DD4BF\" stroke-opacity=\".34\"/>\n            <path d=\"M127.686,358 L156.357,154 L222.357,154 C272.357,154 301.859,186 295.676,230 C289.492,274 250.995,306 200.995,306 L134.995,306\" stroke=\"#FFF\"/>\n            <path d=\"M196.995,306 L281.686,358\" stroke=\"#FFF\"/>\n          </g>\n        </svg>\n      </button>\n      <button class=\"settings-button\" id=\"openSettings\" aria-label=\"Open settings\">\n        <svg class=\"icon\" viewBox=\"0 0 24 24\"><path d=\"M19.1,12.9c0,-0.3 0.1,-0.6 0.1,-0.9s0,-0.6 -0.1,-0.9l2,-1.6c0.2,-0.1 0.2,-0.4 0.1,-0.6l-1.9,-3.3c-0.1,-0.2 -0.4,-0.3 -0.6,-0.2l-2.4,1c-0.5,-0.4 -1.1,-0.7 -1.7,-0.9l-0.4,-2.5c0,-0.2 -0.2,-0.4 -0.5,-0.4h-3.8c-0.2,0 -0.4,0.2 -0.5,0.4l-0.4,2.5c-0.6,0.2 -1.2,0.5 -1.7,0.9l-2.4,-1c-0.2,-0.1 -0.5,0 -0.6,0.2l-1.9,3.3c-0.1,0.2 -0.1,0.5 0.1,0.6l2,1.6c0,0.3 -0.1,0.6 -0.1,0.9s0,0.6 0.1,0.9l-2,1.6c-0.2,0.1 -0.2,0.4 -0.1,0.6l1.9,3.3c0.1,0.2 0.4,0.3 0.6,0.2l2.4,-1c0.5,0.4 1.1,0.7 1.7,0.9l0.4,2.5c0,0.2 0.2,0.4 0.5,0.4h3.8c0.2,0 0.4,-0.2 0.5,-0.4l0.4,-2.5c0.6,-0.2 1.2,-0.5 1.7,-0.9l2.4,1c0.2,0.1 0.5,0 0.6,-0.2l1.9,-3.3c0.1,-0.2 0.1,-0.5 -0.1,-0.6zM12,15.6c-2,0 -3.6,-1.6 -3.6,-3.6S10,8.4 12,8.4s3.6,1.6 3.6,3.6 -1.6,3.6 -3.6,3.6z\"/></svg>\n      </button>\n    </header>\n\n    <main class=\"capture\">\n      <div class=\"blob-area\">\n        <button class=\"blob-control\" id=\"blobControl\" aria-label=\"Tap to start capture\">\n          <canvas id=\"blobCanvas\"></canvas>\n          <div class=\"blob-content\">\n            <svg class=\"icon capture-icon\" id=\"blobIcon\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path id=\"blobIconPath\" d=\"M3,14c0,-0.55 0.45,-1 1,-1s1,0.45 1,1v2c0,0.55 -0.45,1 -1,1s-1,-0.45 -1,-1zM6.5,11c0,-0.55 0.45,-1 1,-1s1,0.45 1,1v8c0,0.55 -0.45,1 -1,1s-1,-0.45 -1,-1zM10,8c0,-0.55 0.45,-1 1,-1s1,0.45 1,1v14c0,0.55 -0.45,1 -1,1s-1,-0.45 -1,-1zM13.5,5c0,-0.55 0.45,-1 1,-1s1,0.45 1,1v14c0,0.55 -0.45,1 -1,1s-1,-0.45 -1,-1zM17,8c0,-0.55 0.45,-1 1,-1s1,0.45 1,1v8c0,0.55 -0.45,1 -1,1s-1,-0.45 -1,-1zM20.5,11c0,-0.55 0.45,-1 1,-1s1,0.45 1,1v2c0,0.55 -0.45,1 -1,1s-1,-0.45 -1,-1z\"/></svg>\n            <div class=\"blob-time\" id=\"blobTime\">12:48</div>\n            <div class=\"blob-summary hidden\" id=\"blobSummary\">22.5 MiB</div>\n          </div>\n        </button>\n      </div>\n\n      <div class=\"buffer-selector\" role=\"radiogroup\" aria-label=\"Buffer\">\n        <button class=\"buffer-segment selected\" data-buffer=\"one\"><span class=\"label\">One-shot</span><span class=\"stat\" id=\"oneStat\">12:48</span></button>\n        <button class=\"buffer-segment\" data-buffer=\"loop\"><span class=\"label\">Looping</span><span class=\"stat\" id=\"loopStat\">47:19</span></button>\n      </div>\n      <div class=\"control-gap\"></div>\n      <div class=\"actions-surface\">\n        <button class=\"action-button\" data-toast=\"Export full\" aria-label=\"Export full\"><svg class=\"icon\" viewBox=\"0 0 24 24\"><path d=\"M17,3H5c-1.11,0 -2,0.9 -2,2v14c0,1.1 0.89,2 2,2h14c1.1,0 2,-0.9 2,-2V7l-4,-4zM12,19c-1.66,0 -3,-1.34 -3,-3s1.34,-3 3,-3 3,1.34 3,3 -1.34,3 -3,3zM15,9H5V5h10v4z\"/></svg></button>\n        <button class=\"action-button\" data-toast=\"Export range\" aria-label=\"Export range\"><svg class=\"icon\" viewBox=\"0 0 24 24\"><path d=\"M4,4h2v16H4zM18,4h2v16h-2zM8,7h8v2H8zM11,11h2v4.17l1.59,-1.58L16,15l-4,4 -4,-4 1.41,-1.41L11,15.17z\"/></svg></button>\n        <button class=\"action-button destructive\" data-toast=\"Clear\" aria-label=\"Clear\"><svg class=\"icon\" viewBox=\"0 0 24 24\"><path d=\"M9,3h6l1,1h4v2H4V4h4zM7,8h10v11c0,1.1 -0.9,2 -2,2H9c-1.1,0 -2,-0.9 -2,-2z\"/></svg></button>\n        <button class=\"action-button\" id=\"openLibrary\" aria-label=\"Files\"><svg class=\"icon\" viewBox=\"0 0 24 24\"><path d=\"M14,2H6c-1.1,0 -2,0.9 -2,2v16c0,1.1 0.9,2 2,2h12c1.1,0 2,-0.9 2,-2V8zM14,4.5 17.5,8H14zM12,18v-3.55c0.37,-0.21 0.62,-0.61 0.62,-1.06 0,-0.67 -0.54,-1.21 -1.21,-1.21S10.2,12.72 10.2,13.39c0,0.45 0.25,0.85 0.62,1.06V18c-0.37,0.21 -0.62,0.61 -0.62,1.06 0,0.67 0.54,1.21 1.21,1.21s1.21,-0.54 1.21,-1.21c0,-0.45 -0.25,-0.85 -0.62,-1.06z\"/></svg></button>\n      </div>\n      <div class=\"capture-bottom\"></div>\n    </main>\n    <div class=\"navbar\"></div>\n  </section>\n\n  <section class=\"screen settings-screen\" id=\"settingsScreen\">\n    <div class=\"statusbar\"></div>\n    <header class=\"settings-appbar\">\n      <button class=\"icon-button\" id=\"settingsNav\" aria-label=\"Close\">\n        <svg class=\"icon\" id=\"settingsNavClose\" viewBox=\"0 0 24 24\"><path d=\"M6.5,6.5L17.5,17.5M17.5,6.5L6.5,17.5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.9\" stroke-linecap=\"round\"/></svg>\n        <svg class=\"icon\" id=\"settingsNavUndo\" viewBox=\"0 0 24 24\" style=\"display:none\"><path d=\"M12.5,8C9.99,8 7.7,9.01 6,10.65V6H4v8h8v-2H7.26c1.31,-1.24 3.14,-2 5.24,-2 3.86,0 7.19,2.95 7.5,6.8h2.02C21.71,11.85 17.68,8 12.5,8z\"/></svg>\n      </button>\n      <h1>Settings</h1>\n      <button class=\"icon-button disabled\" id=\"settingsDone\" aria-label=\"Done\"><svg class=\"icon\" viewBox=\"0 0 24 24\"><path d=\"M5.8,12.6L9.8,16.6M9.8,16.6L18.2,8.2\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.9\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg></button>\n    </header>\n    <div class=\"settings-body\" id=\"settingsBody\">\n      <div class=\"section-title\">Background</div>\n      <div class=\"reliability-card\">\n        <div class=\"reliability-copy\"><div class=\"title\">Battery optimization</div><div class=\"summary\">Battery optimization: restricted</div></div>\n        <button class=\"text-button\" data-toast=\"Battery settings\">Battery settings</button>\n      </div>\n      <div class=\"spacer12\"></div>\n\n      <div class=\"field-wrap\">\n        <fieldset class=\"m3-fieldset dropdown\" data-options=\"System|Light|Dark\"><legend>Theme</legend><span class=\"m3-value\">System</span><span class=\"dropdown-arrow\"></span></fieldset>\n      </div>\n      <div class=\"spacer12\"></div>\n\n      <div class=\"section-title\">Retention</div>\n      <div class=\"retention-block\" data-buffer-retention=\"one\">\n        <div class=\"buffer-label\">One-shot</div>\n        <div class=\"retention-fields\">\n          <div class=\"field-shell\" data-retention=\"time\">\n            <fieldset class=\"m3-fieldset\"><legend>Time</legend><span class=\"m3-prefix\"></span><input value=\"30:00\" inputmode=\"text\" aria-label=\"One-shot time\"></fieldset>\n          </div>\n          <div class=\"field-shell inactive\" data-retention=\"size\">\n            <fieldset class=\"m3-fieldset\"><legend>Size (MiB)</legend><span class=\"m3-prefix\">=</span><input value=\"151.4\" inputmode=\"decimal\" aria-label=\"One-shot size\"></fieldset>\n            <div class=\"supporting\">Estimated file size: 151.4 MiB</div>\n          </div>\n        </div>\n      </div>\n      <div class=\"spacer8\"></div>\n      <div class=\"retention-block\" data-buffer-retention=\"loop\">\n        <div class=\"buffer-label\">Looping</div>\n        <div class=\"retention-fields\">\n          <div class=\"field-shell\" data-retention=\"time\">\n            <fieldset class=\"m3-fieldset\"><legend>Time</legend><span class=\"m3-prefix\"></span><input value=\"2:00:00\" inputmode=\"text\" aria-label=\"Looping time\"></fieldset>\n          </div>\n          <div class=\"field-shell inactive\" data-retention=\"size\">\n            <fieldset class=\"m3-fieldset\"><legend>Size (MiB)</legend><span class=\"m3-prefix\">=</span><input value=\"605.6\" inputmode=\"decimal\" aria-label=\"Looping size\"></fieldset>\n            <div class=\"supporting\">Estimated file size: 605.6 MiB</div>\n          </div>\n        </div>\n      </div>\n      <div class=\"export-limit\">Export limit: 13:31:35</div>\n      <div class=\"spacer12\"></div>\n\n      <div class=\"section-title\">Audio</div>\n      <div class=\"field-wrap\" style=\"padding-top:0;padding-bottom:0\">\n        <fieldset class=\"m3-fieldset dropdown\" data-options=\"Mono|Stereo\"><legend>Channels</legend><span class=\"m3-value\">Mono</span><span class=\"dropdown-arrow\"></span></fieldset>\n      </div>\n      <div class=\"field-row\">\n        <fieldset class=\"m3-fieldset dropdown\" data-options=\"8-bit integer|16-bit integer|32-bit float\"><legend>Bit depth</legend><span class=\"m3-value\">16-bit integer</span><span class=\"dropdown-arrow\"></span></fieldset>\n        <fieldset class=\"m3-fieldset dropdown\" data-options=\"96 kHz|88.2 kHz|64 kHz|48 kHz|44.1 kHz|32 kHz|24 kHz|22.05 kHz|16 kHz|12 kHz|11.025 kHz|8 kHz|7.35 kHz\"><legend>Rate</legend><span class=\"m3-value\">44.1 kHz</span><span class=\"dropdown-arrow\"></span></fieldset>\n      </div>\n      <div class=\"field-row\">\n        <fieldset class=\"m3-fieldset dropdown\" data-options=\"Voice|Voice comm|Voice perf|Camcorder|Default|Mic|Unprocessed\"><legend>Source</legend><span class=\"m3-value\">Voice</span><span class=\"dropdown-arrow\"></span></fieldset>\n        <fieldset class=\"m3-fieldset dropdown\" data-options=\"System|Prefer mic\"><legend>Route</legend><span class=\"m3-value\">System</span><span class=\"dropdown-arrow\"></span></fieldset>\n      </div>\n\n      <div class=\"section-title\">Storage</div>\n      <div class=\"storage-card\">\n        <div class=\"storage-row\"><div class=\"storage-path\">App storage/Reverb</div><button class=\"icon-button\" data-toast=\"Choose folder\" aria-label=\"Choose\"><svg class=\"icon\" viewBox=\"0 0 24 24\"><path d=\"M3,6c0,-1.1 0.9,-2 2,-2h4.2c0.5,0 1,0.2 1.4,0.6L12,6h7c1.1,0 2,0.9 2,2v8c0,2.2 -1.8,4 -4,4H7c-2.2,0 -4,-1.8 -4,-4z\"/></svg></button></div>\n        <button class=\"text-button\" data-toast=\"No recordings to move\">Move existing</button>\n      </div>\n\n      <div class=\"spacer16\"></div>\n      <div class=\"switch-row\">\n        <div class=\"switch-copy\"><div class=\"title\">Keep CPU awake</div><div class=\"summary\">Generally not recommended. Keeps the CPU awake while live buffering, improving survival at a higher battery cost.</div></div>\n        <button class=\"m3-switch\" id=\"wakeSwitch\" role=\"switch\" aria-checked=\"false\" aria-label=\"Keep CPU awake\"></button>\n      </div>\n    </div>\n    <div class=\"navbar\"></div>\n  </section>\n\n  <div class=\"scrim\" id=\"libraryScrim\"></div>\n  <section class=\"library-sheet\" id=\"librarySheet\" aria-label=\"Files\">\n    <div class=\"drag-handle-wrap\"><div class=\"drag-handle\"></div></div>\n    <div class=\"library-screen\">\n      <div class=\"library-list\">\n        <div class=\"date-header\">30 August 2026</div>\n        <button class=\"recording-card\" data-recording=\"Interview notes.wav\">\n          <span class=\"audio-round\"><svg class=\"icon\" viewBox=\"0 0 24 24\"><path d=\"M5,9h2v6H5zM9,6h2v12H9zM13,8h2v8H13zM17,10h2v4H17z\"/></svg></span>\n          <span class=\"recording-main\"><span class=\"recording-title\">Interview notes.wav</span><span class=\"recording-subtitle\">18m 42s \u2022 WAV \u00b7 PCM 16</span></span>\n          <span class=\"recording-trail\"><span class=\"top\">8:41 AM</span><span class=\"bottom\">94.4 MiB</span></span>\n        </button>\n        <button class=\"recording-card\" data-recording=\"Guitar idea.wav\">\n          <span class=\"audio-round\"><svg class=\"icon\" viewBox=\"0 0 24 24\"><path d=\"M5,9h2v6H5zM9,6h2v12H9zM13,8h2v8H13zM17,10h2v4H17z\"/></svg></span>\n          <span class=\"recording-main\"><span class=\"recording-title\">Guitar idea.wav</span><span class=\"recording-subtitle\">3m 17s \u2022 WAV \u00b7 PCM 16</span></span>\n          <span class=\"recording-trail\"><span class=\"top\">7:14 AM</span><span class=\"bottom\">16.6 MiB</span></span>\n        </button>\n        <div class=\"date-header\">29 August 2026</div>\n        <button class=\"recording-card\" data-recording=\"Meeting.wav\">\n          <span class=\"audio-round\"><svg class=\"icon\" viewBox=\"0 0 24 24\"><path d=\"M5,9h2v6H5zM9,6h2v12H9zM13,8h2v8H13zM17,10h2v4H17z\"/></svg></span>\n          <span class=\"recording-main\"><span class=\"recording-title\">Meeting.wav</span><span class=\"recording-subtitle\">42m 8s \u2022 WAV \u00b7 PCM 16</span></span>\n          <span class=\"recording-trail\"><span class=\"top\">4:26 PM</span><span class=\"bottom\">212.6 MiB</span></span>\n        </button>\n        <button class=\"recording-card\" data-recording=\"Recording 2026-08-29 10-12-03.wav\">\n          <span class=\"audio-round\"><svg class=\"icon\" viewBox=\"0 0 24 24\"><path d=\"M5,9h2v6H5zM9,6h2v12H9zM13,8h2v8H13zM17,10h2v4H17z\"/></svg></span>\n          <span class=\"recording-main\"><span class=\"recording-title\">Recording 2026-08-29 10-12-03.wav</span><span class=\"recording-subtitle\">7m 54s \u2022 WAV \u00b7 PCM 16</span></span>\n          <span class=\"recording-trail\"><span class=\"top\">10:12 AM</span><span class=\"bottom\">40.0 MiB</span></span>\n        </button>\n      </div>\n    </div>\n  </section>\n\n  <div class=\"dropdown-menu\" id=\"dropdownMenu\"></div>\n  <div class=\"about-scrim\" id=\"aboutScrim\"></div>\n  <section class=\"about-sheet\" id=\"aboutSheet\" role=\"dialog\" aria-modal=\"true\" aria-label=\"About Reverb\">\n    <button class=\"icon-button about-close\" id=\"aboutClose\" aria-label=\"Close\"><svg class=\"icon\" viewBox=\"0 0 24 24\"><path d=\"M6.5,6.5L17.5,17.5M17.5,6.5L6.5,17.5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.9\" stroke-linecap=\"round\"/></svg></button>\n    <div class=\"about-logo\" aria-hidden=\"true\">\n      <svg viewBox=\"0 0 512 512\">\n        <g transform=\"translate(44.5 0)\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"26\">\n          <path d=\"M183.686,358 L212.357,154 L278.357,154 C328.357,154 357.859,186 351.676,230 C345.492,274 306.995,306 256.995,306 L190.995,306\" stroke=\"#2DD4BF\" stroke-opacity=\".16\"/><path d=\"M252.995,306 L337.686,358\" stroke=\"#2DD4BF\" stroke-opacity=\".16\"/>\n          <path d=\"M155.686,358 L184.357,154 L250.357,154 C300.357,154 329.859,186 323.676,230 C317.492,274 278.995,306 228.995,306 L162.995,306\" stroke=\"#2DD4BF\" stroke-opacity=\".34\"/><path d=\"M224.995,306 L309.686,358\" stroke=\"#2DD4BF\" stroke-opacity=\".34\"/>\n          <path d=\"M127.686,358 L156.357,154 L222.357,154 C272.357,154 301.859,186 295.676,230 C289.492,274 250.995,306 200.995,306 L134.995,306\" stroke=\"#FFF\"/><path d=\"M196.995,306 L281.686,358\" stroke=\"#FFF\"/>\n        </g>\n      </svg>\n    </div>\n    <div class=\"about-name\">Reverb</div>\n    <div class=\"about-version\">Version 0.1.0</div>\n    <a class=\"about-repo\" id=\"aboutRepo\" href=\"https://github.com/SmallThingz/reverb\" target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"GitHub repository SmallThingz/reverb\">\n      <svg viewBox=\"0 0 24 24\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M12,2C6.48,2 2,6.58 2,12.22c0,4.5 2.87,8.31 6.84,9.65c0.5,0.1 0.68,-0.22 0.68,-0.49c0,-0.24 -0.01,-1.04 -0.01,-1.89c-2.78,0.62 -3.37,-1.21 -3.37,-1.21c-0.45,-1.18 -1.11,-1.49 -1.11,-1.49c-0.91,-0.64 0.07,-0.63 0.07,-0.63c1,0.07 1.53,1.05 1.53,1.05c0.9,1.57 2.36,1.12 2.94,0.85c0.09,-0.67 0.35,-1.12 0.63,-1.37c-2.22,-0.26 -4.55,-1.14 -4.55,-5.06c0,-1.12 0.39,-2.03 1.03,-2.75c-0.1,-0.26 -0.45,-1.31 0.1,-2.73c0,0 0.84,-0.28 2.75,1.05c0.8,-0.23 1.65,-0.35 2.5,-0.35c0.85,0 1.7,0.12 2.5,0.35c1.91,-1.33 2.75,-1.05 2.75,-1.05c0.55,1.42 0.2,2.47 0.1,2.73c0.64,0.72 1.03,1.63 1.03,2.75c0,3.93 -2.33,4.8 -4.56,5.05c0.36,0.32 0.68,0.93 0.68,1.88c0,1.36 -0.01,2.45 -0.01,2.78c0,0.27 0.18,0.6 0.69,0.49C19.13,20.52 22,16.72 22,12.22C22,6.58 17.52,2 12,2z\"/></svg>\n      <span class=\"about-repo-copy\"><strong>GitHub repository</strong><span>SmallThingz/reverb</span></span>\n    </a>\n  </section>\n  <div class=\"dialog-layer\" id=\"dialogLayer\"><div class=\"dialog\"><div class=\"dialog-title-row\"><div class=\"dialog-title\" id=\"dialogTitle\">Reverb</div><button class=\"icon-button\" id=\"dialogClose\"><svg class=\"icon\" viewBox=\"0 0 24 24\"><path d=\"M6.5,6.5L17.5,17.5M17.5,6.5L6.5,17.5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.9\" stroke-linecap=\"round\"/></svg></button></div><div class=\"dialog-body\" id=\"dialogBody\"></div></div></div>\n  <div class=\"toast\" id=\"toast\"></div>\n</div>\n</div>\n\n</body>\n</html>\n";// Interactive Reverb demo runtime. Kept as a normal module so Vite can
// parse/transform it for the site's browser target (including Android WebView).
function runReverbDemoRuntime(document, requestAnimationFrame, setTimeout, clearTimeout, devicePixelRatio) {
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

};const reverbFullscreenStateKey="__sameyReverbFullscreen";
function animateReverbFrame(frame,before,reduceMotion){
  frame.getAnimations().forEach(animation=>animation.cancel());
  if(reduceMotion)return;
  const after=frame.getBoundingClientRect();
  if(!before.width||!before.height||!after.width||!after.height)return;
  const dx=before.left-after.left,dy=before.top-after.top,sx=before.width/after.width,sy=before.height/after.height;
  frame.animate([{transformOrigin:"top left",transform:`translate(${dx}px,${dy}px) scale(${sx},${sy})`},{transformOrigin:"top left",transform:"translate(0,0) scale(1,1)"}],{duration:280,easing:"cubic-bezier(.2,0,0,1)"});
}
function installReverbFullscreen(frame,button){
  const token=`reverb-${Math.random().toString(36).slice(2)}`,reduceMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let active=false,previousBodyOverflow="",previousHtmlOverflow="";
  const stateIsOurs=()=>Boolean(history.state&&history.state[reverbFullscreenStateKey]===token);
  const setFullscreen=next=>{
    if(next===active)return;
    const before=frame.getBoundingClientRect();active=next;button.classList.toggle("is-active",next);button.setAttribute("aria-label",next?"Exit fullscreen demo":"Fullscreen demo");button.setAttribute("aria-pressed",String(next));
    if(next){previousBodyOverflow=document.body.style.overflow;previousHtmlOverflow=document.documentElement.style.overflow;document.body.style.overflow="hidden";document.documentElement.style.overflow="hidden";frame.classList.add("is-fullscreen")}else{frame.classList.remove("is-fullscreen");document.body.style.overflow=previousBodyOverflow;document.documentElement.style.overflow=previousHtmlOverflow}
    animateReverbFrame(frame,before,reduceMotion);
  };
  const enterFullscreen=()=>{if(active)return;const state=history.state&&typeof history.state==="object"?history.state:{};history.pushState({...state,[reverbFullscreenStateKey]:token},"",location.href);setFullscreen(true)};
  const exitFullscreen=()=>{if(!active)return;if(stateIsOurs())history.back();else setFullscreen(false)};
  const onButtonClick=()=>active?exitFullscreen():enterFullscreen(),onPopState=()=>setFullscreen(stateIsOurs());
  button.addEventListener("click",onButtonClick);window.addEventListener("popstate",onPopState);
  return()=>{button.removeEventListener("click",onButtonClick);window.removeEventListener("popstate",onPopState);if(active){frame.classList.remove("is-fullscreen");document.body.style.overflow=previousBodyOverflow;document.documentElement.style.overflow=previousHtmlOverflow}};
}
function d(){
  let section=document.createElement("section");section.className="detail-copy reverb-demo-section";section.setAttribute("aria-labelledby","reverb-ui-demo-title");
  section.innerHTML='<div class="reverb-demo-head"><div><h2 id="reverb-ui-demo-title">UI demo</h2><p>Interactive mock of Reverb\'s current Android interface.</p></div></div><div class="reverb-demo-frame-shell"><div class="reverb-demo-frame"><div class="reverb-demo-host" role="group" aria-label="Interactive Reverb UI demo"></div><button class="reverb-demo-fullscreen-button" type="button" aria-label="Fullscreen demo" aria-pressed="false"><svg class="expand-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5v2H6v3H4zm11-5h5v5h-2V6h-3V4zM6 15v3h3v2H4v-5h2zm12 3v-3h2v5h-5v-2h3z"></path></svg><svg class="collapse-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4V7h3V4h2zm6 0h2v3h3v2h-5V4zM4 15h5v5H7v-3H4v-2zm11 0h5v2h-3v3h-2v-5z"></path></svg></button></div></div>';
  const frame=section.querySelector(".reverb-demo-frame"),host=section.querySelector(".reverb-demo-host"),fullscreenButton=section.querySelector(".reverb-demo-fullscreen-button"),parsed=new DOMParser().parseFromString(h,"text/html"),shadow=host.attachShadow({mode:"open"}),style=document.createElement("style");
  style.textContent=(parsed.querySelector("style")?.textContent??"").split(":root").join(":host").split("html,body").join(":host");shadow.append(style);for(const node of Array.from(parsed.body.childNodes))if(!(node instanceof HTMLScriptElement))shadow.append(node.cloneNode(true));
  let disposed=false;const rafs=new Set,timers=new Set;const requestDemoFrame=callback=>{let id=0;id=window.requestAnimationFrame(time=>{rafs.delete(id);if(!disposed)callback(time)});rafs.add(id);return id};const setDemoTimeout=(handler,timeout,...args)=>{let id=0;id=window.setTimeout(()=>{timers.delete(id);if(!disposed)handler(...args)},timeout);timers.add(id);return id};const clearDemoTimeout=id=>{if(id==null)return;timers.delete(id);window.clearTimeout(id)};
  const demoDocument={createElement:document.createElement.bind(document),getElementById:id=>shadow.querySelector(`#${id}`),querySelector:selectors=>shadow.querySelector(selectors),querySelectorAll:selectors=>shadow.querySelectorAll(selectors),addEventListener:(type,listener,options)=>shadow.addEventListener(type,listener,options)};
  runReverbDemoRuntime(demoDocument,requestDemoFrame,setDemoTimeout,clearDemoTimeout,window.devicePixelRatio||1);const disposeFullscreen=installReverbFullscreen(frame,fullscreenButton);
  sameyCleanup(()=>{disposed=true;disposeFullscreen();for(const id of rafs)window.cancelAnimationFrame(id);for(const id of timers)window.clearTimeout(id);rafs.clear();timers.clear();shadow.replaceChildren()});return section;
}
function cnnDemo(){
  const outputs=[`0`,`1`,`2`,`3`,`4`,`5`,`6`,`7`,`8`,`9`,`?`],section=document.createElement(`section`);section.className=`detail-copy cnn-demo-section`;section.setAttribute(`aria-labelledby`,`cnn-demo-title`);
  section.innerHTML=`<div class="cnn-demo-head"><div><h2 id="cnn-demo-title">Draw something</h2><p>Sketch a digit, symbol, or noise. Greys work too.</p></div></div><div class="cnn-demo-shell"><div class="cnn-draw-pane"><div class="cnn-pad-wrap"><div class="cnn-pad-glow" aria-hidden="true"></div><div class="cnn-pad-grid" aria-hidden="true"></div><canvas class="cnn-pad" width="280" height="280" aria-label="Draw a digit or unknown symbol"></canvas><div class="cnn-pad-empty" aria-hidden="true"><span>DRAW</span><small>0–9, symbols, greys, noise</small></div><canvas class="cnn-sample-canvas" width="28" height="28" aria-hidden="true"></canvas></div></div><div class="cnn-settings-pane"><div class="cnn-controls-row"><label class="cnn-ink-control"><span><b>INTENSITY</b><output>72%</output></span><input class="cnn-ink-range" type="range" min="10" max="100" step="2" value="72" aria-label="Drawing intensity" style="--cnn-ink:72%"></label><button type="button" class="cnn-clear" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"></path></svg>Clear</button></div><div class="cnn-output-summary"><div><span class="cnn-output-label">PREDICTION</span><strong class="cnn-prediction">—</strong></div><div class="cnn-confidence"><span>CONFIDENCE</span><b>—</b></div></div><div class="cnn-probabilities" aria-label="Class probabilities"></div><div class="cnn-output-foot"><span class="cnn-unknown-key"><b>?</b> unknown</span></div></div></div>`;
  const canvas=section.querySelector(`.cnn-pad`),sample=section.querySelector(`.cnn-sample-canvas`),empty=section.querySelector(`.cnn-pad-empty`),clear=section.querySelector(`.cnn-clear`),inkRange=section.querySelector(`.cnn-ink-range`),inkOutput=section.querySelector(`.cnn-ink-control output`),probabilities=section.querySelector(`.cnn-probabilities`),prediction=section.querySelector(`.cnn-prediction`),confidence=section.querySelector(`.cnn-confidence b`),ctx=canvas.getContext(`2d`,{willReadFrequently:true}),sampleCtx=sample.getContext(`2d`,{willReadFrequently:true});
  probabilities.innerHTML=outputs.map(label=>`<div class="cnn-probability-row" data-label="${label}"><span class="cnn-class" title="${label===`?`?`Unknown symbol`:`Digit ${label}`}">${label}</span><div class="cnn-meter" aria-hidden="true"><i></i></div><span class="cnn-percent">—</span></div>`).join(``);
  let drawing=false,hasInk=false,lastX=0,lastY=0,inferenceFrame=0,inkLevel=.72,wasm=null,modelState=`loading`,inferenceError=false,disposed=false;
  const themeInk=()=>{const style=getComputedStyle(document.documentElement);return style.getPropertyValue(`--site-accent`).trim()||style.getPropertyValue(`--site-fg`).trim()||`#777`};
  const applyBrush=()=>{ctx.globalCompositeOperation=`source-over`;ctx.globalAlpha=inkLevel;ctx.fillStyle=themeInk();ctx.strokeStyle=themeInk();ctx.lineWidth=19;ctx.lineCap=`round`;ctx.lineJoin=`round`};
  const refreshStatus=()=>{};
  applyBrush();refreshStatus();
  const point=event=>{const rect=canvas.getBoundingClientRect();return{x:(event.clientX-rect.left)*280/rect.width,y:(event.clientY-rect.top)*280/rect.height}};
  const extractInput=()=>{sampleCtx.clearRect(0,0,28,28);sampleCtx.drawImage(canvas,0,0,28,28);const rgba=sampleCtx.getImageData(0,0,28,28).data,input=new Uint8Array(784);for(let i=0;i<input.length;i++)input[i]=rgba[i*4+3];return input};
  const renderScores=(values,classId=null)=>{let scores=null;if(values&&values.length===11)scores=Array.from(values,value=>Number.isFinite(value)?Math.max(0,Number(value)):0);const validClass=Number.isInteger(classId)&&classId>=0&&classId<outputs.length?classId:null,rows=[...probabilities.children];rows.forEach((row,index)=>{const score=scores?.[index]??null;row.dataset.leading=`${validClass===index}`;row.querySelector(`.cnn-meter i`).style.width=`${(score??0)*100}%`;row.querySelector(`.cnn-percent`).textContent=score==null?`—`:`${(score*100).toFixed(score>=.1?1:2)}%`});if(validClass!=null&&scores){prediction.textContent=outputs[validClass];confidence.textContent=`${Math.round(scores[validClass]*100)}%`}else{prediction.textContent=`—`;confidence.textContent=`—`}};
  const infer=()=>{inferenceFrame=0;if(!hasInk){sampleCtx.clearRect(0,0,28,28);renderScores(null);inferenceError=false;refreshStatus();return}const input=extractInput();if(!wasm||modelState!==`ready`){renderScores(null);refreshStatus();return}try{new Uint8Array(wasm.memory.buffer,wasm.image_ptr(),input.length).set(input);const classId=wasm.predict();if(classId>=outputs.length)throw new Error(`CNN inference returned invalid class ${classId}`);const raw=new Float32Array(wasm.memory.buffer,wasm.probabilities_ptr(),wasm.class_count());renderScores(raw,classId);inferenceError=false;refreshStatus()}catch(error){console.error(`CNN demo inference failed`,error);renderScores(null);inferenceError=true;refreshStatus()}};
  const queueInference=()=>{if(!inferenceFrame)inferenceFrame=requestAnimationFrame(infer)};
  const begin=event=>{if(event.button!==0&&event.pointerType===`mouse`)return;event.preventDefault();canvas.setPointerCapture(event.pointerId);const p=point(event);drawing=true;lastX=p.x;lastY=p.y;applyBrush();ctx.beginPath();ctx.arc(p.x,p.y,9.5,0,Math.PI*2);ctx.fill();hasInk=true;empty.hidden=true;clear.disabled=false;queueInference()};
  const move=event=>{if(!drawing)return;event.preventDefault();const p=point(event);applyBrush();ctx.beginPath();ctx.moveTo(lastX,lastY);ctx.lineTo(p.x,p.y);ctx.stroke();lastX=p.x;lastY=p.y;hasInk=true;queueInference()};
  const end=event=>{if(!drawing)return;drawing=false;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);queueInference()};
  const clearPad=()=>{drawing=false;ctx.save();ctx.globalAlpha=1;ctx.clearRect(0,0,280,280);ctx.restore();sampleCtx.clearRect(0,0,28,28);hasInk=false;empty.hidden=false;clear.disabled=true;renderScores(null);inferenceError=false;applyBrush();refreshStatus()};
  const onInkInput=()=>{inkLevel=Number(inkRange.value)/100;inkOutput.textContent=`${Math.round(inkLevel*100)}%`;inkRange.style.setProperty(`--cnn-ink`,`${Math.round(inkLevel*100)}%`);applyBrush()};
  const onTheme=()=>{if(hasInk){ctx.save();ctx.globalCompositeOperation=`source-in`;ctx.globalAlpha=1;ctx.fillStyle=themeInk();ctx.fillRect(0,0,280,280);ctx.restore();queueInference()}applyBrush()};
  canvas.addEventListener(`pointerdown`,begin);canvas.addEventListener(`pointermove`,move);canvas.addEventListener(`pointerup`,end);canvas.addEventListener(`pointercancel`,end);clear.addEventListener(`click`,clearPad);inkRange.addEventListener(`input`,onInkInput);window.addEventListener(`samey-themechange`,onTheme);
  void (async()=>{try{const response=await fetch(`/cnn.wasm`);if(!response.ok)throw new Error(`cnn.wasm: HTTP ${response.status}`);let result;try{result=await WebAssembly.instantiateStreaming(response.clone())}catch{result=await WebAssembly.instantiate(await response.arrayBuffer())}if(disposed)return;const candidate=result.instance.exports;if(!(candidate.memory instanceof WebAssembly.Memory)||typeof candidate.image_ptr!==`function`||typeof candidate.probabilities_ptr!==`function`||typeof candidate.predict!==`function`||typeof candidate.class_count!==`function`||typeof candidate.unknown_class!==`function`)throw new Error(`cnn.wasm has an incompatible ABI`);if(candidate.class_count()!==outputs.length||candidate.unknown_class()!==outputs.indexOf(`?`))throw new Error(`cnn.wasm metadata mismatch: ${candidate.class_count()} classes, unknown=${candidate.unknown_class()}`);wasm=candidate;modelState=`ready`;inferenceError=false;refreshStatus();if(hasInk)queueInference()}catch(error){if(disposed)return;console.error(`CNN demo WASM load failed`,error);modelState=`error`;inferenceError=true;refreshStatus()}})();
  sameyCleanup(()=>{disposed=true;if(inferenceFrame)cancelAnimationFrame(inferenceFrame);canvas.removeEventListener(`pointerdown`,begin);canvas.removeEventListener(`pointermove`,move);canvas.removeEventListener(`pointerup`,end);canvas.removeEventListener(`pointercancel`,end);clear.removeEventListener(`click`,clearPad);inkRange.removeEventListener(`input`,onInkInput);window.removeEventListener(`samey-themechange`,onTheme)});return section;
}

function l(t){return[e(r,{get start(){return e(i,{href:`/work/`,children:`Work`})}}),(()=>{var r=s(),i=r.firstChild.firstChild.nextSibling,o=i.nextSibling,l=o.nextSibling,u=l.nextSibling,f=u.firstChild.nextSibling,m=u.nextSibling,h=m.nextSibling;return h.firstChild,n(i,()=>t.detail.title),n(o,()=>t.detail.dek),n(l,()=>t.detail.facts.map(e=>(()=>{var t=c();return n(t,e),t})())),n(f,()=>t.detail.body),t.detail.demo===`reverb-ui`?m.replaceWith(d()):t.detail.demo===`cnn-draw`?m.replaceWith(cnnDemo()):m.remove(),n(h,e(a,{get entries(){return t.detail.links}}),null),r})()]}export{l as ProjectPage};