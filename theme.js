(() => {
  const SCRIPT_ROOT = new URL(".", document.currentScript?.src || location.href);
  const KEY = "keybr.theme";
  const WORDLE_KEY = "ui-theme";
  const FONT_KEY = "samey.font";
  const COLOR_IDS = ["light", "clear-light", "dark", "clear-dark", "custom"];
  const FONT_IDS = ["sans-serif", "serif", "monospace", "cursive"];
  const colors = {
    light: { tone: "light", background: "#ffffff", text: "#121213", accent: "#787c7e", error: "#ff3333" },
    "clear-light": { tone: "light", background: "#faf9f8", text: "#202332", accent: "#355d82", error: "#c43d46" },
    dark: { tone: "dark", background: "#121213", text: "#f8f8f8", accent: "#a7a7a7", error: "#9b4545" },
    "clear-dark": { tone: "dark", background: "#303237", text: "#b0b4bd", accent: "#7c9fc4", error: "#e2848b" },
  };
  const colorLabels = { system: "System", light: "Light", "clear-light": "Clear light", dark: "Dark", "clear-dark": "Clear dark" };
  const fontLabels = { "sans-serif": "Sans serif", serif: "Serif", monospace: "Monospace", cursive: "Cursive" };
  const fontStacks = {
    "sans-serif": 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    serif: 'ui-serif,Georgia,Cambria,"Times New Roman",serif',
    monospace: 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace',
    cursive: 'cursive',
  };

  const validHex = (value) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
  const mix = (a, b, weight) => {
    const rgb = (value) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
    const aa = rgb(a), bb = rgb(b);
    return "#" + aa.map((value, i) => Math.round(value * (1 - weight) + bb[i] * weight).toString(16).padStart(2, "0")).join("");
  };
  const hsl = (hex) => {
    let [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return `0 0% ${+(l * 100).toFixed(2)}%`;
    const d = max - min;
    const s = l > .5 ? d / (2 - max - min) : d / (max + min);
    let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return `${+((h / 6) * 360).toFixed(2)} ${+(s * 100).toFixed(2)}% ${+(l * 100).toFixed(2)}%`;
  };
  const rawPrefs = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || "null") || {}; } catch { return {}; }
  };
  const readFont = () => {
    try {
      const value = localStorage.getItem(FONT_KEY);
      if (FONT_IDS.includes(value)) return value;
    } catch {}
    const legacy = rawPrefs().font;
    return FONT_IDS.includes(legacy) ? legacy : "sans-serif";
  };
  const read = () => {
    const raw = rawPrefs();
    let selected = raw.color;
    let color = selected;
    if (color === "system" || !COLOR_IDS.includes(color)) color = matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const font = readFont();
    if (color !== "custom") return { color, selected: selected || "system", font, ...colors[color] };
    const custom = raw.custom || {};
    const fallback = custom.tone === "dark" ? colors.dark : colors.light;
    return {
      color,
      selected: "custom",
      font,
      tone: custom.tone === "dark" ? "dark" : "light",
      background: validHex(custom.background) ? custom.background.toLowerCase() : fallback.background,
      text: validHex(custom.text) ? custom.text.toLowerCase() : fallback.text,
      accent: validHex(custom.accent) ? custom.accent.toLowerCase() : fallback.accent,
      error: validHex(custom.error) ? custom.error.toLowerCase() : fallback.error,
    };
  };

  const nativeSetItem = Storage.prototype.setItem;
  let notifying = false;
  const notify = (theme) => {
    if (notifying) return;
    notifying = true;
    dispatchEvent(new CustomEvent("samey-themechange", { detail: theme }));
    notifying = false;
  };
  const apply = () => {
    const theme = read();
    const root = document.documentElement;
    root.dataset.siteTheme = theme.color;
    root.dataset.kbTheme = theme.tone;
    root.dataset.font = theme.font;
    if (theme.color !== "custom") root.dataset.color = theme.color;
    else if (root.dataset.siteKind !== "keybr") root.removeAttribute("data-color");
    root.classList.toggle("dark", theme.tone === "dark");
    root.style.colorScheme = theme.tone;

    const line = mix(theme.text, theme.background, theme.tone === "dark" ? .72 : .82);
    const soft = mix(theme.text, theme.background, theme.tone === "dark" ? .9 : .96);
    root.style.setProperty("--site-bg", theme.background);
    root.style.setProperty("--site-fg", theme.text);
    root.style.setProperty("--site-muted", mix(theme.text, theme.background, .42));
    root.style.setProperty("--site-line", line);
    root.style.setProperty("--site-soft", soft);
    root.style.setProperty("--site-accent", theme.accent);
    root.style.setProperty("--site-error", theme.error);
    root.style.setProperty("--site-font", fontStacks[theme.font]);

    // Wordle uses Tailwind/shadcn-style variables whose names collide with
    // Keybr's palette variables. Never install these variables on Keybr.
    if (root.dataset.siteKind === "wordle") {
      root.style.setProperty("--background", hsl(theme.background));
      root.style.setProperty("--foreground", hsl(theme.text));
      root.style.setProperty("--card", hsl(theme.background));
      root.style.setProperty("--card-foreground", hsl(theme.text));
      root.style.setProperty("--popover", hsl(theme.background));
      root.style.setProperty("--popover-foreground", hsl(theme.text));
      root.style.setProperty("--primary", hsl(theme.text));
      root.style.setProperty("--primary-foreground", hsl(theme.background));
      root.style.setProperty("--secondary", hsl(soft));
      root.style.setProperty("--secondary-foreground", hsl(theme.text));
      root.style.setProperty("--muted", hsl(soft));
      root.style.setProperty("--muted-foreground", hsl(mix(theme.text, theme.background, .42)));
      root.style.setProperty("--accent", hsl(soft));
      root.style.setProperty("--accent-foreground", hsl(theme.text));
      root.style.setProperty("--border", hsl(line));
      root.style.setProperty("--input", hsl(line));
      root.style.setProperty("--ring", hsl(theme.accent));
      root.style.setProperty("--error-foreground", hsl(theme.error));
      try { nativeSetItem.call(localStorage, WORDLE_KEY, theme.tone); } catch {}
    }

    document.querySelectorAll("[data-theme-choice]").forEach((el) => el.toggleAttribute("data-selected", el.dataset.themeChoice === theme.selected));
    document.querySelectorAll("[data-font-choice]").forEach((el) => el.toggleAttribute("data-selected", el.dataset.fontChoice === theme.font));
    notify(theme);
    return theme;
  };

  Storage.prototype.setItem = function (key, value) {
    nativeSetItem.call(this, key, value);
    if (this === localStorage && (key === KEY || key === FONT_KEY)) queueMicrotask(apply);
    if (this === localStorage && key === WORDLE_KEY && (value === "light" || value === "dark")) {
      const raw = rawPrefs();
      if (raw.color !== value) {
        const { font: _legacyFont, ...theme } = raw;
        nativeSetItem.call(localStorage, KEY, JSON.stringify({ ...theme, color: value }));
      }
      queueMicrotask(apply);
    }
  };

  const icon = (name) => name === "home"
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z"/></svg>'
    : name === "back"
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/><path d="M9 12h11"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/></svg>';

  const navTarget = () => {
    const root = document.documentElement;
    if (root.dataset.siteKind === "wordle") {
      const url = new URL(location.href);
      if ((url.searchParams.get("p") || "0") !== "0") {
        url.searchParams.set("p", "0");
        url.searchParams.delete("v");
        return { href: url.href, icon: "back", label: "Back to Wordle" };
      }
    }
    if (root.dataset.backHref) return { href: root.dataset.backHref, icon: "back", label: "Back" };
    return root.dataset.homeHref ? { href: root.dataset.homeHref, icon: "home", label: "Home" } : null;
  };

  const setPrefs = (patch) => {
    if (Object.hasOwn(patch, "font")) {
      nativeSetItem.call(localStorage, FONT_KEY, patch.font);
    }
    const themePatch = { ...patch };
    delete themePatch.font;
    if (Object.keys(themePatch).length > 0) {
      const raw = rawPrefs();
      const { font: _legacyFont, ...theme } = raw;
      nativeSetItem.call(localStorage, KEY, JSON.stringify({ ...theme, ...themePatch }));
    }
    apply();
  };
  const section = (title, items, attr) => `<div class="samey-panel-title">${title}</div>${Object.entries(items).map(([value, label]) => `<button type="button" ${attr}="${value}">${label}</button>`).join("")}`;
  const mountControls = () => {
    if (document.getElementById("samey-site-controls")) return;
    const host = document.createElement("div");
    host.id = "samey-site-controls";
    host.className = "samey-site-controls";
    host.dataset.sameyRuntime = "";
    const nav = navTarget();
    if (nav) host.insertAdjacentHTML("beforeend", `<a class="samey-icon samey-nav" href="${nav.href}" aria-label="${nav.label}" title="${nav.label}">${icon(nav.icon)}</a>`);

    host.insertAdjacentHTML("beforeend", `<button class="samey-icon" type="button" aria-label="Appearance" title="Appearance" aria-expanded="false">${icon("appearance")}</button>`);
    const panel = document.createElement("div");
    panel.className = "samey-theme-panel";
    panel.hidden = true;
    panel.innerHTML = section("Theme", colorLabels, "data-theme-choice") + section("Font", fontLabels, "data-font-choice");
    host.append(panel);
    const trigger = host.querySelector('.samey-icon[type="button"]');
    trigger.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      trigger.setAttribute("aria-expanded", String(!panel.hidden));
    });
    panel.addEventListener("click", (event) => {
      const themeButton = event.target.closest("[data-theme-choice]");
      if (themeButton) setPrefs({ color: themeButton.dataset.themeChoice });
      const fontButton = event.target.closest("[data-font-choice]");
      if (fontButton) setPrefs({ font: fontButton.dataset.fontChoice });
    });
    document.addEventListener("pointerdown", (event) => {
      if (!host.contains(event.target)) {
        panel.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
      }
    });
    document.body.append(host);
    apply();
  };

  const refreshNav = () => {
    const target = navTarget();
    const el = document.querySelector("#samey-site-controls .samey-nav");
    if (!el || !target) return;
    el.href = target.href;
    el.setAttribute("aria-label", target.label);
    el.title = target.label;
    el.innerHTML = icon(target.icon);
  };

  const pushState = history.pushState.bind(history);
  const replaceState = history.replaceState.bind(history);
  history.pushState = (...args) => { pushState(...args); dispatchEvent(new Event("samey-locationchange")); };
  history.replaceState = (...args) => { replaceState(...args); dispatchEvent(new Event("samey-locationchange")); };
  addEventListener("popstate", () => queueMicrotask(refreshNav));
  addEventListener("samey-locationchange", () => queueMicrotask(refreshNav));

  const runtimeNode = (el) => { el.dataset.sameyRuntime = ""; return el; };

  const mountCursor = () => {
    if (!matchMedia?.("(pointer:fine)").matches || document.getElementById("samey-cursor")) return;
    const cursor = runtimeNode(document.createElement("div"));
    cursor.id = "samey-cursor";
    cursor.className = "samey-cursor";
    cursor.innerHTML = `<span class="samey-cursor-dot"></span><svg class="samey-cursor-grab" viewBox="0 0 64 64" aria-hidden="true"><mask id="samey-grab-mask"><circle cx="32" cy="32" r="14" fill="white"/><rect x="29" y="16" width="6" height="7" fill="black"/><rect x="29" y="41" width="6" height="7" fill="black"/><rect x="16" y="29" width="7" height="6" fill="black"/><rect x="41" y="29" width="7" height="6" fill="black"/></mask><circle cx="32" cy="32" r="14" fill="currentColor" mask="url(#samey-grab-mask)"/></svg>`;
    document.documentElement.classList.add("samey-custom-cursor");
    document.body.append(cursor);
    const move = (event) => {
      cursor.style.transform = `translate3d(${event.clientX}px,${event.clientY}px,0) translate(-50%,-50%)`;
      cursor.dataset.visible = "";
    };
    const wantsGrab = (target) => {
      if (!(target instanceof Element)) return false;
      if (target.closest(".samey-vscroll-thumb,input[type=range],[draggable=true],[data-grab-cursor]")) return true;
      const value = getComputedStyle(target).cursor;
      return value === "grab" || value === "grabbing" || value === "ew-resize" || value === "ns-resize" || value === "col-resize" || value === "row-resize";
    };
    document.addEventListener("pointermove", move, { capture: true, passive: true });
    document.addEventListener("pointerrawupdate", move, { capture: true, passive: true });
    document.addEventListener("mousemove", move, { capture: true, passive: true });
    document.addEventListener("pointerdown", (event) => { if (wantsGrab(event.target)) cursor.dataset.grab = ""; }, true);
    addEventListener("pointerup", () => delete cursor.dataset.grab, true);
    addEventListener("pointercancel", () => delete cursor.dataset.grab, true);
    addEventListener("blur", () => delete cursor.dataset.grab);
    addEventListener("pointerout", (event) => { if (!event.relatedTarget) delete cursor.dataset.visible; });
  };

  const editableTarget = (el) => {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el;
    return el instanceof Element ? el.closest('[contenteditable="true"], [contenteditable="plaintext-only"]') : null;
  };
  const selectedText = () => getSelection()?.toString() || "";
  const writeClipboard = async (text) => {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); }
    catch {
      const area = document.createElement("textarea");
      area.value = text; area.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.append(area); area.select(); document.execCommand("copy"); area.remove();
    }
  };
  const pasteInto = (el, text) => {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.setRangeText(text, el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length, "end");
      el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertFromPaste", data: text }));
    } else if (el?.isContentEditable) {
      el.focus(); document.execCommand("insertText", false, text);
    }
  };
  const captureScreenshot = async () => {
    const stream = await navigator.mediaDevices?.getDisplayMedia?.({ video: { displaySurface: "browser" }, audio: false });
    if (!stream) return;
    try {
      const video = document.createElement("video");
      video.srcObject = stream; video.muted = true; await video.play();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      if (blob) {
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
        a.download = `samey-${new Date().toISOString().replace(/[:.]/g, "-")}.png`; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }
    } finally { stream.getTracks().forEach(track => track.stop()); }
  };

  const mountContextMenu = () => {
    if (document.getElementById("samey-context-menu")) return;
    const menu = runtimeNode(document.createElement("div"));
    menu.id = "samey-context-menu"; menu.className = "samey-context-menu"; menu.hidden = true;
    document.body.append(menu);
    let target = null;
    const close = () => { menu.hidden = true; menu.replaceChildren(); };
    const add = (label, action, enabled = true) => {
      const button = document.createElement("button"); button.type = "button"; button.textContent = label; button.disabled = !enabled;
      button.addEventListener("click", async () => { close(); try { await action(); } catch {} }); menu.append(button);
    };
    const sep = () => { const hr = document.createElement("hr"); menu.append(hr); };
    document.addEventListener("contextmenu", (event) => {
      event.preventDefault(); target = event.target; menu.replaceChildren();
      const link = target instanceof Element ? target.closest("a[href]") : null;
      const image = target instanceof Element ? target.closest("img[src]") : null;
      const selection = selectedText();
      const editable = editableTarget(target);
      if (selection) add("Copy", () => writeClipboard(selection));
      if (editable) add("Paste", async () => pasteInto(editable, await navigator.clipboard.readText()), !!navigator.clipboard?.readText);
      add("Select all", () => {
        if (editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement) { editable.focus(); editable.select(); }
        else if (editable) { const range = document.createRange(); range.selectNodeContents(editable); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range); }
        else { const range = document.createRange(); range.selectNodeContents(document.body); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range); }
      });
      if (link || image) {
        sep();
        if (link) { add("Open link in new tab", () => open(link.href, "_blank", "noopener")); add("Copy link", () => writeClipboard(link.href)); }
        if (image) { add("Open image in new tab", () => open(image.src, "_blank", "noopener")); add("Copy image address", () => writeClipboard(image.src)); }
      }
      sep();
      add("Back", () => history.back(), history.length > 1);
      add("Forward", () => history.forward());
      add("Reload", () => location.reload());
      add("Copy page link", () => writeClipboard(location.href));
      if (navigator.mediaDevices?.getDisplayMedia) add("Screenshot…", captureScreenshot);
      menu.hidden = false;
      const rect = menu.getBoundingClientRect();
      menu.style.left = `${Math.max(8, Math.min(event.clientX, innerWidth - rect.width - 8))}px`;
      menu.style.top = `${Math.max(8, Math.min(event.clientY, innerHeight - rect.height - 8))}px`;
    }, true);
    document.addEventListener("pointerdown", (event) => { if (!menu.hidden && !menu.contains(event.target)) close(); }, true);
    addEventListener("blur", close); addEventListener("resize", close); addEventListener("scroll", close, true);
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
  };

  const virtualBars = new Map();
  let virtualRaf = 0;
  const scrollMetrics = (target) => target === document.scrollingElement
    ? { top: scrollY, size: innerHeight, total: target.scrollHeight }
    : { top: target.scrollTop, size: target.clientHeight, total: target.scrollHeight };
  const setScroll = (target, top) => target === document.scrollingElement ? scrollTo({ top }) : target.scrollTop = top;
  const updateVirtualBars = () => {
    virtualRaf = 0;
    for (const [target, bar] of virtualBars) {
      if (target !== document.scrollingElement && !target.isConnected) { bar.remove(); virtualBars.delete(target); continue; }
      const { top, size, total } = scrollMetrics(target);
      if (total <= size + 2) { bar.hidden = true; continue; }
      bar.hidden = false;
      let height, y, x, topPx;
      if (target === document.scrollingElement) { height = innerHeight - 8; x = innerWidth - 9; topPx = 4; }
      else {
        const r = target.getBoundingClientRect();
        height = Math.max(18, r.height - 4); x = r.right - 9; topPx = r.top + 2;
        if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) { bar.hidden = true; continue; }
      }
      bar.style.cssText = `height:${height}px;left:${x}px;top:${topPx}px`;
      const thumb = bar.firstElementChild;
      const thumbH = Math.max(24, height * size / total);
      y = (height - thumbH) * top / Math.max(1, total - size);
      thumb.style.height = `${thumbH}px`; thumb.style.transform = `translateY(${y}px)`;
    }
    updateVirtualXBars();
  };
  const scheduleVirtualBars = () => { if (!virtualRaf) virtualRaf = requestAnimationFrame(updateVirtualBars); };
  const addVirtualBar = (target) => {
    if (virtualBars.has(target)) return;
    const bar = runtimeNode(document.createElement("div")); bar.className = "samey-vscroll";
    const thumb = document.createElement("div"); thumb.className = "samey-vscroll-thumb"; thumb.dataset.grabCursor = ""; bar.append(thumb); document.body.append(bar);
    let startY = 0, startTop = 0;
    thumb.addEventListener("pointerdown", (event) => { event.preventDefault(); thumb.setPointerCapture(event.pointerId); startY = event.clientY; startTop = scrollMetrics(target).top; });
    thumb.addEventListener("pointermove", (event) => {
      if (!thumb.hasPointerCapture(event.pointerId)) return;
      const { size, total } = scrollMetrics(target); const track = bar.clientHeight, thumbH = thumb.clientHeight;
      setScroll(target, startTop + (event.clientY - startY) * Math.max(1, total - size) / Math.max(1, track - thumbH)); scheduleVirtualBars();
    });
    bar.addEventListener("pointerdown", (event) => {
      if (event.target === thumb) return;
      const { size, total } = scrollMetrics(target); const r = bar.getBoundingClientRect();
      setScroll(target, ((event.clientY - r.top) / r.height) * Math.max(0, total - size)); scheduleVirtualBars();
    });
    target.addEventListener?.("scroll", scheduleVirtualBars, { passive: true }); virtualBars.set(target, bar);
  };
  const virtualXBars = new Map();
  const addVirtualXBar = (target) => {
    if (virtualXBars.has(target)) return;
    const bar = runtimeNode(document.createElement("div")); bar.className = "samey-hscroll";
    const thumb = document.createElement("div"); thumb.className = "samey-hscroll-thumb"; thumb.dataset.grabCursor = ""; bar.append(thumb); document.body.append(bar);
    let startX = 0, startLeft = 0;
    thumb.addEventListener("pointerdown", (event) => { event.preventDefault(); thumb.setPointerCapture(event.pointerId); startX = event.clientX; startLeft = target.scrollLeft; });
    thumb.addEventListener("pointermove", (event) => {
      if (!thumb.hasPointerCapture(event.pointerId)) return;
      const size = target.clientWidth, total = target.scrollWidth, track = bar.clientWidth, thumbW = thumb.clientWidth;
      target.scrollLeft = startLeft + (event.clientX - startX) * Math.max(1, total - size) / Math.max(1, track - thumbW); scheduleVirtualBars();
    });
    bar.addEventListener("pointerdown", (event) => {
      if (event.target === thumb) return;
      const r = bar.getBoundingClientRect(); target.scrollLeft = ((event.clientX - r.left) / r.width) * Math.max(0, target.scrollWidth - target.clientWidth); scheduleVirtualBars();
    });
    target.addEventListener("scroll", scheduleVirtualBars, { passive: true }); virtualXBars.set(target, bar);
  };
  const updateVirtualXBars = () => {
    for (const [target, bar] of virtualXBars) {
      if (!target.isConnected) { bar.remove(); virtualXBars.delete(target); continue; }
      if (target.scrollWidth <= target.clientWidth + 2) { bar.hidden = true; continue; }
      const r = target.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) { bar.hidden = true; continue; }
      bar.hidden = false; const width = Math.max(18, r.width - 4); bar.style.cssText = `width:${width}px;left:${r.left + 2}px;top:${r.bottom - 9}px`;
      const thumb = bar.firstElementChild; const thumbW = Math.max(24, width * target.clientWidth / target.scrollWidth);
      const x = (width - thumbW) * target.scrollLeft / Math.max(1, target.scrollWidth - target.clientWidth); thumb.style.width = `${thumbW}px`; thumb.style.transform = `translateX(${x}px)`;
    }
  };
  const considerVirtualScroller = (el) => {
    if (!(el instanceof Element) || el.closest("[data-samey-runtime]")) return;
    const style = getComputedStyle(el);
    if ((style.overflowY === "auto" || style.overflowY === "scroll") && el.scrollHeight > el.clientHeight + 2) addVirtualBar(el);
    if ((style.overflowX === "auto" || style.overflowX === "scroll") && el.scrollWidth > el.clientWidth + 2) addVirtualXBar(el);
  };
  const scanVirtualScrollers = () => {
    addVirtualBar(document.scrollingElement);
    for (const el of document.querySelectorAll("body *:not([data-samey-runtime])")) considerVirtualScroller(el);
    scheduleVirtualBars();
  };
  const mountVirtualScrollbars = () => {
    scanVirtualScrollers();
    let scanRaf = 0;
    const pending = new Set();
    const scheduleTargets = (targets) => {
      for (const target of targets) if (target instanceof Element && !target.closest("[data-samey-runtime]")) pending.add(target);
      if (scanRaf) return;
      scanRaf = requestAnimationFrame(() => {
        scanRaf = 0;
        for (const target of pending) {
          considerVirtualScroller(target);
          for (const el of target.querySelectorAll?.("*:not([data-samey-runtime])") || []) considerVirtualScroller(el);
        }
        pending.clear();
        scheduleVirtualBars();
      });
    };
    // Discover only the part of the DOM that changed. Keybr mutates classes and
    // styles frequently; a whole-document rescan on each mutation is too expensive.
    new MutationObserver((records) => {
      const targets = [];
      for (const record of records) {
        targets.push(record.target);
        for (const node of record.addedNodes) targets.push(node instanceof Element ? node : node.parentElement);
      }
      scheduleTargets(targets);
      scheduleVirtualBars();
    }).observe(document.body, { subtree: true, childList: true });
    new ResizeObserver(() => { scheduleVirtualBars(); scheduleTargets([document.body]); }).observe(document.documentElement);
    addEventListener("resize", () => { scheduleVirtualBars(); scheduleTargets([document.body]); });
    addEventListener("scroll", scheduleVirtualBars, true);
  };

  const SPA_EXCLUDE = /\/(?:keybr|wordle)\.html$/;
  const pageStyleNodes = () => [...document.head.children].filter(el => (el.tagName === "STYLE" || (el.tagName === "LINK" && el.rel === "stylesheet")) && !el.dataset.sameyShared);
  const markInitialPageStyles = () => pageStyleNodes().forEach(el => el.dataset.spaPage = "");
  const syncHtmlData = (doc) => {
    for (const key of [...document.documentElement.attributes].map(a => a.name).filter(name => name.startsWith("data-") && !["data-site-theme","data-kb-theme","data-font","data-color"].includes(name))) document.documentElement.removeAttribute(key);
    for (const attr of doc.documentElement.attributes) if (attr.name.startsWith("data-")) document.documentElement.setAttribute(attr.name, attr.value);
  };
  const runBodyScripts = (baseUrl) => {
    for (const old of [...document.body.querySelectorAll("script")]) {
      const fresh = document.createElement("script");
      for (const attr of old.attributes) if (attr.name !== "src") fresh.setAttribute(attr.name, attr.value);
      if (old.src || old.getAttribute("src")) fresh.src = new URL(old.getAttribute("src"), baseUrl).href; else fresh.textContent = old.textContent;
      old.replaceWith(fresh);
    }
  };
  const loadPage = async (href, { replace = false } = {}) => {
    const url = new URL(href, location.href);
    if (url.origin !== location.origin || SPA_EXCLUDE.test(url.pathname)) { location.href = url.href; return; }
    try {
      const response = await fetch(url, { headers: { "X-Samey-SPA": "1" } }); if (!response.ok) throw new Error(String(response.status));
      const doc = new DOMParser().parseFromString(await response.text(), "text/html");
      document.querySelectorAll("head > [data-spa-page]").forEach(el => el.remove());
      for (const el of [...doc.head.children]) {
        if (el.tagName === "STYLE" || (el.tagName === "LINK" && el.rel === "stylesheet")) {
          const copy = el.cloneNode(true); copy.dataset.spaPage = "";
          if (copy.tagName === "LINK") copy.href = new URL(el.getAttribute("href"), url).href;
          document.head.append(copy);
        }
      }
      for (const child of [...document.body.children]) if (!child.hasAttribute("data-samey-runtime")) child.remove();
      for (const child of [...doc.body.children]) document.body.insertBefore(document.importNode(child, true), document.body.querySelector("[data-samey-runtime]"));
      document.title = doc.title; syncHtmlData(doc);
      (replace ? replaceState : pushState)({}, "", url.href);
      runBodyScripts(url); apply(); refreshNav(); scanVirtualScrollers(); scrollTo(0, 0);
      dispatchEvent(new CustomEvent("samey-pageload", { detail: { url: url.href } }));
    } catch { location.href = url.href; }
  };
  const mountSpa = () => {
    if (document.documentElement.dataset.spa === undefined) return;
    markInitialPageStyles();
    document.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const a = event.target.closest?.("a[href]"); if (!a || a.target || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href); if (url.origin !== location.origin || SPA_EXCLUDE.test(url.pathname) || url.hash && url.pathname === location.pathname) return;
      event.preventDefault(); loadPage(url.href);
    });
    addEventListener("popstate", () => loadPage(location.href, { replace: true }));
  };

  const sharedCss = document.createElement("link"); sharedCss.rel = "stylesheet"; sharedCss.href = new URL("site.css", SCRIPT_ROOT).href; sharedCss.dataset.sameyShared = ""; document.head.append(sharedCss);
  addEventListener("storage", (event) => { if (event.key === KEY || event.key === FONT_KEY) apply(); });
  matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    const raw = rawPrefs();
    if (!raw.color || raw.color === "system") apply();
  });
  window.SameyTheme = { apply, read };
  apply();
  const mountRuntime = () => { mountControls(); mountCursor(); mountContextMenu(); mountVirtualScrollbars(); mountSpa(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountRuntime, { once: true });
  else mountRuntime();
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register(new URL("sw.js", SCRIPT_ROOT).href).catch(() => {});
})();
