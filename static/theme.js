(() => {
  const SCRIPT_ROOT = new URL(".", document.currentScript?.src || location.href);
  const KEY = "keybr.theme";
  const WORDLE_KEY = "ui-theme";
  const FONT_KEY = "samey.font";
  const config = globalThis.SameyAppearanceConfig;
  if (config == null) throw new Error("Shared appearance config is not loaded");
  const colors = config.colors;
  const COLOR_IDS = [...Object.keys(colors), "custom"];
  const FONT_IDS = Object.keys(config.fonts);
  const colorLabels = { system: "System", ...Object.fromEntries(Object.entries(colors).map(([id, value]) => [id, value.label])) };
  const fontLabels = Object.fromEntries(Object.entries(config.fonts).map(([id, value]) => [id, value.label]));
  const fontStacks = Object.fromEntries(Object.entries(config.fonts).map(([id, value]) => [id, value.stack]));

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
  const migrateColor = (value) => {
    if (value === "light-contrast") return "clear-light";
    if (value === "dark-contrast") return "clear-dark";
    if (value === "chocolate") return "dark";
    if (["gray", "yellow", "garden", "coffee", "honey"].includes(value)) return "light";
    return value === "system" || COLOR_IDS.includes(value) ? value : "system";
  };
  const read = () => {
    const raw = rawPrefs();
    const selected = migrateColor(raw.color);
    let color = selected;
    if (color === "system") color = matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const font = readFont();
    if (color !== "custom") return { color, selected: selected || "system", font, ...colors[color], custom: { ...colors[color] } };
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
      slow: validHex(custom.slow) ? custom.slow.toLowerCase() : fallback.slow,
      fast: validHex(custom.fast) ? custom.fast.toLowerCase() : fallback.fast,
      effort: validHex(custom.effort) ? custom.effort.toLowerCase() : fallback.effort,
      custom: {
        tone: custom.tone === "dark" ? "dark" : "light",
        background: validHex(custom.background) ? custom.background.toLowerCase() : fallback.background,
        text: validHex(custom.text) ? custom.text.toLowerCase() : fallback.text,
        accent: validHex(custom.accent) ? custom.accent.toLowerCase() : fallback.accent,
        error: validHex(custom.error) ? custom.error.toLowerCase() : fallback.error,
        slow: validHex(custom.slow) ? custom.slow.toLowerCase() : fallback.slow,
        fast: validHex(custom.fast) ? custom.fast.toLowerCase() : fallback.fast,
        effort: validHex(custom.effort) ? custom.effort.toLowerCase() : fallback.effort,
      },
    };
  };

  const keybrCustomProperties = (theme) => {
    const dark = theme.tone === "dark";
    const primary = theme.background, secondary = theme.text, accent = theme.accent, error = theme.error;
    const chartMix = dark ? .5 : 0;
    return {
      "--primary-d2": mix(primary, dark ? "#ffffff" : "#000000", .1),
      "--primary-d1": mix(primary, dark ? "#ffffff" : "#000000", .05),
      "--primary": primary,
      "--primary-l1": mix(primary, dark ? "#000000" : "#ffffff", dark ? .02 : .03),
      "--primary-l2": mix(primary, dark ? "#000000" : "#ffffff", dark ? .03 : .05),
      "--secondary-d1": mix(secondary, dark ? "#ffffff" : "#000000", .1),
      "--secondary": secondary,
      "--secondary-l1": mix(secondary, dark ? "#000000" : "#ffffff", .1),
      "--secondary-l2": mix(secondary, dark ? "#000000" : "#ffffff", .2),
      "--secondary-f1": mix(secondary, primary, .2),
      "--secondary-f2": mix(secondary, primary, .4),
      "--accent-d2": mix(accent, "#000000", dark ? .1 : .2),
      "--accent-d1": mix(accent, "#000000", dark ? .05 : .1),
      "--accent": accent,
      "--accent-l1": mix(accent, "#ffffff", dark ? .05 : .1),
      "--accent-l2": mix(accent, "#ffffff", dark ? .1 : .2),
      "--error-d1": mix(error, dark ? "#ffffff" : "#000000", .1),
      "--error": error,
      "--error-l1": mix(error, dark ? "#000000" : "#ffffff", .1),
      "--shadow-color": dark ? "#00000088" : "#00000044",
      "--slow-key-color": theme.slow,
      "--fast-key-color": theme.fast,
      "--effort-color": theme.effort,
      "--textinput__color": secondary,
      "--textinput--special__color": mix(secondary, primary, .5),
      "--textinput--hit__color": mix(secondary, primary, .4),
      "--textinput--miss__color": error,
      "--Name-color": mix(secondary, "#ffffff", .2),
      "--Value-color": mix(secondary, "#000000", .1),
      "--Value--more__color": "#2a7e21",
      "--Value--less__color": "#a1464e",
      "--Chart-speed__color": mix("#6fb48c", primary, chartMix),
      "--Chart-accuracy__color": mix("#ef522f", primary, chartMix),
      "--Chart-complexity__color": mix("#ac71d0", primary, chartMix),
      "--Chart-threshold__color": mix("#d2649a", primary, chartMix),
      "--Chart-hist-h__color": mix("#5f6cb4", primary, chartMix),
      "--Chart-hist-m__color": mix("#b43f3e", primary, chartMix),
      "--Chart-hist-r__color": mix("#b140b4", primary, chartMix),
      "--KeyboardKey-pointer__color": "#4ba0f2",
      "--pinky-zone-color": mix("#8ec07c", primary, chartMix),
      "--ring-zone-color": mix("#b8bb26", primary, chartMix),
      "--middle-zone-color": mix("#fabd2f", primary, chartMix),
      "--left-index-zone-color": mix("#83a698", primary, chartMix),
      "--right-index-zone-color": mix("#d3869b", primary, chartMix),
      "--thumb-zone-color": mix("#d66354", primary, chartMix),
      "--syntax-keyword": dark ? "#5991cd" : "#56a1f4",
      "--syntax-string": "#72b172",
      "--syntax-number": dark ? "#b281d3" : "#763a9e",
      "--syntax-comment": "#9f8484",
    };
  };
  const KEYBR_CUSTOM_PROPERTIES = Object.keys(keybrCustomProperties(colors.light));

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
    root.dataset.color = theme.color;
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

    if (root.dataset.siteKind === "keybr") {
      for (const name of KEYBR_CUSTOM_PROPERTIES) root.style.removeProperty(name);
      if (theme.color === "custom") {
        for (const [name, value] of Object.entries(keybrCustomProperties(theme))) root.style.setProperty(name, value);
      }
    }

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
  const appearance = Object.freeze({
    get: read,
    set: setPrefs,
    apply,
    themeIds: Object.freeze(["system", ...COLOR_IDS]),
    fontIds: Object.freeze([...FONT_IDS]),
  });
  Object.defineProperty(globalThis, "SameyAppearance", { value: appearance, configurable: false, writable: false });

  const section = (title, items, attr) => `<div class="samey-panel-title">${title}</div>${Object.entries(items).map(([value, label]) => `<button type="button" ${attr}="${value}">${label}</button>`).join("")}`;
  const mountControls = () => {
    if (document.getElementById("samey-site-controls")) return;
    const host = document.createElement("div");
    host.id = "samey-site-controls";
    host.className = "samey-site-controls";
    host.dataset.sameyRuntime = "";
    const nav = navTarget();
    if (nav) host.insertAdjacentHTML("beforeend", `<a class="samey-icon samey-nav" href="${nav.href}" aria-label="${nav.label}" title="${nav.label}" data-copy-label="${nav.label}">${icon(nav.icon)}</a>`);

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
    el.dataset.copyLabel = target.label;
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

  const normalizeExternalLinks = (root = document) => {
    for (const link of root.querySelectorAll?.('a[href]') || []) {
      let url;
      try { url = new URL(link.href, location.href); } catch { continue; }
      if (url.hostname === "github.com" || url.hostname.endsWith(".github.com")) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
    }
  };
  const observeExternalLinks = () => new MutationObserver((records) => {
    for (const record of records) for (const node of record.addedNodes) {
      if (!(node instanceof Element)) continue;
      if (node.matches?.("a[href]")) normalizeExternalLinks(node.parentElement || document);
      else normalizeExternalLinks(node);
    }
  }).observe(document.documentElement, { subtree: true, childList: true });

  let loadingSvgCache = "";
  const loadingCursorSvg = () => {
    if (loadingSvgCache) return loadingSvgCache;
    const cx = 200, cy = 200, baseRadius = 140, amplitude = 20, waves = 6;
    const duration = 1.45, zeroCrossingPower = .8, points = 320, frames = 61;
    const paths = [], keyTimes = [];
    for (let f = 0; f < frames; f++) {
      const progress = f / (frames - 1);
      const raw = Math.cos(progress * Math.PI * 2);
      const multiplier = Math.sign(raw) * Math.pow(Math.abs(raw), zeroCrossingPower);
      let d = "";
      for (let i = 0; i <= points; i++) {
        const angle = i / points * Math.PI * 2;
        const radius = baseRadius + amplitude * multiplier * Math.sin(waves * angle);
        const x = cx + radius * Math.cos(angle), y = cy + radius * Math.sin(angle);
        d += `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
      }
      paths.push(d + "Z"); keyTimes.push(progress.toFixed(6));
    }
    loadingSvgCache = `<svg class="samey-cursor-loading" viewBox="0 0 400 400" width="64" height="64" aria-hidden="true"><path fill="currentColor" d="${paths[0]}"><animate attributeName="d" dur="${duration}s" repeatCount="indefinite" calcMode="linear" keyTimes="${keyTimes.join(";")}" values="${paths.join(";")}"/></path></svg>`;
    return loadingSvgCache;
  };

  const mountLoadingLayer = () => {
    if (document.getElementById("samey-loading-layer")) return;
    const layer = runtimeNode(document.createElement("div"));
    layer.id = "samey-loading-layer";
    layer.className = "samey-loading-layer";
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML = `<div class="samey-loading-card">${loadingCursorSvg()}<span>loading</span><i></i></div>`;
    document.body.append(layer);
  };

  const mountCursor = () => {
    if (!matchMedia?.("(pointer:fine)").matches || document.getElementById("samey-cursor")) return;
    const cursor = runtimeNode(document.createElement("div"));
    cursor.id = "samey-cursor";
    cursor.className = "samey-cursor";
    cursor.innerHTML = `<span class="samey-cursor-dot"></span><svg class="samey-cursor-grab" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><mask id="samey-grab-mask" x="0" y="0" width="64" height="64" maskUnits="userSpaceOnUse" style="mask-type:luminance"><circle cx="32" cy="32" r="8.4" fill="white"/><rect x="30.2" y="22.4" width="3.6" height="19.2" fill="black"/><rect x="22.4" y="30.2" width="19.2" height="3.6" fill="black"/></mask><circle cx="32" cy="32" r="8.4" fill="currentColor" mask="url(#samey-grab-mask)"/><circle cx="32" cy="32" r="4.8" fill="currentColor"><animate class="samey-cursor-grab-pulse" attributeName="r" values="8.4;4.8" dur=".18s" repeatCount="1" calcMode="linear" begin="indefinite" fill="remove"/></circle></svg><svg class="samey-cursor-link" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><g transform="translate(23.6 23.6) scale(.2)"><path d="M42 0 H84 V42 A42 42 0 1 1 42 0 Z" fill="currentColor"/><path class="samey-cursor-link-corner" d="M47.5 5.5 H78.5 V36.5" fill="none" stroke="currentColor" stroke-width="11" stroke-linecap="square" stroke-linejoin="miter"><animateTransform class="samey-cursor-link-click" attributeName="transform" type="translate" values="0 0;26 -26" dur=".18s" repeatCount="1" calcMode="linear" begin="indefinite" fill="remove"/><animate class="samey-cursor-link-fade" attributeName="opacity" values="1;0" dur=".18s" repeatCount="1" calcMode="linear" begin="indefinite" fill="remove"/></path></g></svg>${loadingCursorSvg()}`;
    document.documentElement.classList.add("samey-custom-cursor");
    document.body.append(cursor);
    const setLoading = (loading) => {
      cursor.toggleAttribute("data-loading", !!loading);
      if (loading) { cursor.removeAttribute("data-link"); cursor.removeAttribute("data-grab"); cursor.dataset.visible = ""; }
      document.documentElement.toggleAttribute("data-site-loading", !!loading);
    };
    addEventListener("samey-loading", event => setLoading(!!event.detail));
    globalThis.SameyLoading = setLoading;

    const grabSelector = ".samey-vscroll-thumb,.samey-hscroll-thumb,input[type=range],[draggable=true],[data-grab-cursor]";
    const pressedGrabSelector = `${grabSelector},[data-grab-cursor-on-drag]`;
    const wantsGrab = (target) => {
      if (!(target instanceof Element)) return false;
      if (target.closest(grabSelector)) return true;
      const value = getComputedStyle(target).cursor;
      return value === "grab" || value === "grabbing" || value === "ew-resize" || value === "ns-resize" || value === "col-resize" || value === "row-resize";
    };
    const linkTarget = (target) => target instanceof Element ? target.closest("a[href],area[href],[role=link]") : null;
    const elementAt = (event) => {
      if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return event.target instanceof Element ? event.target : null;
      return document.elementFromPoint(event.clientX, event.clientY) || (event.target instanceof Element ? event.target : null);
    };
    const linkClick = cursor.querySelector(".samey-cursor-link-click");
    const linkFade = cursor.querySelector(".samey-cursor-link-fade");
    const grabPulse = cursor.querySelector(".samey-cursor-grab-pulse");
    const setGrabState = (grab) => {
      const wasGrab = cursor.hasAttribute("data-grab");
      cursor.toggleAttribute("data-grab", grab);
      if (grab && !wasGrab && !matchMedia?.("(prefers-reduced-motion: reduce)").matches && typeof grabPulse?.beginElement === "function") grabPulse.beginElement();
    };
    const animateLinkClick = () => {
      if (matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
      if (typeof linkClick?.beginElement === "function") linkClick.beginElement();
      if (typeof linkFade?.beginElement === "function") linkFade.beginElement();
    };
    const holdLinkCursor = (event, link) => {
      if (!link) return;
      linkHandoffUntil = performance.now() + 240;
      if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) placeXY(event.clientX, event.clientY);
      setGrabState(false);
      cursor.removeAttribute("data-grab");
      cursor.dataset.link = "";
      cursor.dataset.visible = "";
    };

    let nativeDragging = false;
    let selectionDragging = false;
    let selectionDragCandidate = false;
    let selectionDragText = "";
    let selectionStartX = 0, selectionStartY = 0;
    let pressedGrab = false;
    let pressedPointerId = null;
    let lastX = 0, lastY = 0;
    let pendingX = 0, pendingY = 0;
    let cursorFrame = 0;
    let linkHandoffUntil = 0;
    let modifiedLinkPending = null;
    let suppressModifiedClick = null;
    const renderCursorPosition = () => {
      cursorFrame = 0;
      lastX = pendingX; lastY = pendingY;
      cursor.style.transform = `translate3d(${pendingX - 32}px,${pendingY - 32}px,0)`;
      cursor.dataset.visible = "";
    };
    const placeXY = (x, y, immediate = false) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      pendingX = x; pendingY = y;
      if (immediate) { if (cursorFrame) cancelAnimationFrame(cursorFrame); renderCursorPosition(); }
      else if (!cursorFrame) cursorFrame = requestAnimationFrame(renderCursorPosition);
    };
    const place = (event, immediate = false) => placeXY(event.clientX, event.clientY, immediate);
    const unshiftCursor = (grab) => {
      if (matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
      const visual = grab ? cursor.querySelector(".samey-cursor-grab") : cursor.querySelector(".samey-cursor-dot");
      visual?.animate?.(
        [{ transform: "translate(-8.4px,8.4px)" }, { transform: "translate(0,0)" }],
        { duration: 65, easing: "cubic-bezier(.2,.8,.2,1)" },
      );
    };
    const setMode = (target) => {
      const wasLink = cursor.hasAttribute("data-link") && !cursor.hasAttribute("data-grab");
      const grab = selectionDragging || nativeDragging || pressedGrab || wantsGrab(target);
      const link = !grab && !!linkTarget(target);
      setGrabState(grab);
      cursor.toggleAttribute("data-link", link);
      if (wasLink && !link) unshiftCursor(grab);
    };
    const refreshAt = (event) => {
      if (nativeDragging) { delete cursor.dataset.visible; return; }
      if (selectionDragCandidate && (event.buttons & 1)) {
        const dx = event.clientX - selectionStartX, dy = event.clientY - selectionStartY;
        if (!selectionDragging && dx * dx + dy * dy >= 9) {
          selectionDragging = true;
          pressedGrab = true;
        }
      }
      place(event);
      setMode(elementAt(event));
    };



    document.addEventListener("pointermove", refreshAt, { capture: true, passive: true });
    document.addEventListener("pointerover", refreshAt, { capture: true, passive: true });
    const selectionAtPoint = (x, y, target) => {
      if (!(target instanceof Element) || target.closest('a[href],area[href],img,[draggable="true"],[data-grab-cursor]')) return false;
      const selection = getSelection();
      if (!selection || selection.isCollapsed || !selection.toString()) return false;
      for (let i = 0; i < selection.rangeCount; i++) {
        for (const rect of selection.getRangeAt(i).getClientRects()) {
          if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return true;
        }
      }
      return false;
    };
    const collapseSelectionAt = (x, y) => {
      const selection = getSelection();
      if (!selection) return;
      const pos = document.caretPositionFromPoint?.(x, y);
      if (pos) { selection.collapse(pos.offsetNode, pos.offset); return; }
      const range = document.caretRangeFromPoint?.(x, y);
      if (range) { selection.removeAllRanges(); selection.addRange(range); }
    };
    document.addEventListener("pointerdown", (event) => {
      document.documentElement.style.setProperty("--samey-dialog-origin-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--samey-dialog-origin-y", `${event.clientY}px`);
      const actual = elementAt(event);
      pressedPointerId = event.pointerId;
      selectionDragCandidate = event.button === 0 && selectionAtPoint(event.clientX, event.clientY, actual);
      if (selectionDragCandidate) {
        event.preventDefault();
        selectionDragText = getSelection()?.toString() || "";
        selectionStartX = event.clientX; selectionStartY = event.clientY;
      }
      pressedGrab = !!actual?.closest?.(pressedGrabSelector);
      place(event, true);
      setMode(actual);
      const pressedLink = linkTarget(actual);
      if (pressedLink && (event.ctrlKey || event.metaKey || event.button === 1)) {
        event.preventDefault();
        modifiedLinkPending = pressedLink;
        suppressModifiedClick = pressedLink;
        holdLinkCursor(event, pressedLink);
        animateLinkClick();
      }
    }, true);
    document.addEventListener("mousedown", (event) => {
      if (selectionDragCandidate || selectionAtPoint(event.clientX, event.clientY, elementAt(event))) event.preventDefault();
    }, true);
    const editableAt = (target) => {
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return target;
      return target instanceof Element ? target.closest('[contenteditable="true"],[contenteditable="plaintext-only"]') : null;
    };
    const dropSelectionText = (target) => {
      const editable = editableAt(target);
      if (!editable || !selectionDragText) return;
      if (editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement) {
        const start = editable.selectionStart ?? editable.value.length;
        const end = editable.selectionEnd ?? start;
        editable.setRangeText(selectionDragText, start, end, "end");
        editable.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertFromDrop", data: selectionDragText }));
      } else {
        editable.focus();
        document.execCommand("insertText", false, selectionDragText);
      }
    };
    document.addEventListener("pointerup", (event) => {
      if (selectionDragging) dropSelectionText(elementAt(event));
      else if (selectionDragCandidate) collapseSelectionAt(event.clientX, event.clientY);
      selectionDragging = false;
      selectionDragCandidate = false;
      selectionDragText = "";
      if (pressedPointerId === event.pointerId) { pressedPointerId = null; pressedGrab = false; }
      if (modifiedLinkPending instanceof HTMLAnchorElement && modifiedLinkPending.href) {
        const link = modifiedLinkPending;
        modifiedLinkPending = null;
        holdLinkCursor(event, link);
        window.open(link.href, "_blank", "noopener,noreferrer");
      }
      place(event, true);
      setMode(elementAt(event));
    }, true);
    document.addEventListener("click", (event) => {
      const link = event.button === 0 ? linkTarget(event.target) : null;
      if (!link) return;
      if (suppressModifiedClick === link) {
        event.preventDefault();
        suppressModifiedClick = null;
        return;
      }
      holdLinkCursor(event, link);
      animateLinkClick();
    }, true);
    document.addEventListener("auxclick", (event) => {
      const link = event.button === 1 ? linkTarget(event.target) : null;
      if (!link) return;
      if (suppressModifiedClick === link) {
        event.preventDefault();
        suppressModifiedClick = null;
        return;
      }
      event.preventDefault();
      holdLinkCursor(event, link);
      animateLinkClick();
      if (link instanceof HTMLAnchorElement && link.href) window.open(link.href, "_blank", "noopener,noreferrer");
    }, true);
    const isPlainSelectionDrag = (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || target.closest('a[href],area[href],img,[draggable="true"],[data-grab-cursor]')) return false;
      const selection = getSelection();
      return !!selection && !selection.isCollapsed && !!selection.toString();
    };
    const startNativeDrag = (event, allowSelectionEmulation = false) => {
      if (allowSelectionEmulation && isPlainSelectionDrag(event)) {
        event.preventDefault();
        nativeDragging = false;
        selectionDragCandidate = false;
        selectionDragging = true;
        selectionDragText = getSelection()?.toString() || "";
        pressedGrab = true;
        cursor.removeAttribute("data-link");
        setGrabState(true);
        placeXY(lastX, lastY);
        return;
      }
      nativeDragging = true;
      selectionDragging = false;
      selectionDragCandidate = false;
      selectionDragText = "";
      pressedGrab = false;
      pressedPointerId = null;
      setGrabState(false);
      cursor.removeAttribute("data-link");
      delete cursor.dataset.visible;
    };
    document.addEventListener("dragstart", (event) => startNativeDrag(event, true), true);
    document.addEventListener("dragenter", (event) => { if (!selectionDragging) startNativeDrag(event); }, true);
    document.addEventListener("dragover", (event) => { if (!nativeDragging && !selectionDragging) startNativeDrag(event); }, true);
    const stopDragging = (event) => {
      nativeDragging = false;
      selectionDragging = false;
      selectionDragCandidate = false;
      selectionDragText = "";
      pressedGrab = false;
      pressedPointerId = null;
      modifiedLinkPending = null;
      if (event && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) { place(event); setMode(elementAt(event)); }
      else { setGrabState(false); cursor.removeAttribute("data-link"); }
    };
    document.addEventListener("dragend", stopDragging, true);
    document.addEventListener("drop", stopDragging, true);
    addEventListener("pointercancel", stopDragging, true);
    addEventListener("blur", stopDragging);
    addEventListener("pointerout", (event) => { if (!event.relatedTarget && !nativeDragging && performance.now() >= linkHandoffUntil) delete cursor.dataset.visible; });
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
  const linkCopyText = (link) => {
    if (!(link instanceof HTMLAnchorElement)) return "";
    const explicit = link.dataset.copyLabel?.trim();
    if (explicit) return explicit;
    const labelled = link.getAttribute("aria-label")?.trim() || link.title?.trim();
    if (labelled) return labelled.replace(/^(Open|Go to|Visit)\s+/i, "").replace(/\s+(source repository)$/i, " source");
    const named = link.querySelector(".project-name,.oss-name,.blog-name,.brand")?.textContent?.trim();
    if (named) return named;
    try {
      const url = new URL(link.href, location.href);
      const part = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || url.hostname.replace(/^www\./, ""));
      return part.replace(/\.html?$/i, "").replace(/[-_]+/g, " ") || url.hostname;
    } catch { return "Link"; }
  };
  const stampLinkCopyLabels = (root = document) => {
    const links = root instanceof HTMLAnchorElement ? [root] : root.querySelectorAll?.("a[href]") || [];
    for (const link of links) if (!link.dataset.copyLabel) link.dataset.copyLabel = linkCopyText(link);
  };
  stampLinkCopyLabels();
  new MutationObserver((records) => {
    for (const record of records) for (const node of record.addedNodes) if (node instanceof Element) stampLinkCopyLabels(node);
  }).observe(document.documentElement, { childList: true, subtree: true });

  const mountContextMenu = () => {
    if (document.getElementById("samey-context-menu")) return;
    const menu = runtimeNode(document.createElement("div"));
    menu.id = "samey-context-menu"; menu.className = "samey-context-menu"; menu.hidden = true;
    document.body.append(menu);
    let target = null;
    const close = () => { menu.hidden = true; menu.replaceChildren(); };
    const add = (label, action, enabled = true, hint = "") => {
      const button = document.createElement("button"); button.type = "button"; button.disabled = !enabled;
      const text = document.createElement("span"); text.textContent = label; button.append(text);
      if (hint) { const key = document.createElement("kbd"); key.textContent = hint; button.append(key); }
      button.addEventListener("click", async () => { close(); try { await action(); } catch {} }); menu.append(button);
    };
    const sep = () => { const hr = document.createElement("hr"); menu.append(hr); };
    document.addEventListener("contextmenu", (event) => {
      if (event.shiftKey) return;
      event.preventDefault(); target = event.target; menu.replaceChildren();
      const link = target instanceof Element ? target.closest("a[href]") : null;
      const image = target instanceof Element ? target.closest("img[src]") : null;
      const selection = selectedText();
      const editable = editableTarget(target);
      if (selection) add("Copy", () => writeClipboard(selection), true, navigator.platform?.includes("Mac") ? "⌘C" : "Ctrl+C");
      if (editable && selection) add("Cut", async () => { await writeClipboard(selection); document.execCommand("delete"); }, true, navigator.platform?.includes("Mac") ? "⌘X" : "Ctrl+X");
      if (editable) add("Paste", async () => pasteInto(editable, await navigator.clipboard.readText()), !!navigator.clipboard?.readText, navigator.platform?.includes("Mac") ? "⌘V" : "Ctrl+V");
      add("Select all", () => {
        if (editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement) { editable.focus(); editable.select(); }
        else if (editable) { const range = document.createRange(); range.selectNodeContents(editable); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range); }
        else { const range = document.createRange(); range.selectNodeContents(document.body); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range); }
      }, true, navigator.platform?.includes("Mac") ? "⌘A" : "Ctrl+A");
      if (selection && !editable) {
        sep();
        add("Search web for selection", () => open(`https://www.google.com/search?q=${encodeURIComponent(selection)}`, "_blank", "noopener"));
      }
      if (link || image) {
        sep();
        if (link) {
          add("Open link in new tab", () => open(link.href, "_blank", "noopener"));
          add("Copy link", () => writeClipboard(link.href));
          add("Copy Markdown link", () => writeClipboard(`[${linkCopyText(link)}](${link.href})`));
        }
        if (image) {
          add("Open image in new tab", () => open(image.src, "_blank", "noopener"));
          add("Copy image address", () => writeClipboard(image.src));
          add("Save image", () => { const a = document.createElement("a"); a.href = image.src; a.download = image.alt || "image"; a.click(); });
        }
      }
      sep();
      add("Back", () => history.back(), history.length > 1);
      add("Forward", () => history.forward());
      add("Reload", () => location.reload(), true, navigator.platform?.includes("Mac") ? "⌘R" : "Ctrl+R");
      add("Copy page link", () => writeClipboard(location.href));
      add("Copy page title", () => writeClipboard(document.title));
      add("Print…", () => print(), true, navigator.platform?.includes("Mac") ? "⌘P" : "Ctrl+P");
      if (document.fullscreenEnabled) add(document.fullscreenElement ? "Exit fullscreen" : "Fullscreen", () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
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
  const virtualScrollerEligible = (target) => {
    if (target === document.scrollingElement) return true;
    if (!(target instanceof Element) || !target.isConnected || target.closest("[data-samey-runtime]")) return false;
    const style = getComputedStyle(target);
    if (style.display === "none" || style.visibility === "hidden" || Number.parseFloat(style.opacity || "1") <= 0.001) return false;
    const r = target.getBoundingClientRect();
    // Hidden focus/IME controls (notably Keybr's 1px TextEvents textarea) can
    // report scroll overflow. They are not user-scrollable and must never get bars.
    if (r.width < 8 || r.height < 8 || style.pointerEvents === "none") return false;
    return true;
  };
  const updateVirtualBars = () => {
    virtualRaf = 0;
    for (const [target, bar] of virtualBars) {
      if (!virtualScrollerEligible(target)) { bar.remove(); virtualBars.delete(target); continue; }
      const { top, size, total } = scrollMetrics(target);
      if (total <= size + 2) { bar.hidden = true; continue; }
      bar.hidden = false;
      let height, y, x, topPx;
      if (target === document.scrollingElement) { height = innerHeight; x = innerWidth - 7; topPx = 0; }
      else {
        const r = target.getBoundingClientRect();
        height = Math.max(18, r.height); x = r.right - 7; topPx = r.top;
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
      if (!virtualScrollerEligible(target)) { bar.remove(); virtualXBars.delete(target); continue; }
      if (target.scrollWidth <= target.clientWidth + 2) { bar.hidden = true; continue; }
      const r = target.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) { bar.hidden = true; continue; }
      bar.hidden = false; const width = Math.max(18, r.width); bar.style.cssText = `width:${width}px;left:${r.left}px;top:${r.bottom - 7}px`;
      const thumb = bar.firstElementChild; const thumbW = Math.max(24, width * target.clientWidth / target.scrollWidth);
      const x = (width - thumbW) * target.scrollLeft / Math.max(1, target.scrollWidth - target.clientWidth); thumb.style.width = `${thumbW}px`; thumb.style.transform = `translateX(${x}px)`;
    }
  };
  const considerVirtualScroller = (el) => {
    if (!virtualScrollerEligible(el)) return;
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

  const APP_ROUTE = /\/(?:keybr|wordle|chain)(?:\.html)?\/?$/;
  const pageStyleNodes = () => [...document.head.children].filter(el => (el.tagName === "STYLE" || (el.tagName === "LINK" && el.rel === "stylesheet")) && !el.hasAttribute("data-samey-shared"));
  const markInitialPageStyles = () => pageStyleNodes().forEach(el => el.dataset.spaPage = "");
  const pageCache = new Map();
  const reducedMotion = () => matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const setLoading = value => {
    const on = !!value;
    document.documentElement.toggleAttribute("data-site-loading", on);
    document.getElementById("samey-loading-layer")?.toggleAttribute("data-visible", on);
    dispatchEvent(new CustomEvent("samey-loading", { detail: on }));
  };
  const syncHtmlData = (doc, baseUrl) => {
    const keep = new Set(["data-site-theme","data-kb-theme","data-font","data-color"]);
    for (const attr of [...document.documentElement.attributes]) if (attr.name.startsWith("data-") && !keep.has(attr.name)) document.documentElement.removeAttribute(attr.name);
    for (const attr of doc.documentElement.attributes) if (attr.name.startsWith("data-")) {
      let value = attr.value;
      if ((attr.name === "data-home-href" || attr.name === "data-back-href") && value) value = new URL(value, baseUrl).href;
      document.documentElement.setAttribute(attr.name, value);
    }
  };
  const fetchPage = async url => {
    const key = url.href;
    if (pageCache.has(key)) return pageCache.get(key);
    const task = (async () => {
      let response = await fetch(url, { headers: { "X-Samey-SPA": "1" } });
      if (!response.ok && !/\.[a-z0-9]+$/i.test(url.pathname) && !url.pathname.endsWith("/")) {
        response = await fetch(new URL(url.pathname + ".html" + url.search + url.hash, url.origin), { headers: { "X-Samey-SPA": "1" } });
      }
      if (!response.ok) throw new Error(String(response.status));
      const text = await response.text();
      const doc = new DOMParser().parseFromString(text, "text/html");
      const baseTag = doc.querySelector("base[href]")?.getAttribute("href");
      const baseUrl = new URL(baseTag || ".", response.url || url.href);
      return { doc, baseUrl, responseUrl: response.url || url.href };
    })();
    pageCache.set(key, task);
    try { return await task; } catch (error) { pageCache.delete(key); throw error; }
  };
  const normalizePageUrls = (doc, baseUrl) => {
    for (const el of doc.querySelectorAll("[href]")) {
      const value = el.getAttribute("href");
      if (!value || value.startsWith("#") || /^(?:mailto:|tel:|javascript:|data:)/i.test(value)) continue;
      try { el.setAttribute("href", new URL(value, baseUrl).href); } catch {}
    }
    for (const el of doc.querySelectorAll("[src]")) {
      const value = el.getAttribute("src"); if (!value || /^(?:data:|blob:)/i.test(value)) continue;
      try { el.setAttribute("src", new URL(value, baseUrl).href); } catch {}
    }
  };
  const runBodyScripts = (baseUrl) => {
    for (const old of [...document.body.querySelectorAll("script")]) {
      const fresh = document.createElement("script");
      for (const attr of old.attributes) if (attr.name !== "src") fresh.setAttribute(attr.name, attr.value);
      if (old.src || old.getAttribute("src")) fresh.src = new URL(old.getAttribute("src"), baseUrl).href; else fresh.textContent = old.textContent;
      old.replaceWith(fresh);
    }
  };
  const swapPage = (doc, baseUrl, url, replace) => {
    try { globalThis.SameyToolsDispose?.(); delete globalThis.SameyToolsDispose; } catch {}
    dispatchEvent(new Event("samey-pageleave"));
    normalizePageUrls(doc, baseUrl);
    document.querySelectorAll("head > [data-spa-page]").forEach(el => el.remove());
    for (const el of [...doc.head.children]) {
      if (el.tagName === "STYLE" || (el.tagName === "LINK" && el.rel === "stylesheet")) {
        const copy = el.cloneNode(true); copy.dataset.spaPage = "";
        if (copy.tagName === "LINK") copy.href = new URL(el.getAttribute("href"), baseUrl).href;
        document.head.append(copy);
      }
    }
    const runtimeAnchor = document.body.querySelector("[data-samey-runtime]");
    for (const child of [...document.body.children]) if (!child.hasAttribute("data-samey-runtime")) child.remove();
    for (const child of [...doc.body.children]) document.body.insertBefore(document.importNode(child, true), runtimeAnchor);
    document.title = doc.title; syncHtmlData(doc, baseUrl);
    (replace ? replaceState : pushState)({}, "", url.href);
    runBodyScripts(baseUrl); apply(); refreshNav(); scanVirtualScrollers();
    if (!url.hash) scrollTo({ top: 0, left: 0, behavior: "instant" });
    else queueMicrotask(() => document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView());
    dispatchEvent(new CustomEvent("samey-pageload", { detail: { url: url.href } }));
  };
  const loadPage = async (href, { replace = false } = {}) => {
    const url = new URL(href, location.href);
    if (url.origin !== location.origin || APP_ROUTE.test(url.pathname)) { location.href = url.href; return; }
    setLoading(true);
    try {
      const { doc, baseUrl } = await fetchPage(url);
      const commit = () => swapPage(doc, baseUrl, url, replace);
      if (document.startViewTransition && !reducedMotion()) {
        document.documentElement.dataset.navDirection = url.pathname === "/" || /\/index(?:\.html)?$/.test(url.pathname) ? "home" : "forward";
        const transition = document.startViewTransition(commit);
        await transition.finished.catch(() => {});
        delete document.documentElement.dataset.navDirection;
      } else commit();
    } catch { location.href = url.href; return; }
    finally { setLoading(false); }
  };
  const shouldSpa = url => url.origin === location.origin && !APP_ROUTE.test(url.pathname);
  const prefetch = href => { const url = new URL(href, location.href); if (shouldSpa(url)) fetchPage(url).catch(() => {}); };
  const mountSpa = () => {
    if (document.documentElement.dataset.spa === undefined) return;
    markInitialPageStyles();
    globalThis.SameyNavigate = (href, opts) => loadPage(href, opts);
    document.addEventListener("pointerover", event => { const a = event.target.closest?.("a[href]"); if (a && !a.target) prefetch(a.href); }, { passive: true });
    document.addEventListener("focusin", event => { const a = event.target.closest?.("a[href]"); if (a && !a.target) prefetch(a.href); });
    document.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const a = event.target.closest?.("a[href]"); if (!a || a.target || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href); if (!shouldSpa(url) || url.hash && url.pathname === location.pathname) return;
      event.preventDefault(); loadPage(url.href);
    });
    addEventListener("popstate", () => {
      if (document.documentElement.dataset.siteKind === "tools" && /\/tools(?:\.html)?\/?$/.test(location.pathname)) return;
      loadPage(location.href, { replace: true });
    });
  };

  const sharedCss = document.createElement("link"); sharedCss.rel = "stylesheet"; sharedCss.href = new URL("site.css", SCRIPT_ROOT).href; sharedCss.dataset.sameyShared = ""; document.head.append(sharedCss);
  addEventListener("storage", (event) => { if (event.key === KEY || event.key === FONT_KEY) apply(); });
  matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    const raw = rawPrefs();
    if (!raw.color || raw.color === "system") apply();
  });
  apply();
  const mountRuntime = () => { normalizeExternalLinks(); observeExternalLinks(); mountControls(); mountLoadingLayer(); mountCursor(); mountContextMenu(); mountVirtualScrollbars(); mountSpa(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountRuntime, { once: true });
  else mountRuntime();
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register(new URL("sw.js", SCRIPT_ROOT).href).catch(() => {});
})();
