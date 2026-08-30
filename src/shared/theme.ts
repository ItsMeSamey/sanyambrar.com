// @ts-nocheck
import { animateRootSwap } from './transitions.ts';
import { contrastText } from './contrast.ts';
import { generateAnimatedSineCircleSvg, generateLoadingFrames, loadingGeometry } from './loadingSvg.ts';
(() => {
  const SCRIPT_ROOT = new URL(".", document.currentScript?.src || location.href);
  const KEY = "keybr.theme";
  const FONT_KEY = "samey.font";
  const CURSOR_MODES = Object.freeze(["invert", "hardware", "native"]);
  const CURSOR_LABELS = Object.freeze({ invert: "Invert", hardware: "Hardware", native: "Native" });
  const normalizeCursorMode = (value) => CURSOR_MODES.includes(value) ? value : "invert";
  const config = globalThis.SameyAppearanceConfig;
  if (config == null) throw new Error("Shared appearance config is not loaded");

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
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const cursorDataUrl = (svg, hotspotX = 32, hotspotY = 32) => `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspotX} ${hotspotY}`;
  const hardwareLoadingPath = generateLoadingFrames()[0];
  const hardwareCursorSvgs = (theme) => {
    const fg = theme.text;
    const bg = theme.background;
    const shell = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">${body}</svg>`;
    const dot = shell(`<circle cx="32" cy="32" r="9.4" fill="${bg}"/><circle cx="32" cy="32" r="8.4" fill="${fg}"/>`);
    const text = shell(`<rect x="30" y="20" width="4" height="24" rx="2" fill="${bg}"/><rect x="31" y="21" width="2" height="22" rx="1" fill="${fg}"/>`);
    const grab = shell(`<defs><mask id="b" maskUnits="userSpaceOnUse" style="mask-type:luminance"><circle cx="32" cy="32" r="9.4" fill="white"/><rect x="31.2" y="23.4" width="1.6" height="17.2" fill="black"/><rect x="23.4" y="31.2" width="17.2" height="1.6" fill="black"/></mask><mask id="f" maskUnits="userSpaceOnUse" style="mask-type:luminance"><circle cx="32" cy="32" r="8.4" fill="white"/><rect x="30.2" y="22.4" width="3.6" height="19.2" fill="black"/><rect x="22.4" y="30.2" width="19.2" height="3.6" fill="black"/></mask></defs><circle cx="32" cy="32" r="9.4" fill="${bg}" mask="url(#b)"/><circle cx="32" cy="32" r="8.4" fill="${fg}" mask="url(#f)"/><circle cx="32" cy="32" r="5.8" fill="${bg}"/><circle cx="32" cy="32" r="4.8" fill="${fg}"/>`);
    const loading = shell(`<path d="${hardwareLoadingPath}" fill="${fg}" stroke="${bg}" stroke-width="2" stroke-linejoin="round" paint-order="stroke fill"/>`);
    return { dot, text, grab, loading };
  };
  const applyHardwareCursorTheme = (root, theme) => {
    const svgs = hardwareCursorSvgs(theme);
    root.style.setProperty("--samey-hw-dot", cursorDataUrl(svgs.dot));
    root.style.setProperty("--samey-hw-text", cursorDataUrl(svgs.text));
    root.style.setProperty("--samey-hw-grab", cursorDataUrl(svgs.grab));
    root.style.setProperty("--samey-hw-loading", cursorDataUrl(svgs.loading));
  };
  const semanticRoles = ["accent", "error", "warning", "slow", "fast", "effort"];
  const defaultBgWeight = (tone) => tone === "dark" ? .29 : .17;
  const normalizeTheme = (value, fallback) => {
    const tone = value?.tone === "dark" ? "dark" : "light";
    const background = validHex(value?.background) ? value.background.toLowerCase() : fallback.background;
    const text = validHex(value?.text) ? value.text.toLowerCase() : fallback.text;
    const blurTint = validHex(value?.blurTint) ? value.blurTint.toLowerCase()
      : validHex(fallback?.blurTint) ? fallback.blurTint.toLowerCase()
      : "#000000";
    const shadowTint = validHex(value?.shadowTint) ? value.shadowTint.toLowerCase()
      : validHex(fallback?.shadowTint) ? fallback.shadowTint.toLowerCase()
      : "#000000";
    const out = { tone, background, text, blurTint, shadowTint };
    for (const role of semanticRoles) {
      const fgValue = value?.[`${role}Fg`] ?? value?.[role];
      const fallbackFg = fallback?.[`${role}Fg`] ?? fallback?.[role] ?? text;
      const fg = validHex(fgValue) ? fgValue.toLowerCase() : fallbackFg;
      const bgValue = value?.[`${role}Bg`];
      const fallbackBg = fallback?.[`${role}Bg`];
      const bg = validHex(bgValue) ? bgValue.toLowerCase()
        : validHex(fallbackBg) ? fallbackBg.toLowerCase()
        : mix(background, fg, defaultBgWeight(tone));
      out[role] = fg;
      out[`${role}Fg`] = fg;
      out[`${role}Bg`] = bg;
    }
    const selectionFg = value?.selectionFg;
    const selectionBg = value?.selectionBg;
    out.selectionFg = validHex(selectionFg) ? selectionFg.toLowerCase() : text;
    out.selectionBg = validHex(selectionBg) ? selectionBg.toLowerCase() : mix(background, out.accentFg, tone === "dark" ? .42 : .27);
    return out;
  };

  const rawColors = config.colors;
  const colors = {};
  for (const [id, value] of Object.entries(rawColors)) colors[id] = normalizeTheme(value, value);
  const COLOR_IDS = Object.keys(colors);
  const FONT_IDS = Object.keys(config.fonts);
  const fontLabels = Object.fromEntries(Object.entries(config.fonts).map(([id, value]) => [id, value.label]));
  const fontStacks = Object.fromEntries(Object.entries(config.fonts).map(([id, value]) => [id, value.stack]));
  const DEFAULT_THEME_MENU = ["system", "light", "dark", "clear-dark"];

  let volatileThemePrefs = {};
  let volatileFont;
  const rawPrefs = () => {
    let stored = {};
    try { stored = JSON.parse(localStorage.getItem(KEY) || "null") || {}; } catch {}
    return { ...stored, ...volatileThemePrefs };
  };
  const defaultFont = () => document.documentElement.dataset.siteKind === "keybr" ? "monospace" : "sans-serif";
  const readFont = () => {
    if (FONT_IDS.includes(volatileFont)) return volatileFont;
    try {
      const value = localStorage.getItem(FONT_KEY);
      if (FONT_IDS.includes(value)) return value;
    } catch {}
    const legacy = rawPrefs().font;
    return FONT_IDS.includes(legacy) ? legacy : defaultFont();
  };
  const normalizedSavedThemes = (raw = rawPrefs()) => Array.isArray(raw.savedThemes)
    ? raw.savedThemes.filter((item) => item && typeof item.id === "string" && typeof item.name === "string").map((item) => ({ ...normalizeTheme(item, colors.light), id: item.id, name: item.name.slice(0, 80) }))
    : [];
  const savedThemeId = (id) => `saved:${id}`;
  const migrateColor = (value, savedThemes) => {
    if (value === "light-contrast" || value === "clear-light") return "light";
    if (value === "dark-contrast" || value === "chocolate") return value === "chocolate" ? "dark" : "clear-dark";
    if (["gray", "yellow", "garden", "coffee", "honey"].includes(value)) return "light";
    if (typeof value === "string" && value.startsWith("saved:")) return savedThemes.some((theme) => savedThemeId(theme.id) === value) ? value : "system";
    return value === "system" || value === "custom" || COLOR_IDS.includes(value) ? value : "system";
  };
  const read = () => {
    const raw = rawPrefs();
    const savedThemes = normalizedSavedThemes(raw);
    const selected = migrateColor(raw.color, savedThemes);
    const font = readFont();
    const cursorMode = normalizeCursorMode(raw.cursorMode);
    if (selected === "system") {
      const color = matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      return { color, selected: "system", font, cursorMode, ...colors[color], custom: { ...colors[color] } };
    }
    if (selected === "custom") {
      const custom = raw.custom || {};
      const fallback = custom.tone === "dark" ? colors.dark : colors.light;
      const theme = normalizeTheme(custom, fallback);
      return { color: "custom", selected: "custom", font, cursorMode, ...theme, custom: { ...theme } };
    }
    if (selected.startsWith("saved:")) {
      const saved = savedThemes.find((theme) => savedThemeId(theme.id) === selected) || savedThemes[0];
      const theme = normalizeTheme(saved, saved?.tone === "dark" ? colors.dark : colors.light);
      return { color: selected, selected, font, cursorMode, ...theme, custom: { ...theme }, savedName: saved?.name || "Saved theme" };
    }
    const theme = colors[selected] || colors.light;
    return { color: selected, selected, font, cursorMode, ...theme, custom: { ...theme } };
  };

  const keybrCustomProperties = (theme) => {
    const dark = theme.tone === "dark";
    const primary = theme.background, secondary = theme.text;
    const accent = theme.accentFg, error = theme.errorFg;
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
      "--shadow-color": `color-mix(in srgb,${theme.shadowTint} ${dark ? 53 : 27}%,transparent)`,
      "--Spotlight__background-color": `color-mix(in srgb,${theme.blurTint} 6%,transparent)`,
      "--slow-key-color": theme.slowFg,
      "--fast-key-color": theme.fastFg,
      "--effort-color": theme.effortFg,
      "--textinput__color": secondary,
      "--textinput--special__color": mix(secondary, primary, .5),
      "--textinput--hit__color": mix(secondary, primary, .4),
      "--textinput--miss__color": error,
      "--Name-color": mix(secondary, primary, .2),
      "--Value-color": mix(secondary, primary, .1),
      "--Value--more__color": theme.fastFg,
      "--Value--less__color": theme.slowFg,
      "--Chart-speed__color": theme.fastFg,
      "--Chart-accuracy__color": theme.errorFg,
      "--Chart-complexity__color": theme.effortFg,
      "--Chart-threshold__color": theme.accentFg,
      "--Chart-hist-h__color": theme.effortFg,
      "--Chart-hist-m__color": theme.errorFg,
      "--Chart-hist-r__color": mix(theme.errorFg, theme.effortFg, .5),
      "--KeyboardKey-pointer__color": theme.text,
      "--KeyboardKey-symbol--dead__color": theme.errorFg,
      "--KeyboardKey-symbol--ligature__color": theme.effortFg,
      "--pinky-zone-color": theme.fastBg,
      "--ring-zone-color": theme.warningBg,
      "--middle-zone-color": theme.warningBg,
      "--left-index-zone-color": theme.accentBg,
      "--right-index-zone-color": theme.effortBg,
      "--thumb-zone-color": theme.errorBg,
      "--syntax-keyword": theme.accentFg,
      "--syntax-string": theme.fastFg,
      "--syntax-number": theme.effortFg,
      "--syntax-comment": mix(secondary, primary, .42),
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

  let appearancePanel = null;
  let appearanceTrigger = null;
  let advancedPage = null;
  let advancedEditor = null;

  const apply = () => {
    const theme = read();
    const root = document.documentElement;
    root.dataset.siteTheme = theme.color;
    root.dataset.kbTheme = theme.tone;
    root.dataset.font = theme.font;
    root.dataset.color = theme.color;
    root.classList.toggle("dark", theme.tone === "dark");
    root.style.colorScheme = theme.tone;
    root.dataset.cursorMode = theme.cursorMode;
    root.classList.toggle("samey-custom-cursor", theme.cursorMode === "invert");
    root.classList.toggle("samey-hardware-cursor", theme.cursorMode === "hardware");
    root.classList.toggle("samey-native-cursor", theme.cursorMode === "native");
    applyHardwareCursorTheme(root, theme);

    const line = mix(theme.text, theme.background, theme.tone === "dark" ? .72 : .82);
    const soft = mix(theme.text, theme.background, theme.tone === "dark" ? .9 : .96);
    root.style.setProperty("--site-bg", theme.background);
    root.style.setProperty("--site-fg", theme.text);
    root.style.setProperty("--site-muted", mix(theme.text, theme.background, .42));
    root.style.setProperty("--site-line", line);
    root.style.setProperty("--site-soft", soft);
    root.style.setProperty("--site-blur-tint", theme.blurTint);
    root.style.setProperty("--site-shadow-tint", theme.shadowTint);
    root.style.setProperty("--site-on-fg", contrastText(theme.text));
    root.style.setProperty("--site-on-bg", contrastText(theme.background));
    for (const role of semanticRoles) {
      const fg = theme[`${role}Fg`];
      const bg = theme[`${role}Bg`];
      root.style.setProperty(`--site-${role}-fg`, fg);
      root.style.setProperty(`--site-${role}-bg`, bg);
      root.style.setProperty(`--site-${role}-on-fg`, contrastText(fg));
      root.style.setProperty(`--site-${role}-on-bg`, contrastText(bg));
    }
    root.style.setProperty("--site-accent", theme.accentFg);
    root.style.setProperty("--site-error", theme.errorFg);
    root.style.setProperty("--site-warning-color", theme.warningFg);
    root.style.setProperty("--site-slow-color", theme.slowFg);
    root.style.setProperty("--site-fast-color", theme.fastFg);
    root.style.setProperty("--site-effort-color", theme.effortFg);
    root.style.setProperty("--site-font", fontStacks[theme.font]);

    if (root.dataset.siteKind === "wordle") {
      root.style.removeProperty("--site-selection");
      root.style.removeProperty("--site-selection-bg");
      root.style.removeProperty("--site-selection-fg");
    } else {
      root.style.setProperty("--site-selection", theme.selectionBg);
      root.style.setProperty("--site-selection-bg", theme.selectionBg);
      root.style.setProperty("--site-selection-fg", theme.selectionFg);
    }

    if (root.dataset.siteKind === "keybr") {
      for (const name of KEYBR_CUSTOM_PROPERTIES) root.style.removeProperty(name);
      for (const [name, value] of Object.entries(keybrCustomProperties(theme))) root.style.setProperty(name, value);
    }

    if (root.dataset.siteKind === "wordle") {
      const infoBg = mix(theme.background, theme.effortFg, .18);
      const successBg = mix(theme.background, theme.fastFg, .18);
      const warningBg = mix(theme.background, theme.warningFg, .18);
      const errorBg = mix(theme.background, theme.errorFg, .16);
      const stateErrorBg = mix(theme.background, theme.errorFg, .68);
      const stateWarningBg = mix(theme.background, theme.warningFg, .76);
      const stateFastBg = mix(theme.background, theme.fastFg, .76);
      const stateEffortBg = mix(theme.background, theme.effortFg, .70);
      root.style.setProperty("--background", hsl(theme.background));
      root.style.setProperty("--foreground", hsl(theme.text));
      root.style.setProperty("--card", hsl(theme.background));
      root.style.setProperty("--card-foreground", hsl(theme.text));
      root.style.setProperty("--popover", hsl(theme.background));
      root.style.setProperty("--popover-foreground", hsl(theme.text));
      root.style.setProperty("--primary", hsl(theme.text));
      root.style.setProperty("--primary-foreground", hsl(contrastText(theme.text)));
      root.style.setProperty("--secondary", hsl(soft));
      root.style.setProperty("--secondary-foreground", hsl(theme.text));
      root.style.setProperty("--muted", hsl(soft));
      root.style.setProperty("--muted-foreground", hsl(mix(theme.text, theme.background, .42)));
      root.style.setProperty("--accent", hsl(soft));
      root.style.setProperty("--accent-foreground", hsl(theme.text));
      root.style.setProperty("--border", hsl(line));
      root.style.setProperty("--input", hsl(line));
      root.style.setProperty("--ring", hsl(theme.accentFg));
      root.style.setProperty("--info", hsl(infoBg));
      root.style.setProperty("--info-foreground", hsl(theme.effortFg));
      root.style.setProperty("--info-on-bg", hsl(contrastText(infoBg)));
      root.style.setProperty("--success", hsl(successBg));
      root.style.setProperty("--success-foreground", hsl(theme.fastFg));
      root.style.setProperty("--success-on-bg", hsl(contrastText(successBg)));
      root.style.setProperty("--warning", hsl(warningBg));
      root.style.setProperty("--warning-foreground", hsl(theme.warningFg));
      root.style.setProperty("--warning-on-bg", hsl(contrastText(warningBg)));
      root.style.setProperty("--error", hsl(errorBg));
      root.style.setProperty("--error-foreground", hsl(theme.errorFg));
      root.style.setProperty("--error-on-bg", hsl(contrastText(errorBg)));
      root.style.setProperty("--destructive", hsl(theme.errorFg));
      root.style.setProperty("--destructive-foreground", hsl(contrastText(theme.errorFg)));
      root.style.setProperty("--wordle-state-r-bg", stateErrorBg);
      root.style.setProperty("--wordle-state-r-fg", contrastText(stateErrorBg));
      root.style.setProperty("--wordle-state-y-bg", stateWarningBg);
      root.style.setProperty("--wordle-state-y-fg", contrastText(stateWarningBg));
      root.style.setProperty("--wordle-state-g-bg", stateFastBg);
      root.style.setProperty("--wordle-state-g-fg", contrastText(stateFastBg));
      root.style.setProperty("--wordle-state-b-bg", stateEffortBg);
      root.style.setProperty("--wordle-state-b-fg", contrastText(stateEffortBg));
      root.style.setProperty("--wordle-key-neutral", mix(theme.text, theme.background, theme.tone === "dark" ? .78 : .74));
    }

    document.querySelectorAll("[data-theme-choice]").forEach((el) => el.toggleAttribute("data-selected", el.dataset.themeChoice === theme.selected));
    document.querySelectorAll("[data-font-choice]").forEach((el) => el.toggleAttribute("data-selected", el.dataset.fontChoice === theme.font));
    renderAppearancePanel();
    syncAdvancedMenuChecks();
    notify(theme);
    return theme;
  };

  const setPrefs = (patch) => {
    if (Object.hasOwn(patch, "font")) {
      try { nativeSetItem.call(localStorage, FONT_KEY, patch.font); volatileFont = undefined; }
      catch { volatileFont = patch.font; }
    }
    const themePatch = { ...patch };
    delete themePatch.font;
    if (Object.keys(themePatch).length > 0) {
      const raw = rawPrefs();
      const { font: _legacyFont, ...theme } = raw;
      const next = { ...theme, ...themePatch };
      try { nativeSetItem.call(localStorage, KEY, JSON.stringify(next)); volatileThemePrefs = {}; }
      catch { volatileThemePrefs = next; }
    }
    apply();
  };

  const appearance = Object.freeze({
    get: read,
    set: setPrefs,
    apply,
    themeIds: Object.freeze(["system", ...COLOR_IDS, "custom"]),
    fontIds: Object.freeze([...FONT_IDS]),
  });
  Object.defineProperty(globalThis, "SameyAppearance", { value: appearance, configurable: false, writable: false });

  const themeCatalog = () => {
    const raw = rawPrefs();
    const saved = normalizedSavedThemes(raw);
    const entries = [
      ["system", "System"],
      ...Object.entries(config.colors).map(([id, value]) => [id, value.label]),
      ...saved.map((theme) => [savedThemeId(theme.id), theme.name]),
    ];
    return entries;
  };
  const menuThemeIds = () => {
    const raw = rawPrefs();
    const catalog = new Set(themeCatalog().map(([id]) => id));
    const requested = Array.isArray(raw.menuThemes) ? raw.menuThemes : DEFAULT_THEME_MENU;
    const result = requested.filter((id) => catalog.has(id) && id !== "clear-light");
    return result.length ? result : [...DEFAULT_THEME_MENU];
  };
  const themeSection = () => {
    const allowed = new Set(menuThemeIds());
    const entries = themeCatalog().filter(([id]) => allowed.has(id));
    return `<div class="samey-panel-title">Themes</div>${entries.map(([value, label]) => `<button type="button" data-theme-choice="${escapeHtml(value)}">${escapeHtml(label)}</button>`).join("")}`;
  };
  const fontSection = () => `<div class="samey-panel-title">Fonts</div>${["monospace", "sans-serif"].filter((id) => FONT_IDS.includes(id)).map((id) => `<button type="button" data-font-choice="${id}">${escapeHtml(fontLabels[id])}</button>`).join("")}`;
  const CURSOR_TOGGLE_POINTS = [[0,-13.1991],[-12.235,8.0898],[12.235,8.0898]];
  const CURSOR_TOGGLE_EDGES = [[0,-13.1991,-1.8964,-.1064,-12.235,8.0898,93.282],[-12.235,8.0898,0,3.1933,12.235,8.0898,92.994],[12.235,8.0898,1.8964,-.1064,0,-13.1991,93.282]];
  const CURSOR_TOGGLE_RAIL = "M 0 -13.1991 Q 1.8964 -0.1064 12.235 8.0898 Q 0 3.1933 -12.235 8.0898 Q -1.8964 -0.1064 0 -13.1991 Z";
  const cursorSection = () => {
    const mode = read().cursorMode;
    const state = CURSOR_MODES.indexOf(mode);
    const [x,y] = CURSOR_TOGGLE_POINTS[state];
    return `<div class="samey-panel-title">Cursor</div><div class="samey-appearance-tools"><div class="samey-cursor-mode-row"><button type="button" class="samey-cursor-mode-toggle" data-cursor-mode-toggle aria-label="Cursor mode: ${CURSOR_LABELS[mode]}" aria-valuemin="0" aria-valuemax="2" aria-valuenow="${state}" aria-valuetext="${CURSOR_LABELS[mode]}"><svg viewBox="-33.235 -34.1991 66.47 63.2889" aria-hidden="true"><defs><radialGradient id="samey-cursor-toggle-glow" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="50" gradientTransform="translate(${x} ${y})"><stop offset="0" stop-color="var(--site-fg)" stop-opacity=".32"/><stop offset=".35" stop-color="var(--site-muted)" stop-opacity=".28"/><stop offset="1" stop-color="var(--site-bg)" stop-opacity=".18"/></radialGradient></defs><path d="${CURSOR_TOGGLE_RAIL}" fill="none" stroke="var(--site-line)" stroke-width="34.2" stroke-linecap="round" stroke-linejoin="round"/><path d="${CURSOR_TOGGLE_RAIL}" fill="none" stroke="url(#samey-cursor-toggle-glow)" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/><path d="${CURSOR_TOGGLE_RAIL}" fill="url(#samey-cursor-toggle-glow)"/><g data-cursor-toggle-knob transform="translate(${x} ${y})"><circle cx="0" cy="0" r="13" fill="var(--site-fg)" stroke="var(--site-bg)" stroke-width="1"/></g></svg></button><span class="samey-cursor-mode-name" data-cursor-mode-name>${CURSOR_LABELS[mode]}</span></div><div class="samey-appearance-tool-actions"><button type="button" data-open-advanced>Advanced</button><button type="button" data-open-colorblind>Colorblind</button></div></div>`;
  };
  const bindCursorToggle = () => {
    const button = appearancePanel?.querySelector("[data-cursor-mode-toggle]");
    if (!button) return;
    const knob = button.querySelector("[data-cursor-toggle-knob]");
    const gradient = button.querySelector("radialGradient");
    const name = appearancePanel.querySelector("[data-cursor-mode-name]");
    let state = Number(button.getAttribute("aria-valuenow")) || 0;
    let raf = 0, queued = 0;
    const ease = (t) => t < .5 ? 4*t*t*t : 1 - ((-2*t+2)**3)/2;
    const setPoint = (x,y) => { const transform = `translate(${x} ${y})`; knob?.setAttribute("transform", transform); gradient?.setAttribute("gradientTransform", transform); };
    const run = () => {
      if (raf) { queued++; return; }
      const from = state, to = (from + 1) % 3;
      const [x0,y0,cx,cy,x1,y1,duration] = CURSOR_TOGGLE_EDGES[from];
      const start = performance.now();
      button.setAttribute("aria-valuenow", String(to));
      button.setAttribute("aria-valuetext", CURSOR_LABELS[CURSOR_MODES[to]]);
      button.setAttribute("aria-label", `Cursor mode: ${CURSOR_LABELS[CURSOR_MODES[to]]}`);
      if (name) name.textContent = CURSOR_LABELS[CURSOR_MODES[to]];
      const frame = (now) => {
        const raw = Math.min(1,(now-start)/duration), t=ease(raw), u=1-t;
        setPoint(u*u*x0+2*u*t*cx+t*t*x1, u*u*y0+2*u*t*cy+t*t*y1);
        if (raw < 1) { raf=requestAnimationFrame(frame); return; }
        state=to; const [px,py]=CURSOR_TOGGLE_POINTS[state]; setPoint(px,py); raf=0;
        setPrefs({ cursorMode: CURSOR_MODES[state] });
        if (queued) { queued--; run(); }
      };
      raf=requestAnimationFrame(frame);
    };
    button.addEventListener("click", (event) => { event.stopPropagation(); run(); });
    button.addEventListener("keydown", (event) => { if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); run(); } });
  };
  function renderAppearancePanel() {
    if (!appearancePanel) return;
    const wasHidden = appearancePanel.hidden;
    appearancePanel.innerHTML = themeSection() + fontSection() + cursorSection();
    appearancePanel.hidden = wasHidden;
    const theme = read();
    appearancePanel.querySelectorAll("[data-theme-choice]").forEach((el) => el.toggleAttribute("data-selected", el.dataset.themeChoice === theme.selected));
    appearancePanel.querySelectorAll("[data-font-choice]").forEach((el) => el.toggleAttribute("data-selected", el.dataset.fontChoice === theme.font));
    bindCursorToggle();
  }
  const positionAppearancePanel = (trigger) => {
    if (!appearancePanel || !trigger) return;
    const margin = 8;
    const gap = 6;
    const r = trigger.getBoundingClientRect();
    const width = appearancePanel.offsetWidth || 176;
    const height = appearancePanel.offsetHeight || 0;
    const left = Math.max(margin, Math.min(innerWidth - width - margin, r.right - width));
    const below = r.bottom + gap;
    const above = r.top - gap - height;
    const top = below + height <= innerHeight - margin ? below : Math.max(margin, above);
    appearancePanel.style.left = `${left}px`;
    appearancePanel.style.top = `${top}px`;
    appearancePanel.style.maxHeight = `${Math.max(80, innerHeight - top - margin)}px`;
    appearancePanel.style.overflowY = "auto";
  };
  const closeAppearance = () => {
    if (!appearancePanel) return;
    appearancePanel.hidden = true;
    appearanceTrigger?.setAttribute("aria-expanded", "false");
    appearanceTrigger = null;
  };
  const toggleAppearance = (trigger) => {
    if (!appearancePanel) mountControls();
    if (!appearancePanel) return;
    if (!appearancePanel.hidden && appearanceTrigger === trigger) return closeAppearance();
    appearanceTrigger?.setAttribute("aria-expanded", "false");
    appearanceTrigger = trigger;
    trigger.setAttribute("aria-expanded", "true");
    renderAppearancePanel();
    appearancePanel.hidden = false;
    positionAppearancePanel(trigger);
  };

  const editorFields = [
    ["background", "Page background"], ["text", "Text"],
    ["blurTint", "Blur tint"], ["shadowTint", "Shadow tint"],
    ["selectionBg", "Selection background"], ["selectionFg", "Selection text"],
    ["accentFg", "Accent foreground"], ["accentBg", "Accent background"],
    ["errorFg", "Error foreground"], ["errorBg", "Error background"],
    ["warningFg", "Warning foreground"], ["warningBg", "Warning background"],
    ["slowFg", "Slow foreground"], ["slowBg", "Slow background"],
    ["fastFg", "Fast foreground"], ["fastBg", "Fast background"],
    ["effortFg", "Effort foreground"], ["effortBg", "Effort background"],
  ];
  const editorThemeFromInputs = () => {
    if (!advancedEditor) return read().custom;
    const value = { tone: advancedEditor.querySelector('[name="tone"]')?.value === "dark" ? "dark" : "light" };
    for (const [key] of editorFields) {
      const input = advancedEditor.querySelector(`[name="${key}"]`);
      if (input && validHex(input.value)) value[key] = input.value.toLowerCase();
    }
    return normalizeTheme(value, value.tone === "dark" ? colors.dark : colors.light);
  };
  const fillAdvancedEditor = (theme = read()) => {
    if (!advancedEditor) return;
    advancedEditor.querySelector('[name="tone"]').value = theme.tone;
    for (const [key] of editorFields) {
      const value = theme[key] || theme.custom?.[key];
      if (!validHex(value)) continue;
      const color = advancedEditor.querySelector(`[data-color-for="${key}"]`);
      const text = advancedEditor.querySelector(`[name="${key}"]`);
      if (color) color.value = value;
      if (text) text.value = value;
    }
    const name = advancedEditor.querySelector('[name="themeName"]');
    if (name && !name.value) name.value = theme.savedName || "My theme";
  };
  const syncColorPair = (target) => {
    const key = target.dataset.colorFor || target.name;
    if (!key || !editorFields.some(([field]) => field === key)) return;
    const color = advancedEditor.querySelector(`[data-color-for="${key}"]`);
    const text = advancedEditor.querySelector(`[name="${key}"]`);
    if (target.matches('input[type="color"]')) text.value = target.value;
    else if (validHex(target.value)) color.value = target.value;
  };
  const previewAdvanced = () => setPrefs({ color: "custom", custom: editorThemeFromInputs() });
  const makeSavedId = (name) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36) || "theme";
    return `${slug}-${Date.now().toString(36)}`;
  };
  const saveAdvancedTheme = () => {
    const raw = rawPrefs();
    const name = advancedEditor.querySelector('[name="themeName"]')?.value.trim() || "Saved theme";
    const theme = editorThemeFromInputs();
    const savedThemes = normalizedSavedThemes(raw);
    const id = makeSavedId(name);
    savedThemes.push({ id, name, ...theme });
    const menuThemes = [...new Set([...menuThemeIds(), savedThemeId(id)])];
    setPrefs({ savedThemes, menuThemes, color: savedThemeId(id) });
    renderAdvancedSavedThemes();
  };
  const advancedMenuList = () => themeCatalog().filter(([id]) => id !== "clear-light").map(([id, label]) => {
    const checked = menuThemeIds().includes(id) ? " checked" : "";
    return `<label class="samey-advanced-check"><input type="checkbox" data-menu-theme="${escapeHtml(id)}"${checked}><span>${escapeHtml(label)}</span></label>`;
  }).join("");
  const renderAdvancedSavedThemes = () => {
    if (!advancedPage) return;
    const host = advancedPage.querySelector("[data-saved-themes]");
    const saved = normalizedSavedThemes();
    host.innerHTML = saved.length ? saved.map((theme) => `<div class="samey-saved-theme"><button type="button" data-load-saved="${escapeHtml(theme.id)}">${escapeHtml(theme.name)}</button><button type="button" data-delete-saved="${escapeHtml(theme.id)}" aria-label="Delete ${escapeHtml(theme.name)}">×</button></div>`).join("") : `<p class="samey-advanced-empty">No saved themes yet.</p>`;
    const menu = advancedPage.querySelector("[data-theme-menu-list]");
    if (menu) menu.innerHTML = advancedMenuList();
  };
  function syncAdvancedMenuChecks() {
    if (!advancedPage || advancedPage.hidden) return;
    const allowed = new Set(menuThemeIds());
    advancedPage.querySelectorAll("[data-menu-theme]").forEach((input) => { input.checked = allowed.has(input.dataset.menuTheme); });
  }
  const setMenuThemeAllowed = (id, allowed) => {
    const set = new Set(menuThemeIds());
    if (allowed) set.add(id); else set.delete(id);
    if (set.size === 0) set.add("system");
    setPrefs({ menuThemes: [...set] });
  };
  const deleteSavedTheme = (id) => {
    const raw = rawPrefs();
    const selectedId = savedThemeId(id);
    const savedThemes = normalizedSavedThemes(raw).filter((theme) => theme.id !== id);
    const menuThemes = menuThemeIds().filter((themeId) => themeId !== selectedId);
    const patch = { savedThemes, menuThemes };
    if (read().selected === selectedId) patch.color = "system";
    setPrefs(patch);
    renderAdvancedSavedThemes();
  };
  const loadSavedIntoEditor = (id) => {
    const saved = normalizedSavedThemes().find((theme) => theme.id === id);
    if (!saved) return;
    const name = advancedEditor.querySelector('[name="themeName"]');
    if (name) name.value = saved.name;
    fillAdvancedEditor(saved);
    previewAdvanced();
  };
  const loadPresetIntoEditor = (id) => {
    const preset = colors[id];
    if (!preset) return;
    const name = advancedEditor.querySelector('[name="themeName"]');
    if (name) name.value = `${config.colors[id]?.label || id} custom`;
    fillAdvancedEditor(preset);
    previewAdvanced();
  };
  const colorblindPresetIds = [
    "deuteranopia", "deuteranopia-dark", "deuteranopia-cool-dark",
    "protanopia", "protanopia-dark", "protanopia-cool-dark",
    "tritanopia", "tritanopia-dark", "tritanopia-cool-dark",
  ].filter((id) => colors[id]);
  const mountAdvancedPage = () => {
    if (advancedPage) return;
    const page = document.createElement("div");
    page.className = "samey-theme-advanced";
    page.dataset.sameyOverlay = "";
    page.dataset.sameyRuntime = "";
    page.hidden = true;
    page.innerHTML = `<div class="samey-theme-advanced-shell"><header><div><span>Appearance</span><h1>Advanced theming &amp; colorblind modes</h1></div><button type="button" data-close-advanced aria-label="Close advanced theming and colorblind modes">×</button></header><main><section class="samey-advanced-editor" data-advanced-editor><div class="samey-advanced-field"><label>Theme name<input name="themeName" value="My theme" maxlength="80"></label><label>Tone<select name="tone"><option value="light">Light</option><option value="dark">Dark</option></select></label></div><div class="samey-advanced-color-grid">${editorFields.map(([key, label]) => `<label><span>${escapeHtml(label)}</span><span class="samey-color-input"><input type="color" data-color-for="${key}"><input name="${key}" spellcheck="false" maxlength="7"></span></label>`).join("")}</div><div class="samey-advanced-actions"><button type="button" data-save-theme>Save theme</button><button type="button" data-reset-editor>Reset to current</button></div></section><aside><section data-colorblind-section><h2>Colorblind modes</h2><p>Each mode has light, dark, and cool dark variants. Load one, then edit or save it.</p><div class="samey-advanced-preset-list">${colorblindPresetIds.map((id) => `<button type="button" data-load-preset="${escapeHtml(id)}">${escapeHtml(config.colors[id]?.label || id)}</button>`).join("")}</div></section><section><h2>Theme menu</h2><p>Choose which themes appear in the compact menu.</p><div class="samey-advanced-check-list" data-theme-menu-list></div></section><section><h2>Saved themes</h2><div data-saved-themes></div></section></aside></main></div>`;
    document.body.append(page);
    advancedPage = page;
    advancedEditor = page.querySelector("[data-advanced-editor]");
    advancedEditor.addEventListener("input", (event) => {
      const target = event.target;
      if (target.name === "themeName") return;
      syncColorPair(target);
      if (target.name === "tone") {
        const current = editorThemeFromInputs();
        const normalized = normalizeTheme({ ...current, tone: target.value }, target.value === "dark" ? colors.dark : colors.light);
        fillAdvancedEditor(normalized);
      }
      if (target.matches('input[type="color"]') || validHex(target.value) || target.name === "tone") previewAdvanced();
    });
    page.addEventListener("click", (event) => {
      const target = event.target.closest?.("button");
      if (!target) return;
      if (target.hasAttribute("data-close-advanced")) closeAdvanced();
      else if (target.hasAttribute("data-save-theme")) saveAdvancedTheme();
      else if (target.hasAttribute("data-reset-editor")) { advancedEditor.querySelector('[name="themeName"]').value = read().savedName || "My theme"; fillAdvancedEditor(read()); }
      else if (target.dataset.loadPreset) loadPresetIntoEditor(target.dataset.loadPreset);
      else if (target.dataset.loadSaved) loadSavedIntoEditor(target.dataset.loadSaved);
      else if (target.dataset.deleteSaved) deleteSavedTheme(target.dataset.deleteSaved);
    });
    page.addEventListener("change", (event) => {
      const input = event.target.closest?.("[data-menu-theme]");
      if (input) setMenuThemeAllowed(input.dataset.menuTheme, input.checked);
    });
  };
  const openAdvanced = (target = "advanced") => {
    mountAdvancedPage();
    closeAppearance();
    advancedEditor.querySelector('[name="themeName"]').value = read().savedName || "My theme";
    fillAdvancedEditor(read());
    renderAdvancedSavedThemes();
    advancedPage.hidden = false;
    document.documentElement.classList.add("samey-advanced-open");
    advancedPage.scrollTop = 0;
    if (target === "colorblind") requestAnimationFrame(() => { const section = advancedPage.querySelector("[data-colorblind-section]"); if (!section) return; if (matchMedia?.("(max-width:760px)").matches) section.scrollIntoView({ block: "start" }); else section.querySelector("button")?.focus({ preventScroll: true }); });
  };
  const closeAdvanced = () => {
    if (!advancedPage) return;
    advancedPage.hidden = true;
    document.documentElement.classList.remove("samey-advanced-open");
  };

  const mountControls = () => {
    if (appearancePanel) return;
    const panel = document.createElement("div");
    panel.id = "samey-theme-panel";
    panel.className = "samey-theme-panel";
    panel.dataset.sameyRuntime = "";
    panel.dataset.sameyOverlay = "";
    panel.hidden = true;
    panel.addEventListener("click", (event) => {
      const themeButton = event.target.closest("[data-theme-choice]");
      if (themeButton) setPrefs({ color: themeButton.dataset.themeChoice });
      const fontButton = event.target.closest("[data-font-choice]");
      if (fontButton) setPrefs({ font: fontButton.dataset.fontChoice });
      if (event.target.closest("[data-open-advanced]")) openAdvanced();
      else if (event.target.closest("[data-open-colorblind]")) openAdvanced("colorblind");
    });
    document.body.append(panel);
    appearancePanel = panel;
    document.addEventListener("click", (event) => {
      const trigger = event.target.closest?.("[data-samey-appearance]");
      if (trigger) { event.preventDefault(); event.stopPropagation(); toggleAppearance(trigger); return; }
      if (!panel.contains(event.target)) closeAppearance();
    });
    addEventListener("resize", () => appearanceTrigger && positionAppearancePanel(appearanceTrigger), { passive: true });
    addEventListener("samey-pageleave", closeAppearance);
    addEventListener("keydown", (event) => { if (event.key === "Escape" && advancedPage && !advancedPage.hidden) closeAdvanced(); });
    renderAppearancePanel();
    apply();
  };
  globalThis.SameyOpenAppearance = (trigger) => toggleAppearance(trigger);

  const pushState = history.pushState.bind(history);
  const replaceState = history.replaceState.bind(history);

  const runtimeNode = (el) => { el.dataset.sameyRuntime = ""; return el; };

  const normalizeExternalLinks = (root = document) => {
    for (const link of root.querySelectorAll?.('a[href]') || []) {
      let url;
      try { url = new URL(link.href, location.href); } catch { continue; }
      if (!/^https?:$/.test(url.protocol) || url.origin === location.origin) continue;
      delete link.dataset.sameyExternal;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
  };
  const observeExternalLinks = () => new MutationObserver((records) => {
    for (const record of records) for (const node of record.addedNodes) {
      if (!(node instanceof Element) || node.closest?.(".monaco-host, .monaco-editor, .monaco-diff-editor")) continue;
      if (node.matches?.("a[href]")) normalizeExternalLinks(node.parentElement || document);
      else normalizeExternalLinks(node);
    }
  }).observe(document.documentElement, { subtree: true, childList: true });
  const loadingFrames = generateLoadingFrames;
  const loadingCursorSvg = generateAnimatedSineCircleSvg;
  globalThis.SameyLoadingSvg = loadingCursorSvg;

  // One shared loading state drives the cursor and the top progress strip.
  // Token-based callers compose safely with route navigation instead of one
  // async task hiding another task's loading state.
  let directLoading = false;
  let loadingTasks = 0;
  let loadingState = false;
  const publishLoading = () => {
    const on = directLoading || loadingTasks > 0;
    if (on === loadingState) return;
    loadingState = on;
    document.documentElement.toggleAttribute("data-site-loading", on);
    dispatchEvent(new CustomEvent("samey-loading", { detail: on }));
  };
  globalThis.SameyLoading = (value) => { directLoading = !!value; publishLoading(); };
  globalThis.SameyLoadingBegin = () => {
    loadingTasks++; publishLoading();
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      loadingTasks = Math.max(0, loadingTasks - 1);
      publishLoading();
    };
  };
  globalThis.SameyLoadingBeginAfterDelay = (delay = 120) => {
    let active = true;
    let release;
    const timer = setTimeout(() => {
      if (active) release = globalThis.SameyLoadingBegin();
    }, delay);
    return () => {
      if (!active) return;
      active = false;
      clearTimeout(timer);
      release?.();
    };
  };
  const mountLoadingBar = () => {
    if (document.getElementById("samey-loading-top")) return;
    const root = runtimeNode(document.createElement("div"));
    root.id = "samey-loading-top";
    root.className = "samey-loading-top";
    root.setAttribute("role", "progressbar");
    root.setAttribute("aria-label", "Loading");
    root.innerHTML = '<span class="samey-loading-top-bar"></span>';
    document.body.append(root);
  };

  const mountCursor = () => {
    if (!matchMedia?.("(pointer:fine)").matches || document.getElementById("samey-cursor")) return;
    const cursor = runtimeNode(document.createElement("div"));
    cursor.id = "samey-cursor";
    cursor.className = "samey-cursor";
    cursor.innerHTML = `<span class="samey-cursor-dot"></span><span class="samey-cursor-text"></span><svg class="samey-cursor-grab" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><mask id="samey-grab-mask" x="0" y="0" width="64" height="64" maskUnits="userSpaceOnUse" style="mask-type:luminance"><circle cx="32" cy="32" r="8.4" fill="white"/><rect x="30.2" y="22.4" width="3.6" height="19.2" fill="black"/><rect x="22.4" y="30.2" width="19.2" height="3.6" fill="black"/></mask><circle cx="32" cy="32" r="8.4" fill="currentColor" mask="url(#samey-grab-mask)"/><circle cx="32" cy="32" r="4.8" fill="currentColor"><animate class="samey-cursor-grab-pulse" attributeName="r" values="8.4;4.8" dur=".18s" repeatCount="1" calcMode="linear" begin="indefinite" fill="remove"/></circle></svg>${loadingCursorSvg()}`;
    const linkFill = runtimeNode(document.createElement("div"));
    linkFill.className = "samey-cursor-link-fill";
    linkFill.hidden = true;
    const fillSlices = [];
    const ensureFillSlice = (index) => {
      while (fillSlices.length <= index) {
        const slice = document.createElement("span");
        slice.className = "samey-cursor-link-fill-slice";
        slice.hidden = true;
        linkFill.append(slice);
        fillSlices.push(slice);
      }
      return fillSlices[index];
    };
    const dragPreview = runtimeNode(document.createElement("div"));
    dragPreview.className = "samey-drag-preview";
    dragPreview.hidden = true;
    document.body.append(linkFill, dragPreview, cursor);
    let cursorMode = read().cursorMode;
    const loadingPath = cursor.querySelector(".samey-cursor-loading path");
    // The reusable loading SVG carries SMIL for standalone boot screens. The
    // cursor advances the same path explicitly, so disable the duplicate SVG
    // animation here instead of running both animation engines while loading.
    loadingPath?.querySelector("animate")?.remove();
    let cursorVisible = false;
    let cursorLoading = false;
    const setCursorVisible = (visible) => {
      if (cursorVisible === visible) return;
      cursorVisible = visible;
      if (visible) cursor.dataset.visible = "";
      else delete cursor.dataset.visible;
    };
    let loadingRaf = 0, loadingStarted = 0;
    let refreshCursorMode = () => {};
    const animateLoadingPaths = (time) => {
      if (!cursorLoading) { loadingRaf = 0; return; }
      const frames = loadingFrames();
      const duration = loadingGeometry.duration * 1000;
      const progress = (Math.max(0, time - loadingStarted) % duration) / duration;
      const frame = Math.max(0, Math.min(frames.length - 1, Math.floor(progress * (frames.length - 1))));
      loadingPath?.setAttribute("d", frames[frame]);
      loadingRaf = requestAnimationFrame(animateLoadingPaths);
    };
    const setLoading = (loading) => {
      cursorLoading = !!loading;
      cursor.toggleAttribute("data-loading", cursorLoading);
      if (loading) {
        clearCursorIdle();
        cursor.removeAttribute("data-grab");
        cursor.removeAttribute("data-text");
        setCursorVisible(true);
      }
      document.documentElement.toggleAttribute("data-site-loading", !!loading);
      if (loading && !loadingRaf) { loadingStarted = performance.now(); loadingPath?.setAttribute("d", loadingFrames()[0]); loadingRaf = requestAnimationFrame(animateLoadingPaths); }
      if (!loading && loadingRaf) { cancelAnimationFrame(loadingRaf); loadingRaf = 0; }
      if (!loading) {
        refreshCursorMode();
        if (cursorVisible) armCursorIdle();
      }
    };
    addEventListener("samey-loading", event => setLoading(!!event.detail));
    if (loadingState) queueMicrotask(() => { if (loadingState) setLoading(true); });

    // `difference` with a fixed white source has an unavoidable 50% gray
    // fixed point. Choose the blend source discontinuously from the effective
    // backdrop instead: dark surfaces use white, light surfaces use 80% gray.
    // With the 45% threshold, a uniform grayscale backdrop is always changed
    // by at least 10 percentage points, so the cursor cannot disappear at the
    // old inversion fixed point.
    const parseRgb = (value) => {
      const text = String(value || "").trim().toLowerCase();
      const parts = text.match(/[+-]?(?:\d+\.?\d*|\.\d+)/g)?.map(Number) || [];
      if (parts.length < 3) return null;
      if (text.startsWith("color(srgb ")) {
        return { r: parts[0] * 255, g: parts[1] * 255, b: parts[2] * 255, a: parts.length > 3 ? parts[3] : 1 };
      }
      if (!text.startsWith("rgb")) return null;
      return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
    };
    const effectiveBackdropLuma = (target) => {
      let el = target instanceof Element ? target : document.body;
      while (el) {
        const style = getComputedStyle(el);
        const rgb = parseRgb(style.backgroundColor);
        if (rgb && rgb.a >= .75) return (rgb.r * .2126 + rgb.g * .7152 + rgb.b * .0722) / 255;
        el = el.parentElement;
      }
      const fallback = parseRgb(getComputedStyle(document.body).backgroundColor);
      return fallback ? (fallback.r * .2126 + fallback.g * .7152 + fallback.b * .0722) / 255 : 1;
    };
    let blendTarget = null;
    let blendThemeBackground = "";
    const updateBlendSource = (target) => {
      const themeBackground = document.documentElement.style.getPropertyValue("--site-bg");
      if (blendTarget === target && blendThemeBackground === themeBackground) return;
      blendTarget = target;
      blendThemeBackground = themeBackground;
      const lightBackdrop = effectiveBackdropLuma(target) >= .45;
      const source = lightBackdrop ? "#ccc" : "#fff";
      cursor.style.setProperty("--samey-cursor-blend", source);
      linkFill.style.setProperty("--samey-cursor-blend", source);
      cursor.dataset.blendSource = lightBackdrop ? "light" : "dark";
    };
    const zIndexOf = (el) => {
      const z = Number.parseInt(getComputedStyle(el).zIndex, 10);
      return Number.isFinite(z) ? z : 0;
    };
    const containingOverlay = (target) => target instanceof Element ? target.closest("[data-samey-overlay]") : null;
    const cssFillLayer = Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue("--samey-z-link-fill"), 10);
    const baseFillLayer = Number.isFinite(cssFillLayer) ? cssFillLayer : 2147483000;
    let fillLayer = baseFillLayer;
    const fillLayerFor = (target) => {
      const overlay = containingOverlay(target);
      return overlay ? Math.min(2147483645, zIndexOf(overlay) + 1) : baseFillLayer;
    };
    const setFillLayer = (target) => {
      fillLayer = fillLayerFor(target);
      for (const slice of fillSlices) slice.style.zIndex = String(fillLayer);
      refreshFillOcclusionRects(target);
    };
    const overlaySelector = "[data-samey-overlay],[data-samey-overlay-backdrop],[data-samey-overlay-blocker]";
    let visibleOverlays = [];
    let overlayRefreshFrame = 0;
    let fillOcclusionRects = [];
    let fillOcclusionKey = "";
    const overlayIsVisible = (el) => {
      if (!(el instanceof HTMLElement) || !el.isConnected || el.hidden || el.getAttribute("aria-hidden") === "true" || el.dataset.open === "false") return false;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    function refreshFillOcclusionRects(target = fillTarget) {
      const width = Math.max(1, innerWidth);
      const height = Math.max(1, innerHeight);
      const fillZ = target ? fillLayerFor(target) : fillLayer;
      const holes = visibleOverlays
        .filter((overlay) => zIndexOf(overlay) > fillZ)
        .map((overlay) => overlay.getBoundingClientRect())
        .map((rect) => ({
          left: Math.max(0, Math.floor(rect.left - 1)),
          top: Math.max(0, Math.floor(rect.top - 1)),
          right: Math.min(width, Math.ceil(rect.right + 1)),
          bottom: Math.min(height, Math.ceil(rect.bottom + 1)),
        }))
        .filter((rect) => rect.right > rect.left && rect.bottom > rect.top);
      const key = `${width}x${height}@${fillZ}:` + holes.map(({ left, top, right, bottom }) => `${left},${top},${right},${bottom}`).join(";");
      if (key === fillOcclusionKey) return;
      fillOcclusionKey = key;
      fillOcclusionRects = holes;
      if (fillVisible) renderFillSlices();
    }
    const refreshOverlayState = () => {
      overlayRefreshFrame = 0;
      visibleOverlays = [...document.querySelectorAll(overlaySelector)].filter(overlayIsVisible);
      refreshFillOcclusionRects();
      // Re-hit-test the current pointer whenever an overlay opens/closes. The
      // target fill remains active, while higher overlays are subtracted from
      // the blend geometry so translucent/blurred pixels never sample it.
      refreshCursorMode();
    };
    const queueOverlayRefresh = () => {
      if (!overlayRefreshFrame) overlayRefreshFrame = requestAnimationFrame(refreshOverlayState);
    };
    new MutationObserver(queueOverlayRefresh).observe(document.documentElement, {
      subtree: true, childList: true, attributes: true, attributeFilter: ["hidden", "aria-hidden", "data-open"],
    });
    addEventListener("resize", queueOverlayRefresh, { passive: true });
    addEventListener("scroll", queueOverlayRefresh, { passive: true, capture: true });
    queueOverlayRefresh();

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
    const grabPulse = cursor.querySelector(".samey-cursor-grab-pulse");
    const setTextState = (text) => { cursor.toggleAttribute("data-text", !!text); if (text) document.documentElement.dataset.sameyCursorShape = "text"; else if (!cursor.hasAttribute("data-grab")) document.documentElement.dataset.sameyCursorShape = "dot"; };
    const setGrabState = (grab) => {
      const wasGrab = cursor.hasAttribute("data-grab");
      cursor.toggleAttribute("data-grab", grab);
      if (grab) document.documentElement.dataset.sameyCursorShape = "grab"; else if (!cursor.hasAttribute("data-text")) document.documentElement.dataset.sameyCursorShape = "dot";
      if (grab) setTextState(false);
      if (grab && !wasGrab && !matchMedia?.("(prefers-reduced-motion: reduce)").matches && typeof grabPulse?.beginElement === "function") grabPulse.beginElement();
    };
    const holdLinkCursor = (event, link) => {
      if (!link) return;
      linkHandoffUntil = performance.now() + 240;
      if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) placeXY(event.clientX, event.clientY);
      setGrabState(false);
      cursor.removeAttribute("data-grab");
      wakeCursor();
    };

    let nativeDragging = false;
    let selectingText = false;
    let pressedGrab = false;
    let pressedPointerId = null;
    let lastX = 0, lastY = 0;
    let pendingX = 0, pendingY = 0;
    let hasPointerPosition = false;
    let linkHandoffUntil = 0;
    let modifiedLinkPending = null;
    let suppressModifiedClick = null;
    // Pointer position is a compositor-only transform. Updating it directly from
    // pointerrawupdate avoids the extra requestAnimationFrame of latency that the
    // old cursor path added (up to a full display frame), while the more expensive
    // hit-testing/mode work remains on ordinary pointermove events.
    const renderCursorPosition = (x = pendingX, y = pendingY) => {
      lastX = pendingX = x; lastY = pendingY = y;
      cursor.style.transform = `translate3d(${x - 32}px,${y - 32}px,0)`;
    };
    const latestPointerSample = (event) => {
      const samples = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : null;
      return samples?.length ? samples[samples.length - 1] : event;
    };
    const placeXY = (x, y) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      hasPointerPosition = true;
      renderCursorPosition(x, y);
    };
    const place = (event) => {
      const sample = latestPointerSample(event);
      placeXY(sample.clientX, sample.clientY);
    };
    let dragPreviewW = 0, dragPreviewH = 0;
    const placeDragPreview = (x, y) => {
      if (dragPreview.hidden || !Number.isFinite(x) || !Number.isFinite(y)) return;
      const px = Math.max(8, Math.min(innerWidth - dragPreviewW - 8, x - dragPreviewW / 2));
      const py = Math.max(8, Math.min(innerHeight - dragPreviewH - 8, y - dragPreviewH / 2));
      dragPreview.style.transform = `translate3d(${px}px,${py}px,0)`;
    };
    const compactDragText = (value, max = 76) => {
      const text = String(value || "").replace(/\s+/g, " ").trim();
      return text.length > max ? `${text.slice(0, max - 1)}…` : text;
    };
    const showDragPreview = (kind, value, x = pendingX, y = pendingY) => {
      const text = compactDragText(value);
      if (!text) { dragPreview.hidden = true; return; }
      dragPreview.dataset.kind = kind;
      dragPreview.textContent = text;
      dragPreview.hidden = false;
      dragPreviewW = dragPreview.offsetWidth;
      dragPreviewH = dragPreview.offsetHeight;
      placeDragPreview(x, y);
    };
    const hideDragPreview = () => { dragPreview.hidden = true; delete dragPreview.dataset.kind; dragPreview.textContent = ""; };
    const linkDragLabel = (link) => {
      const label = compactDragText(link?.textContent || link?.getAttribute?.("aria-label") || link?.title || "", 56);
      const href = link instanceof HTMLAnchorElement || link instanceof HTMLAreaElement ? link.href : link?.getAttribute?.("href");
      if (!href) return label || "Link";
      try {
        const url = new URL(href, location.href);
        const host = url.origin === location.origin ? url.pathname : url.hostname.replace(/^www\./, "");
        return label ? `${label} · ${host}` : host;
      } catch { return label || "Link"; }
    };
    const fillDot = 16.8;
    let fillTarget = null, fillVisible = false, fillCollapsing = false, fillFrame = 0, fillLastTime = 0;
    let fillX = 0, fillY = 0, fillW = fillDot, fillH = fillDot;
    let wantedFillX = 0, wantedFillY = 0, wantedFillW = fillDot, wantedFillH = fillDot;
    let geometryLink = null, geometryRects = [], geometryBounds = null;
    const subtractRect = (rect, hole) => {
      const left = Math.max(rect.left, hole.left), top = Math.max(rect.top, hole.top);
      const right = Math.min(rect.right, hole.right), bottom = Math.min(rect.bottom, hole.bottom);
      if (right <= left || bottom <= top) return [rect];
      const pieces = [];
      if (rect.top < top) pieces.push({ left: rect.left, top: rect.top, right: rect.right, bottom: top });
      if (bottom < rect.bottom) pieces.push({ left: rect.left, top: bottom, right: rect.right, bottom: rect.bottom });
      if (rect.left < left) pieces.push({ left: rect.left, top, right: left, bottom });
      if (right < rect.right) pieces.push({ left: right, top, right: rect.right, bottom });
      return pieces;
    };
    function renderFillSlices() {
      if (!fillVisible) return;
      let pieces = [{
        left: fillX - fillW / 2,
        top: fillY - fillH / 2,
        right: fillX + fillW / 2,
        bottom: fillY + fillH / 2,
      }];
      for (const hole of fillOcclusionRects) {
        pieces = pieces.flatMap((piece) => subtractRect(piece, hole));
        if (pieces.length === 0) break;
      }
      for (let i = 0; i < pieces.length; i++) {
        const piece = pieces[i];
        const width = piece.right - piece.left, height = piece.bottom - piece.top;
        const slice = ensureFillSlice(i);
        slice.hidden = width <= 0 || height <= 0;
        slice.style.zIndex = String(fillLayer);
        slice.style.transform = `translate3d(${piece.left}px,${piece.top}px,0) scale3d(${width / fillDot},${height / fillDot},1)`;
      }
      for (let i = pieces.length; i < fillSlices.length; i++) fillSlices[i].hidden = true;
    }
    const refreshLinkGeometry = (link) => {
      geometryLink = link;
      geometryRects = link ? [...link.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0) : [];
      geometryBounds = link ? link.getBoundingClientRect() : null;
    };
    const linkRect = (link, force = false) => {
      if (force || geometryLink !== link || !geometryBounds) refreshLinkGeometry(link);
      return geometryRects.find(rect => pendingX >= rect.left && pendingX <= rect.right && pendingY >= rect.top && pendingY <= rect.bottom)
        ?? geometryBounds
        ?? link.getBoundingClientRect();
    };
    const updateFillGoal = (forceGeometry = false) => {
      if (!fillTarget?.isConnected) return setFillTarget(null);
      const rect = linkRect(fillTarget, forceGeometry);
      const insetX = Math.min(8, Math.max(2, rect.width * .04));
      const insetY = Math.min(6, Math.max(1, rect.height * .12));
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      const nx = Math.max(-1, Math.min(1, (pendingX - cx) / Math.max(1, rect.width / 2)));
      const ny = Math.max(-1, Math.min(1, (pendingY - cy) / Math.max(1, rect.height / 2)));
      wantedFillW = Math.max(fillDot, rect.width - insetX * 2);
      wantedFillH = Math.max(fillDot, rect.height - insetY * 2);
      wantedFillX = cx + nx * Math.min(12, wantedFillW * .08);
      wantedFillY = cy + ny * Math.min(8, wantedFillH * .08);
    };
    const renderFill = (time) => {
      fillFrame = 0;
      const reduced = matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const dt = fillLastTime ? Math.min(34, Math.max(1, time - fillLastTime)) : 16.667;
      fillLastTime = time;
      const alpha = (tau) => reduced ? 1 : 1 - Math.exp(-dt / tau);
      // Time-based easing has the same feel at 60/120/144 Hz. Position responds
      // a little faster than size so the blob follows the pointer without the
      // old rubber-band lag, while still expanding/collapsing smoothly.
      const posEase = alpha(fillCollapsing ? 34 : 42);
      const sizeEase = alpha(fillCollapsing ? 42 : 62);
      fillX += (wantedFillX - fillX) * posEase;
      fillY += (wantedFillY - fillY) * posEase;
      fillW += (wantedFillW - fillW) * sizeEase;
      fillH += (wantedFillH - fillH) * sizeEase;
      // Split the animated rectangle around higher overlays. Each fragment is
      // itself the blend element; unlike CSS masks, this preserves `difference`
      // blending in Chromium while keeping translucent overlays untouched.
      renderFillSlices();
      const done = Math.abs(fillX - wantedFillX) < .35 && Math.abs(fillY - wantedFillY) < .35
        && Math.abs(fillW - wantedFillW) < .35 && Math.abs(fillH - wantedFillH) < .35;
      if (fillCollapsing && done) {
        fillVisible = fillCollapsing = false;
        linkFill.hidden = true;
        fillLastTime = 0;
      } else if (!done) fillFrame = requestAnimationFrame(renderFill);
      else fillLastTime = 0;
    };
    const ensureFillFrame = () => { if (!fillFrame) { fillLastTime = 0; fillFrame = requestAnimationFrame(renderFill); } };
    const hideFillImmediate = () => {
      fillTarget = null;
      geometryLink = null; geometryRects = []; geometryBounds = null;
      setFillLayer(null);
      fillVisible = fillCollapsing = false; fillLastTime = 0;
      if (fillFrame) { cancelAnimationFrame(fillFrame); fillFrame = 0; }
      linkFill.hidden = true;
    };
    const cursorIdleMs = 2200;
    const cursorIdleHidingEnabled = () => {
      const root = document.documentElement;
      return root.dataset.siteKind === "keybr"
        || root.dataset.siteKind === "wordle"
        || root.dataset.siteKind === "blog-post";
    };
    let cursorIdleTimer = 0, cursorIdleDeadline = 0;
    const clearCursorIdle = () => {
      cursorIdleDeadline = 0;
      if (cursorIdleTimer) {
        clearTimeout(cursorIdleTimer);
        cursorIdleTimer = 0;
      }
    };
    const hidePointerVisuals = () => {
      setCursorVisible(false);
      hideFillImmediate();
    };
    const runCursorIdle = () => {
      cursorIdleTimer = 0;
      if (!cursorIdleHidingEnabled()) { cursorIdleDeadline = 0; return; }
      if (!cursorIdleDeadline) return;
      const remaining = cursorIdleDeadline - performance.now();
      if (remaining > 1) { cursorIdleTimer = window.setTimeout(runCursorIdle, remaining); return; }
      cursorIdleDeadline = 0;
      if (!nativeDragging && !cursorLoading) hidePointerVisuals();
    };
    const armCursorIdle = () => {
      if (!cursorIdleHidingEnabled()) { clearCursorIdle(); return; }
      cursorIdleDeadline = performance.now() + cursorIdleMs;
      // Do not clear/create a timeout on every raw pointer sample. Updating the
      // deadline is enough; one timer follows it until movement really stops.
      if (!cursorIdleTimer) cursorIdleTimer = window.setTimeout(runCursorIdle, cursorIdleMs);
    };
    const wakeCursor = () => {
      if (nativeDragging || cursorLoading) return;
      setCursorVisible(true);
      armCursorIdle();
    };
    const syncCursorIdlePolicy = () => {
      if (cursorIdleHidingEnabled()) {
        if (cursorVisible) armCursorIdle();
        return;
      }
      clearCursorIdle();
      if (!hasPointerPosition || nativeDragging || cursorLoading) return;
      setCursorVisible(true);
      refreshCursorMode();
    };
    addEventListener("samey-pageload", syncCursorIdlePolicy);
    addEventListener("samey-solid-routechange", syncCursorIdlePolicy);
    function setFillTarget(link) {
      if (!link) {
        fillTarget = null;
        setFillLayer(null);
        if (!fillVisible) return;
        fillCollapsing = true;
        wantedFillX = pendingX; wantedFillY = pendingY; wantedFillW = wantedFillH = fillDot;
        ensureFillFrame();
        return;
      }
      if (!fillVisible) {
        fillX = wantedFillX = pendingX; fillY = wantedFillY = pendingY; fillW = fillH = fillDot;
        fillVisible = true; linkFill.hidden = false;
      }
      if (fillTarget !== link) refreshLinkGeometry(link);
      fillTarget = link; fillCollapsing = false; linkFill.hidden = false;
      updateFillGoal();
      ensureFillFrame();
    }
    const textInput = (target) => target instanceof HTMLTextAreaElement
      || target instanceof HTMLInputElement && !["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"].includes(target.type);
    const wantsText = (target) => {
      if (!(target instanceof Element) || linkTarget(target) || target.closest('button,select,option,summary,[role=button],[role=slider],[role=checkbox],[role=switch],[role=radio],[role=radiogroup],[role=menu],[role=menuitem],[data-grab-cursor],[data-cursor-round]')) return false;
      if (textInput(target) || target.closest('[contenteditable="true"],[contenteditable="plaintext-only"]')) return true;
      // A text-cursor zone makes prose-like regions behave as one selectable
      // surface. Interactive descendants above override it and keep their
      // normal round/link cursor semantics.
      if (target.closest('[data-text-cursor-zone]')) return true;
      const style = getComputedStyle(target);
      if (style.userSelect === "none") return false;
      if (style.cursor === "text" || style.cursor === "vertical-text") return true;
      if (!target.textContent?.trim()) return false;
      const pos = document.caretPositionFromPoint?.(pendingX, pendingY);
      const fallback = pos ? null : document.caretRangeFromPoint?.(pendingX, pendingY);
      const node = pos?.offsetNode ?? fallback?.startContainer;
      const caretOffset = pos?.offset ?? fallback?.startOffset;
      if (!(node instanceof Text) || !target.contains(node.parentElement) || !node.data || caretOffset == null) return false;
      const range = document.createRange();
      const offset = Math.max(0, Math.min(node.length - 1, caretOffset === node.length ? caretOffset - 1 : caretOffset));
      range.setStart(node, offset);
      range.setEnd(node, Math.min(node.length, offset + 1));
      const rect = range.getBoundingClientRect();
      return rect.height > 0 && pendingX >= rect.left - 5 && pendingX <= rect.right + 5 && pendingY >= rect.top - 2 && pendingY <= rect.bottom + 2;
    };
    let grabModeTarget = null, grabModeValue = false;
    const wantsGrabCached = (target) => {
      if (target === grabModeTarget) return grabModeValue;
      grabModeTarget = target;
      return grabModeValue = wantsGrab(target);
    };
    const setMode = (target) => {
      const grab = nativeDragging || pressedGrab || (!selectingText && wantsGrabCached(target));
      const link = grab || selectingText ? null : linkTarget(target);
      const text = !grab && (selectingText || !link && wantsText(target));
      if (cursorMode !== "invert") {
        if (cursorMode === "hardware") document.documentElement.dataset.sameyCursorShape = grab ? "grab" : text ? "text" : "dot";
        updateBlendSource(target);
        setFillLayer(link);
        setFillTarget(link);
        return;
      }
      updateBlendSource(target);
      setFillLayer(link);
      setGrabState(grab);
      setTextState(text);
      setFillTarget(link);
    };
    refreshCursorMode = () => cursorMode !== "invert" && hasPointerPosition
      ? setMode(document.elementFromPoint(pendingX, pendingY))
      : cursorVisible
        ? setMode(document.elementFromPoint(pendingX, pendingY))
        : setFillTarget(null);
    const syncCursorPresentation = (theme = read()) => {
      cursorMode = theme.cursorMode;
      document.documentElement.dataset.cursorMode = cursorMode;
      document.documentElement.classList.toggle("samey-custom-cursor", cursorMode === "invert");
      document.documentElement.classList.toggle("samey-hardware-cursor", cursorMode === "hardware");
      document.documentElement.classList.toggle("samey-native-cursor", cursorMode === "native");
      applyHardwareCursorTheme(document.documentElement, theme);
      cursor.hidden = cursorMode !== "invert";
      if (cursorMode !== "invert") setCursorVisible(false);
      if (cursorMode !== "invert" && hasPointerPosition) setMode(document.elementFromPoint(pendingX, pendingY));
      if (cursorMode === "invert" && hasPointerPosition && !nativeDragging) { setCursorVisible(true); setMode(document.elementFromPoint(pendingX, pendingY)); armCursorIdle(); }
    };
    addEventListener("samey-themechange", (event) => syncCursorPresentation(event.detail || read()));
    syncCursorPresentation(read());
    const hasRawPointer = "onpointerrawupdate" in window;
    const moveCursorOnly = (event) => {
      if (cursorMode !== "invert" || nativeDragging) return;
      // pointerrawupdate is already the freshest sample the browser exposes. Keep
      // this handler brutally small: no coalesced-event array, hit testing, style
      // reads, timers, or cursor-mode work. A single compositor-only transform is
      // the only per-sample DOM mutation.
      const x = event.clientX, y = event.clientY;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      hasPointerPosition = true;
      lastX = pendingX = x; lastY = pendingY = y;
      cursor.style.transform = `translate3d(${x - 32}px,${y - 32}px,0)`;
      // Waking is normally handled by the lower-frequency pointermove event. If
      // idle hiding left the cursor invisible, expose the already-positioned layer
      // immediately without dragging idle/mode bookkeeping onto the raw path.
      if (!cursorVisible && !cursorLoading) setCursorVisible(true);
    };
    const moveCursorFallback = (event) => {
      if (cursorMode !== "invert") return;
      if (nativeDragging) { hidePointerVisuals(); return; }
      // Raw samples normally arrive first. pointermove still catches up for input
      // sources that do not emit pointerrawupdate, and also owns the low-frequency
      // visibility/idle bookkeeping. Cursor mode is intentionally *not* recomputed
      // here; pointerover already tells us when the hit-tested target changes.
      if (!hasRawPointer || event.clientX !== pendingX || event.clientY !== pendingY) place(event);
      wakeCursor();
    };
    const refreshPointerTarget = (event) => {
      if (cursorMode !== "invert") { const x=event.clientX,y=event.clientY; if (Number.isFinite(x)&&Number.isFinite(y)) { hasPointerPosition=true; lastX=pendingX=x; lastY=pendingY=y; } setMode(event.target instanceof Element ? event.target : elementAt(event)); return; }
      if (nativeDragging) { hidePointerVisuals(); return; }
      place(event);
      setMode(event.target instanceof Element ? event.target : elementAt(event));
    };

    if (hasRawPointer) document.addEventListener("pointerrawupdate", moveCursorOnly, { capture: true, passive: true });
    document.addEventListener("pointermove", moveCursorFallback, { capture: true, passive: true });
    document.addEventListener("pointerover", refreshPointerTarget, { capture: true, passive: true });
    addEventListener("scroll", () => { if (fillTarget) { updateFillGoal(true); ensureFillFrame(); } }, { passive: true, capture: true });
    addEventListener("resize", () => { if (fillTarget) { updateFillGoal(true); ensureFillFrame(); } }, { passive: true });
    addEventListener("samey-pageleave", () => setFillTarget(null));
    document.addEventListener("pointerdown", (event) => {
      document.documentElement.style.setProperty("--samey-dialog-origin-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--samey-dialog-origin-y", `${event.clientY}px`);
      const actual = elementAt(event);
      const pressedLink = linkTarget(actual);
      const modifiedLink = pressedLink && (event.ctrlKey || event.metaKey || event.button === 1);
      pressedPointerId = event.pointerId;
      pressedGrab = !!actual?.closest?.(pressedGrabSelector);
      place(event);
      wakeCursor();
      selectingText = event.button === 0 && !pressedGrab && !pressedLink && wantsText(actual);
      setMode(actual);
      if (modifiedLink) {
        event.preventDefault();
        modifiedLinkPending = pressedLink;
        suppressModifiedClick = pressedLink;
        holdLinkCursor(event, pressedLink);
      }
    }, true);
    document.addEventListener("pointerup", (event) => {
      selectingText = false;
      hideDragPreview();
      if (pressedPointerId === event.pointerId) { pressedPointerId = null; pressedGrab = false; }
      if (modifiedLinkPending instanceof HTMLAnchorElement && modifiedLinkPending.href) {
        const link = modifiedLinkPending;
        modifiedLinkPending = null;
        holdLinkCursor(event, link);
        window.open(link.href, "_blank", "noopener,noreferrer");
      }
      place(event);
      wakeCursor();
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
      if (link instanceof HTMLAnchorElement && link.href) window.open(link.href, "_blank", "noopener,noreferrer");
    }, true);
    const selectedEditableText = (target) => {
      const editable = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
        ? target
        : target instanceof Element ? target.closest("input,textarea") : null;
      if (!(editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement)) return "";
      const start = editable.selectionStart, end = editable.selectionEnd;
      return Number.isInteger(start) && Number.isInteger(end) && end > start ? editable.value.slice(start, end) : "";
    };
    const setNativeDragImage = (event, kind, text) => {
      if (!event.dataTransfer || !text) return;
      const x = Number.isFinite(event.clientX) && event.clientX ? event.clientX : lastX;
      const y = Number.isFinite(event.clientY) && event.clientY ? event.clientY : lastY;
      showDragPreview(kind, text, x, y);
      event.dataTransfer.setDragImage(dragPreview, Math.round(dragPreviewW / 2), Math.round(dragPreviewH / 2));
      requestAnimationFrame(hideDragPreview);
    };
    const startNativeDrag = (event) => {
      const link = linkTarget(event.target);
      const text = selectedEditableText(event.target) || (!link ? getSelection()?.toString() || "" : "");
      if (link) setNativeDragImage(event, "link", linkDragLabel(link));
      else if (text) setNativeDragImage(event, "text", text);
      nativeDragging = true;
      selectingText = false;
      pressedGrab = false;
      pressedPointerId = null;
      setGrabState(false);
      setTextState(false);
      // Native drag-and-drop owns the pointer presentation from here. Freeze
      // our logical coordinates at the point where the grab cursor handed off
      // instead of accepting the 0,0 sentinel coordinates Chromium can emit
      // while the system drag cursor is active.
      clearCursorIdle();
      hidePointerVisuals();
    };
    document.addEventListener("dragstart", startNativeDrag, true);
    document.addEventListener("dragenter", () => { nativeDragging = true; clearCursorIdle(); hidePointerVisuals(); }, true);
    document.addEventListener("dragover", () => { nativeDragging = true; clearCursorIdle(); hidePointerVisuals(); }, true);
    const stopDragging = () => {
      nativeDragging = false;
      selectingText = false;
      pressedGrab = false;
      pressedPointerId = null;
      modifiedLinkPending = null;
      suppressModifiedClick = null;
      hideDragPreview();
      setGrabState(false);
      setTextState(false);
      // Stay hidden after the native/system cursor releases control. The next
      // real pointer move provides trustworthy coordinates and wakes the
      // virtual cursor at that position.
      hidePointerVisuals();
    };
    document.addEventListener("dragend", stopDragging, true);
    document.addEventListener("drop", stopDragging, true);
    addEventListener("pointercancel", stopDragging, true);
    addEventListener("blur", stopDragging);
    addEventListener("pointerout", (event) => { if (!event.relatedTarget && !nativeDragging && performance.now() >= linkHandoffUntil) { clearCursorIdle(); hidePointerVisuals(); } });
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
      document.body.append(area);
      try { area.select(); document.execCommand("copy"); } finally { area.remove(); }
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
    for (const record of records) for (const node of record.addedNodes) if (node instanceof Element && !node.closest?.(".monaco-host, .monaco-editor, .monaco-diff-editor")) stampLinkCopyLabels(node);
  }).observe(document.documentElement, { childList: true, subtree: true });

  const mountContextMenu = () => {
    if (document.getElementById("samey-context-menu")) return;
    const menu = runtimeNode(document.createElement("div"));
    menu.id = "samey-context-menu"; menu.className = "samey-context-menu"; menu.dataset.sameyOverlayBlocker = ""; menu.hidden = true;
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
      event.preventDefault();
      target = event.target; menu.replaceChildren();
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
  const virtualScrollerOptOut = (target) => target instanceof Element && !!target.closest("[data-samey-runtime], .monaco-host, .monaco-editor, .monaco-diff-editor, [data-samey-native-scrollbars]");
  const virtualScrollerEligible = (target) => {
    if (target === document.scrollingElement) return true;
    if (!(target instanceof Element) || !target.isConnected || virtualScrollerOptOut(target)) return false;
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
      for (const target of targets) if (target instanceof Element && !virtualScrollerOptOut(target)) pending.add(target);
      if (scanRaf || !pending.size) return;
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
    }).observe(document.body, { subtree: true, childList: true });
    new ResizeObserver(() => { scheduleVirtualBars(); scheduleTargets([document.body]); }).observe(document.documentElement);
    addEventListener("resize", () => { scheduleVirtualBars(); scheduleTargets([document.body]); });
    addEventListener("scroll", scheduleVirtualBars, true);
  };

  const hashTarget = url => { if (!url.hash) return ""; try { return decodeURIComponent(url.hash.slice(1)); } catch { return url.hash.slice(1); } };
  const pageStyleNodes = () => [...document.head.children].filter(el => (el.tagName === "STYLE" || (el.tagName === "LINK" && el.rel === "stylesheet")) && !el.hasAttribute("data-samey-shared"));
  const markInitialPageStyles = () => pageStyleNodes().forEach(el => el.dataset.spaPage = "");
  const pageCache = new Map();
  const reducedMotion = () => matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const setLoading = value => {
    globalThis.SameyLoading?.(!!value);
    // Lazy navigation never covers the current page with a transient loading card.
    // The existing page stays painted until the replacement is fully ready while
    // the shared top strip and cursor communicate pending work.
    document.getElementById("samey-loading-layer")?.removeAttribute("data-visible");
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
  const logicalPageUrl = url => {
    const logical = new URL(url.href);
    if (logical.pathname.endsWith("/blog")) logical.pathname += "/index.html";
    else if (logical.pathname.endsWith("/")) logical.pathname += "index.html";
    else if (!/\.[a-z0-9]+$/i.test(logical.pathname)) logical.pathname += ".html";
    return logical;
  };
  const fetchPage = async url => {
    const key = url.href;
    if (pageCache.has(key)) return pageCache.get(key);
    const task = (async () => {
      const logical = logicalPageUrl(url);
      const response = await fetch(logical, { headers: { "X-Samey-SPA": "1" } });
      if (!response.ok) throw new Error("page fetch failed");
      const doc = new DOMParser().parseFromString(await response.text(), "text/html");
      const baseTag = doc.querySelector("base[href]")?.getAttribute("href");
      const baseUrl = new URL(baseTag || ".", logical.href);
      return { doc, baseUrl, responseUrl: logical.href };
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
  const runHeadScripts = (doc, baseUrl) => {
    document.head.querySelectorAll("script[data-spa-page-script]").forEach(script => script.remove());
    for (const old of [...doc.head.querySelectorAll("script")]) {
      const source = old.getAttribute("src");
      const resolved = source ? new URL(source, baseUrl).href : "";
      if (resolved && /\/shared-runtime\.js(?:[?#]|$)/.test(resolved)) continue;
      const fresh = document.createElement("script");
      for (const attr of old.attributes) if (attr.name !== "src") fresh.setAttribute(attr.name, attr.value);
      fresh.dataset.spaPageScript = "";
      if (resolved) fresh.src = resolved; else fresh.textContent = old.textContent;
      document.head.append(fresh);
    }
  };
  const clearPageBody = () => {
    const runtimeAnchor = document.body.querySelector("[data-samey-runtime]");
    for (const child of [...document.body.children]) if (!child.hasAttribute("data-samey-runtime")) child.remove();
    return runtimeAnchor;
  };
  let currentPagePath = location.pathname;
  const swapPage = (doc, baseUrl, url, replace) => {
    try { globalThis.SameyToolsDispose?.(); delete globalThis.SameyToolsDispose; } catch {}
    try { globalThis.SameySolidDispose?.(); } catch {}
    try { globalThis.SameyWordleDispose?.(); } catch {}
    try { globalThis.SameyKeybrDispose?.(); } catch {}
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
    const runtimeAnchor = clearPageBody();
    for (const child of [...doc.body.children]) document.body.insertBefore(document.importNode(child, true), runtimeAnchor);
    document.title = doc.title; syncHtmlData(doc, baseUrl);
    currentPagePath = url.pathname;
    (replace ? replaceState : pushState)({}, "", url.href);
    runBodyScripts(baseUrl);
    runHeadScripts(doc, baseUrl);
    queueMicrotask(() => globalThis.SameyMountSolid?.());
    apply(); scanVirtualScrollers();
    if (!url.hash) scrollTo({ top: 0, left: 0, behavior: "instant" });
    else queueMicrotask(() => document.getElementById(hashTarget(url))?.scrollIntoView());
    dispatchEvent(new CustomEvent("samey-pageload", { detail: { url: url.href } }));
  };
  const destinationRoot = () => {
    // Keybr's application root is the upstream #app element. Keeping this
    // knowledge here is important: page swaps need a real incoming root to
    // animate, otherwise Keybr waits out the root timeout and appears to hang
    // or snap in with no transition.
    if (document.documentElement.dataset.siteKind === 'keybr') return document.getElementById('app');
    if (document.documentElement.hasAttribute('data-static-article')) return document.querySelector('.article-route');
    return document.querySelector('#solid-site-app,[data-wordle-root],.site-route,.article-route');
  };
  const waitForDestinationRoot = async () => {
    for (let i = 0; i < 90; i++) {
      const root = destinationRoot();
      if (root && root.childElementCount > 0) return root;
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    throw new Error(`The ${document.documentElement.dataset.siteKind || 'destination'} application did not mount.`);
  };
  const dismissLoadError = () => document.getElementById("samey-load-error")?.remove();
  const showLoadError = (url, error, retry) => {
    dismissLoadError();
    const panel = runtimeNode(document.createElement("aside"));
    panel.id = "samey-load-error";
    panel.className = "samey-load-error";
    panel.setAttribute("role", "alert");
    const message = error instanceof Error ? error.message : "The page could not be loaded.";
    panel.innerHTML = `<div><strong>Page failed to load</strong><span></span></div><div class="samey-load-error-actions"><button type="button" data-retry>Retry</button><a>Open normally</a><button type="button" data-dismiss>Dismiss</button></div>`;
    panel.querySelector("span").textContent = message;
    const normal = panel.querySelector("a");
    normal.href = url.href;
    panel.querySelector("[data-retry]").addEventListener("click", () => { dismissLoadError(); void retry(); });
    panel.querySelector("[data-dismiss]").addEventListener("click", dismissLoadError);
    document.body.append(panel);
  };
  let pageNavigationId = 0;
  const cancelPageNavigation = () => { pageNavigationId++; setLoading(false); };
  globalThis.SameyCancelPageSwap = cancelPageNavigation;
  const loadPage = async (href, { replace = false, force = false } = {}) => {
    const id = ++pageNavigationId;
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) { location.href = url.href; return; }
    dismissLoadError();
    if (!force && url.href === location.href) { setLoading(false); return; }
    setLoading(true);
    try {
      const { doc, baseUrl } = await fetchPage(url);
      if (id !== pageNavigationId) return;
      const current = destinationRoot();
      const commit = async () => {
        swapPage(doc, baseUrl, url, replace);
        await waitForDestinationRoot();
        // Boot overlays listen to window.load on direct navigation, but that
        // event has already happened during an in-document root swap.
        document.getElementById("samey-boot")?.remove();
        document.getElementById("samey-boot-style")?.remove();
      };
      await animateRootSwap(current, commit, destinationRoot, url.pathname === '/' || /\/index(?:\.html)?$/.test(url.pathname) ? 'back' : 'forward');
    } catch (error) {
      if (id !== pageNavigationId) return;
      showLoadError(url, error, () => loadPage(url.href, { replace, force }));
      throw error;
    } finally {
      if (id === pageNavigationId) setLoading(false);
    }
  };
  globalThis.SameyPageSwapNavigate = (href, opts) => loadPage(href, opts);
  globalThis.SameyAnimateLocalSwap = (root, commit, direction = 'forward') => animateRootSwap(root, commit, () => root, direction);
  const shouldSpa = url => url.origin === location.origin;
  const prefetch = href => {
    const url = new URL(href, location.href);
    if (!shouldSpa(url)) return;
    fetchPage(url).catch(() => {});
  };
  globalThis.SameyPreloadPage = prefetch;
  let documentNavigationMounted = false;
  const mountSpa = () => {
    if (document.documentElement.hasAttribute("data-solid-spa")) return;
    globalThis.SameyNavigate = (href, opts) => loadPage(href, opts);
    if (documentNavigationMounted) return;
    documentNavigationMounted = true;
    document.addEventListener("pointerover", event => { if (document.documentElement.hasAttribute("data-solid-spa")) return; const a = event.target.closest?.("a[href]"); if (a && !a.target) prefetch(a.href); }, { passive: true });
    document.addEventListener("focusin", event => { if (document.documentElement.hasAttribute("data-solid-spa")) return; const a = event.target.closest?.("a[href]"); if (a && !a.target) prefetch(a.href); });
    document.addEventListener("click", event => {
      if (document.documentElement.hasAttribute("data-solid-spa")) return;
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const a = event.target.closest?.("a[href]"); if (!a || a.target || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (!shouldSpa(url) || url.hash && url.pathname === location.pathname && url.search === location.search) return;
      event.preventDefault(); void loadPage(url.href).catch(() => {});
    });
    addEventListener("popstate", () => {
      if (document.documentElement.hasAttribute("data-solid-spa") || location.pathname === currentPagePath) return;
      void loadPage(location.href, { replace: true, force: true }).catch(() => {});
    });
  };

  addEventListener("storage", (event) => { if (event.key === KEY || event.key === FONT_KEY) apply(); });
  matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    const raw = rawPrefs();
    if (!raw.color || raw.color === "system") apply();
  });
  apply();
  const mountRuntime = () => {
    normalizeExternalLinks(); observeExternalLinks(); mountControls(); mountLoadingBar(); mountCursor(); mountContextMenu(); mountVirtualScrollbars();
    // Only styles present on a directly loaded non-Solid document are initial page styles.
    // Styles that survive a Solid -> game/article swap can include runtime-loaded Monaco CSS;
    // marking those on the first swapped page would delete them on the next back navigation.
    if (!document.documentElement.hasAttribute("data-solid-spa")) markInitialPageStyles();
    mountSpa();
    addEventListener("samey-pageload", mountSpa);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountRuntime, { once: true });
  else mountRuntime();
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register(new URL("sw.js", SCRIPT_ROOT).href).catch(() => {});
})();
