(function() {
	//#endregion
	//#region src/shared/appearance.ts
	Object.defineProperty(globalThis, "SameyAppearanceConfig", {
		value: Object.freeze({
			colors: {
				"light": {
					"label": "Light",
					"tone": "light",
					"background": "#ffffff",
					"text": "#121213",
					"accent": "#787c7e",
					"error": "#ff3333",
					"slow": "#cc0000",
					"fast": "#60d788",
					"effort": "#6699ff"
				},
				"clear-light": {
					"label": "Clear light",
					"tone": "light",
					"background": "#faf9f8",
					"text": "#202332",
					"accent": "#355d82",
					"error": "#c43d46",
					"slow": "#aa2832",
					"fast": "#267549",
					"effort": "#365f9c"
				},
				"dark": {
					"label": "Dark",
					"tone": "dark",
					"background": "#121213",
					"text": "#f8f8f8",
					"accent": "#a7a7a7",
					"error": "#9b4545",
					"slow": "#8c1818",
					"fast": "#448154",
					"effort": "#2d4a86"
				},
				"clear-dark": {
					"label": "Clear dark",
					"tone": "dark",
					"background": "#303237",
					"text": "#b0b4bd",
					"accent": "#7c9fc4",
					"error": "#e2848b",
					"slow": "#e2848b",
					"fast": "#69aa80",
					"effort": "#80a1c5"
				}
			},
			fonts: {
				"sans-serif": {
					"label": "Sans serif",
					"stack": "system-ui,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
				},
				"serif": {
					"label": "Serif",
					"stack": "ui-serif,Georgia,Cambria,\"Times New Roman\",serif"
				},
				"monospace": {
					"label": "Monospace",
					"stack": "ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,\"Liberation Mono\",monospace"
				},
				"cursive": {
					"label": "Cursive",
					"stack": "cursive"
				}
			}
		}),
		configurable: false,
		writable: false
	});
	//#endregion
	//#region src/shared/transitions.ts
	var reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
	var nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
	var twoFrames = async () => {
		await nextFrame();
		await nextFrame();
	};
	/** One motion contract for every page/view swap in the site. */
	var PAGE_TRANSITION = {
		duration: 260,
		leaveRatio: 180 / 260,
		enterEasing: "cubic-bezier(.22,1,.36,1)",
		leaveEasing: "cubic-bezier(.4,0,.2,1)",
		opacity: .15,
		clip: "inset(4% 4% round 12px)",
		forwardScale: .955,
		backScale: .985,
		leaveScale: 1.02
	};
	var leaveDuration = () => Math.round(PAGE_TRANSITION.duration * PAGE_TRANSITION.leaveRatio);
	var startScale = (direction) => `scale(${direction === "back" ? PAGE_TRANSITION.backScale : PAGE_TRANSITION.forwardScale})`;
	function snapshotElement(element) {
		const rect = element.getBoundingClientRect();
		const shell = document.createElement("div");
		shell.className = "samey-route-snapshot";
		shell.setAttribute("aria-hidden", "true");
		shell.inert = true;
		shell.style.setProperty("--snapshot-top", `${rect.top}px`);
		shell.style.setProperty("--snapshot-left", `${rect.left}px`);
		shell.style.setProperty("--snapshot-width", `${rect.width}px`);
		shell.style.setProperty("--snapshot-height", `${rect.height}px`);
		const clone = element.cloneNode(true);
		clone.removeAttribute("id");
		clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
		clone.querySelectorAll("[aria-controls],[aria-labelledby],[aria-describedby]").forEach((node) => {
			node.removeAttribute("aria-controls");
			node.removeAttribute("aria-labelledby");
			node.removeAttribute("aria-describedby");
		});
		const originals = [element, ...element.querySelectorAll("*")];
		const copies = [clone, ...clone.querySelectorAll("*")];
		for (let i = 0; i < Math.min(originals.length, copies.length); i++) {
			const source = originals[i], target = copies[i];
			target.scrollTop = source.scrollTop;
			target.scrollLeft = source.scrollLeft;
			if (source instanceof HTMLInputElement && target instanceof HTMLInputElement) {
				target.value = source.value;
				target.checked = source.checked;
			} else if (source instanceof HTMLTextAreaElement && target instanceof HTMLTextAreaElement) target.value = source.value;
			else if (source instanceof HTMLSelectElement && target instanceof HTMLSelectElement) target.selectedIndex = source.selectedIndex;
			else if (source instanceof HTMLCanvasElement && target instanceof HTMLCanvasElement) {
				target.width = source.width;
				target.height = source.height;
				try {
					target.getContext("2d")?.drawImage(source, 0, 0);
				} catch {}
			}
		}
		shell.append(clone);
		document.body.append(shell);
		return shell;
	}
	function primeIncoming(element, direction) {
		element.style.opacity = String(PAGE_TRANSITION.opacity);
		element.style.transform = startScale(direction);
		element.style.clipPath = PAGE_TRANSITION.clip;
	}
	function animateIncoming(element, direction) {
		return element.animate([{
			opacity: PAGE_TRANSITION.opacity,
			transform: startScale(direction),
			clipPath: PAGE_TRANSITION.clip
		}, {
			opacity: 1,
			transform: "scale(1)",
			clipPath: "inset(0 round 0)"
		}], {
			duration: PAGE_TRANSITION.duration,
			easing: PAGE_TRANSITION.enterEasing,
			fill: "both"
		});
	}
	function animateOutgoing(element) {
		return element.animate([{
			opacity: 1,
			transform: "scale(1)"
		}, {
			opacity: 0,
			transform: `scale(${PAGE_TRANSITION.leaveScale})`
		}], {
			duration: leaveDuration(),
			easing: PAGE_TRANSITION.leaveEasing,
			fill: "both"
		});
	}
	function clearIncoming(element) {
		element.style.opacity = "";
		element.style.transform = "";
		element.style.clipPath = "";
		element.style.pointerEvents = "";
	}
	async function animateRootSwap(current, commit, next, direction = "forward") {
		if (!current || reducedMotion() || !current.animate) {
			await commit();
			return;
		}
		const snapshot = snapshotElement(current);
		try {
			await commit();
		} catch (error) {
			snapshot.remove();
			throw error;
		}
		await Promise.resolve();
		let incoming = next();
		if (!incoming || incoming === current || !incoming.isConnected) {
			await nextFrame();
			incoming = next();
		}
		if (incoming) primeIncoming(incoming, direction);
		await twoFrames();
		const enter = incoming?.animate ? animateIncoming(incoming, direction) : void 0;
		const leave = animateOutgoing(snapshot);
		await Promise.allSettled([leave.finished, enter?.finished ?? Promise.resolve()]);
		snapshot.remove();
		enter?.cancel();
		if (incoming) clearIncoming(incoming);
	}
	//#endregion
	//#region src/shared/loadingSvg.ts
	var loadingGeometry = Object.freeze({
		size: 64,
		cx: 32,
		cy: 32,
		baseRadius: 8.4,
		amplitude: 1.35,
		waves: 6,
		duration: .72,
		zeroCrossingPower: .72,
		points: 96,
		frames: 25
	});
	var framesCache;
	function generateLoadingFrames() {
		if (framesCache) return framesCache;
		const { cx, cy, baseRadius, amplitude, waves, zeroCrossingPower, points, frames } = loadingGeometry;
		framesCache = Array.from({ length: frames }, (_, frame) => {
			const progress = frame / (frames - 1);
			const raw = Math.cos(progress * Math.PI * 2);
			const multiplier = Math.sign(raw) * Math.pow(Math.abs(raw), zeroCrossingPower);
			let d = "";
			for (let i = 0; i <= points; i++) {
				const angle = i / points * Math.PI * 2;
				const radius = baseRadius + amplitude * multiplier * Math.sin(waves * angle);
				const x = cx + radius * Math.cos(angle);
				const y = cy + radius * Math.sin(angle);
				d += `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
			}
			return d + "Z";
		});
		return framesCache;
	}
	function generateAnimatedSineCircleSvg() {
		const paths = generateLoadingFrames();
		const keyTimes = paths.map((_, i) => (i / (paths.length - 1)).toFixed(6)).join(";");
		return `<svg class="samey-cursor-loading" xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="${paths[0]}"><animate attributeName="d" dur="${loadingGeometry.duration}s" repeatCount="indefinite" calcMode="linear" keyTimes="${keyTimes}" values="${paths.join(";")}"/></path></svg>`;
	}
	//#endregion
	//#region src/shared/theme.ts
	(() => {
		const SCRIPT_ROOT = new URL(".", document.currentScript?.src || location.href);
		const KEY = "keybr.theme";
		const FONT_KEY = "samey.font";
		const config = globalThis.SameyAppearanceConfig;
		if (config == null) throw new Error("Shared appearance config is not loaded");
		const colors = config.colors;
		const COLOR_IDS = [...Object.keys(colors), "custom"];
		const FONT_IDS = Object.keys(config.fonts);
		const colorLabels = {
			system: "System",
			...Object.fromEntries(Object.entries(colors).map(([id, value]) => [id, value.label]))
		};
		const fontLabels = Object.fromEntries(Object.entries(config.fonts).map(([id, value]) => [id, value.label]));
		const fontStacks = Object.fromEntries(Object.entries(config.fonts).map(([id, value]) => [id, value.stack]));
		const validHex = (value) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
		const mix = (a, b, weight) => {
			const rgb = (value) => [
				1,
				3,
				5
			].map((i) => parseInt(value.slice(i, i + 2), 16));
			const aa = rgb(a), bb = rgb(b);
			return "#" + aa.map((value, i) => Math.round(value * (1 - weight) + bb[i] * weight).toString(16).padStart(2, "0")).join("");
		};
		const hsl = (hex) => {
			let [r, g, b] = [
				1,
				3,
				5
			].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
			const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
			if (max === min) return `0 0% ${+(l * 100).toFixed(2)}%`;
			const d = max - min;
			const s = l > .5 ? d / (2 - max - min) : d / (max + min);
			return `${+((max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6 * 360).toFixed(2)} ${+(s * 100).toFixed(2)}% ${+(l * 100).toFixed(2)}%`;
		};
		let volatileThemePrefs = {};
		let volatileFont;
		const rawPrefs = () => {
			let stored = {};
			try {
				stored = JSON.parse(localStorage.getItem(KEY) || "null") || {};
			} catch {}
			return {
				...stored,
				...volatileThemePrefs
			};
		};
		const readFont = () => {
			if (FONT_IDS.includes(volatileFont)) return volatileFont;
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
			if ([
				"gray",
				"yellow",
				"garden",
				"coffee",
				"honey"
			].includes(value)) return "light";
			return value === "system" || COLOR_IDS.includes(value) ? value : "system";
		};
		const read = () => {
			const raw = rawPrefs();
			const selected = migrateColor(raw.color);
			let color = selected;
			if (color === "system") color = matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
			const font = readFont();
			if (color !== "custom") return {
				color,
				selected: selected || "system",
				font,
				...colors[color],
				custom: { ...colors[color] }
			};
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
					effort: validHex(custom.effort) ? custom.effort.toLowerCase() : fallback.effort
				}
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
				"--syntax-comment": "#9f8484"
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
				if (theme.color === "custom") for (const [name, value] of Object.entries(keybrCustomProperties(theme))) root.style.setProperty(name, value);
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
			}
			document.querySelectorAll("[data-theme-choice]").forEach((el) => el.toggleAttribute("data-selected", el.dataset.themeChoice === theme.selected));
			document.querySelectorAll("[data-font-choice]").forEach((el) => el.toggleAttribute("data-selected", el.dataset.fontChoice === theme.font));
			notify(theme);
			return theme;
		};
		const setPrefs = (patch) => {
			if (Object.hasOwn(patch, "font")) try {
				nativeSetItem.call(localStorage, FONT_KEY, patch.font);
				volatileFont = void 0;
			} catch {
				volatileFont = patch.font;
			}
			const themePatch = { ...patch };
			delete themePatch.font;
			if (Object.keys(themePatch).length > 0) {
				const { font: _legacyFont, ...theme } = rawPrefs();
				const next = {
					...theme,
					...themePatch
				};
				try {
					nativeSetItem.call(localStorage, KEY, JSON.stringify(next));
					volatileThemePrefs = {};
				} catch {
					volatileThemePrefs = next;
				}
			}
			apply();
		};
		const appearance = Object.freeze({
			get: read,
			set: setPrefs,
			apply,
			themeIds: Object.freeze(["system", ...COLOR_IDS]),
			fontIds: Object.freeze([...FONT_IDS])
		});
		Object.defineProperty(globalThis, "SameyAppearance", {
			value: appearance,
			configurable: false,
			writable: false
		});
		const section = (title, items, attr) => `<div class="samey-panel-title">${title}</div>${Object.entries(items).map(([value, label]) => `<button type="button" ${attr}="${value}">${label}</button>`).join("")}`;
		let appearancePanel = null;
		let appearanceTrigger = null;
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
			appearancePanel.hidden = false;
			positionAppearancePanel(trigger);
		};
		const mountControls = () => {
			if (appearancePanel) return;
			const panel = document.createElement("div");
			panel.id = "samey-theme-panel";
			panel.className = "samey-theme-panel";
			panel.dataset.sameyRuntime = "";
			panel.hidden = true;
			panel.innerHTML = section("Theme", colorLabels, "data-theme-choice") + section("Font", fontLabels, "data-font-choice");
			panel.addEventListener("click", (event) => {
				const themeButton = event.target.closest("[data-theme-choice]");
				if (themeButton) setPrefs({ color: themeButton.dataset.themeChoice });
				const fontButton = event.target.closest("[data-font-choice]");
				if (fontButton) setPrefs({ font: fontButton.dataset.fontChoice });
			});
			document.body.append(panel);
			appearancePanel = panel;
			document.addEventListener("click", (event) => {
				const trigger = event.target.closest?.("[data-samey-appearance]");
				if (trigger) {
					event.preventDefault();
					event.stopPropagation();
					toggleAppearance(trigger);
					return;
				}
				if (!panel.contains(event.target)) closeAppearance();
			});
			addEventListener("resize", () => appearanceTrigger && positionAppearancePanel(appearanceTrigger), { passive: true });
			addEventListener("samey-pageleave", closeAppearance);
			apply();
		};
		globalThis.SameyOpenAppearance = (trigger) => toggleAppearance(trigger);
		const pushState = history.pushState.bind(history);
		const replaceState = history.replaceState.bind(history);
		const runtimeNode = (el) => {
			el.dataset.sameyRuntime = "";
			return el;
		};
		const normalizeExternalLinks = (root = document) => {
			for (const link of root.querySelectorAll?.("a[href]") || []) {
				let url;
				try {
					url = new URL(link.href, location.href);
				} catch {
					continue;
				}
				if (!/^https?:$/.test(url.protocol) || url.origin === location.origin) continue;
				delete link.dataset.sameyExternal;
				link.target = "_blank";
				link.rel = "noopener noreferrer";
			}
		};
		const observeExternalLinks = () => new MutationObserver((records) => {
			for (const record of records) for (const node of record.addedNodes) {
				if (!(node instanceof Element)) continue;
				if (node.matches?.("a[href]")) normalizeExternalLinks(node.parentElement || document);
				else normalizeExternalLinks(node);
			}
		}).observe(document.documentElement, {
			subtree: true,
			childList: true
		});
		const loadingFrames = generateLoadingFrames;
		const loadingCursorSvg = generateAnimatedSineCircleSvg;
		globalThis.SameyLoadingSvg = loadingCursorSvg;
		const mountCursor = () => {
			if (!matchMedia?.("(pointer:fine)").matches || document.getElementById("samey-cursor")) return;
			const cursor = runtimeNode(document.createElement("div"));
			cursor.id = "samey-cursor";
			cursor.className = "samey-cursor";
			cursor.innerHTML = `<span class="samey-cursor-dot"></span><span class="samey-cursor-text"></span><svg class="samey-cursor-grab" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><mask id="samey-grab-mask" x="0" y="0" width="64" height="64" maskUnits="userSpaceOnUse" style="mask-type:luminance"><circle cx="32" cy="32" r="8.4" fill="white"/><rect x="30.2" y="22.4" width="3.6" height="19.2" fill="black"/><rect x="22.4" y="30.2" width="19.2" height="3.6" fill="black"/></mask><circle cx="32" cy="32" r="8.4" fill="currentColor" mask="url(#samey-grab-mask)"/><circle cx="32" cy="32" r="4.8" fill="currentColor"><animate class="samey-cursor-grab-pulse" attributeName="r" values="8.4;4.8" dur=".18s" repeatCount="1" calcMode="linear" begin="indefinite" fill="remove"/></circle></svg>${loadingCursorSvg()}`;
			const linkFill = runtimeNode(document.createElement("div"));
			linkFill.className = "samey-cursor-link-fill";
			linkFill.hidden = true;
			const dragPreview = runtimeNode(document.createElement("div"));
			dragPreview.className = "samey-drag-preview";
			dragPreview.hidden = true;
			document.documentElement.classList.add("samey-custom-cursor");
			document.body.append(linkFill, dragPreview, cursor);
			const loadingPath = cursor.querySelector(".samey-cursor-loading path");
			loadingPath?.querySelector("animate")?.remove();
			let loadingRaf = 0, loadingStarted = 0;
			let refreshCursorMode = () => {};
			const animateLoadingPaths = (time) => {
				if (!cursor.hasAttribute("data-loading")) {
					loadingRaf = 0;
					return;
				}
				const frames = loadingFrames();
				const progress = (time - loadingStarted) % (loadingGeometry.duration * 1e3) / (loadingGeometry.duration * 1e3);
				loadingPath?.setAttribute("d", frames[Math.min(frames.length - 1, Math.floor(progress * (frames.length - 1)))]);
				loadingRaf = requestAnimationFrame(animateLoadingPaths);
			};
			const setLoading = (loading) => {
				cursor.toggleAttribute("data-loading", !!loading);
				if (loading) {
					cursor.removeAttribute("data-grab");
					cursor.removeAttribute("data-text");
					cursor.dataset.visible = "";
					linkFill.hidden = true;
				}
				document.documentElement.toggleAttribute("data-site-loading", !!loading);
				if (loading && !loadingRaf) {
					loadingStarted = performance.now();
					loadingPath?.setAttribute("d", loadingFrames()[0]);
					loadingRaf = requestAnimationFrame(animateLoadingPaths);
				}
				if (!loading && loadingRaf) {
					cancelAnimationFrame(loadingRaf);
					loadingRaf = 0;
				}
				if (!loading) refreshCursorMode();
			};
			addEventListener("samey-loading", (event) => setLoading(!!event.detail));
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
			const grabPulse = cursor.querySelector(".samey-cursor-grab-pulse");
			const setTextState = (text) => cursor.toggleAttribute("data-text", !!text);
			const setGrabState = (grab) => {
				const wasGrab = cursor.hasAttribute("data-grab");
				cursor.toggleAttribute("data-grab", grab);
				if (grab) setTextState(false);
				if (grab && !wasGrab && !matchMedia?.("(prefers-reduced-motion: reduce)").matches && typeof grabPulse?.beginElement === "function") grabPulse.beginElement();
			};
			const holdLinkCursor = (event, link) => {
				if (!link) return;
				linkHandoffUntil = performance.now() + 240;
				if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) placeXY(event.clientX, event.clientY);
				setGrabState(false);
				cursor.removeAttribute("data-grab");
				cursor.dataset.visible = "";
			};
			let nativeDragging = false;
			let selectingText = false;
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
				lastX = pendingX;
				lastY = pendingY;
				cursor.style.transform = `translate3d(${pendingX - 32}px,${pendingY - 32}px,0)`;
				cursor.dataset.visible = "";
			};
			const placeXY = (x, y, immediate = false) => {
				if (!Number.isFinite(x) || !Number.isFinite(y)) return;
				pendingX = x;
				pendingY = y;
				if (immediate) {
					if (cursorFrame) cancelAnimationFrame(cursorFrame);
					renderCursorPosition();
				} else if (!cursorFrame) cursorFrame = requestAnimationFrame(renderCursorPosition);
			};
			const place = (event, immediate = false) => placeXY(event.clientX, event.clientY, immediate);
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
				if (!text) {
					dragPreview.hidden = true;
					return;
				}
				dragPreview.dataset.kind = kind;
				dragPreview.textContent = text;
				dragPreview.hidden = false;
				dragPreviewW = dragPreview.offsetWidth;
				dragPreviewH = dragPreview.offsetHeight;
				placeDragPreview(x, y);
			};
			const hideDragPreview = () => {
				dragPreview.hidden = true;
				delete dragPreview.dataset.kind;
				dragPreview.textContent = "";
			};
			const linkDragLabel = (link) => {
				const label = compactDragText(link?.textContent || link?.getAttribute?.("aria-label") || link?.title || "", 56);
				const href = link instanceof HTMLAnchorElement || link instanceof HTMLAreaElement ? link.href : link?.getAttribute?.("href");
				if (!href) return label || "Link";
				try {
					const url = new URL(href, location.href);
					const host = url.origin === location.origin ? url.pathname : url.hostname.replace(/^www\./, "");
					return label ? `${label} · ${host}` : host;
				} catch {
					return label || "Link";
				}
			};
			const fillDot = 16.8;
			let fillTarget = null, fillVisible = false, fillCollapsing = false, fillFrame = 0;
			let fillX = 0, fillY = 0, fillW = fillDot, fillH = fillDot;
			let wantedFillX = 0, wantedFillY = 0, wantedFillW = fillDot, wantedFillH = fillDot;
			const linkRect = (link) => {
				return [...link.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0).find((rect) => pendingX >= rect.left && pendingX <= rect.right && pendingY >= rect.top && pendingY <= rect.bottom) ?? link.getBoundingClientRect();
			};
			const updateFillGoal = () => {
				if (!fillTarget?.isConnected) return setFillTarget(null);
				const rect = linkRect(fillTarget);
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
			const renderFill = () => {
				fillFrame = 0;
				const reduced = matchMedia?.("(prefers-reduced-motion: reduce)").matches;
				const posEase = reduced ? 1 : fillCollapsing ? .62 : .38, sizeEase = reduced ? 1 : fillCollapsing ? .58 : .25;
				fillX += (wantedFillX - fillX) * posEase;
				fillY += (wantedFillY - fillY) * posEase;
				fillW += (wantedFillW - fillW) * sizeEase;
				fillH += (wantedFillH - fillH) * sizeEase;
				linkFill.style.width = `${fillW}px`;
				linkFill.style.height = `${fillH}px`;
				linkFill.style.transform = `translate3d(${fillX - fillW / 2}px,${fillY - fillH / 2}px,0)`;
				const done = Math.abs(fillX - wantedFillX) < .5 && Math.abs(fillY - wantedFillY) < .5 && Math.abs(fillW - wantedFillW) < .5 && Math.abs(fillH - wantedFillH) < .5;
				if (fillCollapsing && done) {
					fillVisible = fillCollapsing = false;
					linkFill.hidden = true;
				} else if (!done) fillFrame = requestAnimationFrame(renderFill);
			};
			const ensureFillFrame = () => {
				if (!fillFrame) fillFrame = requestAnimationFrame(renderFill);
			};
			function setFillTarget(link) {
				if (cursor.hasAttribute("data-loading")) {
					fillTarget = null;
					fillVisible = fillCollapsing = false;
					linkFill.hidden = true;
					return;
				}
				if (!link) {
					fillTarget = null;
					if (!fillVisible) return;
					fillCollapsing = true;
					wantedFillX = pendingX;
					wantedFillY = pendingY;
					wantedFillW = wantedFillH = fillDot;
					ensureFillFrame();
					return;
				}
				if (!fillVisible) {
					fillX = wantedFillX = pendingX;
					fillY = wantedFillY = pendingY;
					fillW = fillH = fillDot;
					fillVisible = true;
					linkFill.hidden = false;
				}
				fillTarget = link;
				fillCollapsing = false;
				linkFill.hidden = false;
				updateFillGoal();
				ensureFillFrame();
			}
			const textInput = (target) => target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement && ![
				"button",
				"checkbox",
				"color",
				"file",
				"hidden",
				"image",
				"radio",
				"range",
				"reset",
				"submit"
			].includes(target.type);
			const wantsText = (target) => {
				if (!(target instanceof Element) || linkTarget(target) || target.closest("button,select,option,summary,[role=button],[role=slider],[data-grab-cursor]")) return false;
				if (textInput(target) || target.closest("[contenteditable=\"true\"],[contenteditable=\"plaintext-only\"]")) return true;
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
			const setMode = (target) => {
				const grab = nativeDragging || pressedGrab || !selectingText && wantsGrab(target);
				const link = grab || selectingText ? null : linkTarget(target);
				setGrabState(grab);
				setTextState(!grab && (selectingText || !link && wantsText(target)));
				setFillTarget(link);
			};
			refreshCursorMode = () => cursor.hasAttribute("data-visible") ? setMode(document.elementFromPoint(pendingX, pendingY)) : setFillTarget(null);
			const refreshAt = (event) => {
				if (nativeDragging) {
					delete cursor.dataset.visible;
					return;
				}
				place(event);
				setMode(event.target instanceof Element ? event.target : elementAt(event));
			};
			document.addEventListener("pointermove", refreshAt, {
				capture: true,
				passive: true
			});
			document.addEventListener("pointerover", refreshAt, {
				capture: true,
				passive: true
			});
			addEventListener("scroll", () => {
				if (fillTarget) {
					updateFillGoal();
					ensureFillFrame();
				}
			}, {
				passive: true,
				capture: true
			});
			addEventListener("resize", () => {
				if (fillTarget) {
					updateFillGoal();
					ensureFillFrame();
				}
			}, { passive: true });
			addEventListener("samey-pageleave", () => setFillTarget(null));
			document.addEventListener("pointerdown", (event) => {
				document.documentElement.style.setProperty("--samey-dialog-origin-x", `${event.clientX}px`);
				document.documentElement.style.setProperty("--samey-dialog-origin-y", `${event.clientY}px`);
				const actual = elementAt(event);
				const pressedLink = linkTarget(actual);
				const modifiedLink = pressedLink && (event.ctrlKey || event.metaKey || event.button === 1);
				pressedPointerId = event.pointerId;
				pressedGrab = !!actual?.closest?.(pressedGrabSelector);
				place(event, true);
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
				if (pressedPointerId === event.pointerId) {
					pressedPointerId = null;
					pressedGrab = false;
				}
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
				const editable = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ? target : target instanceof Element ? target.closest("input,textarea") : null;
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
				setFillTarget(null);
				delete cursor.dataset.visible;
			};
			document.addEventListener("dragstart", startNativeDrag, true);
			document.addEventListener("dragenter", () => {
				nativeDragging = true;
				delete cursor.dataset.visible;
			}, true);
			document.addEventListener("dragover", () => {
				nativeDragging = true;
				delete cursor.dataset.visible;
			}, true);
			const stopDragging = (event) => {
				nativeDragging = false;
				selectingText = false;
				pressedGrab = false;
				pressedPointerId = null;
				modifiedLinkPending = null;
				suppressModifiedClick = null;
				hideDragPreview();
				if (event && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
					place(event);
					setMode(elementAt(event));
				} else {
					setGrabState(false);
					setTextState(false);
					setFillTarget(null);
				}
			};
			document.addEventListener("dragend", stopDragging, true);
			document.addEventListener("drop", stopDragging, true);
			addEventListener("pointercancel", stopDragging, true);
			addEventListener("blur", stopDragging);
			addEventListener("pointerout", (event) => {
				if (!event.relatedTarget && !nativeDragging && performance.now() >= linkHandoffUntil) {
					delete cursor.dataset.visible;
					setFillTarget(null);
				}
			});
		};
		const editableTarget = (el) => {
			if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el;
			return el instanceof Element ? el.closest("[contenteditable=\"true\"], [contenteditable=\"plaintext-only\"]") : null;
		};
		const selectedText = () => getSelection()?.toString() || "";
		const writeClipboard = async (text) => {
			if (!text) return;
			try {
				await navigator.clipboard.writeText(text);
			} catch {
				const area = document.createElement("textarea");
				area.value = text;
				area.style.cssText = "position:fixed;opacity:0;pointer-events:none";
				document.body.append(area);
				try {
					area.select();
					document.execCommand("copy");
				} finally {
					area.remove();
				}
			}
		};
		const pasteInto = (el, text) => {
			if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
				el.setRangeText(text, el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length, "end");
				el.dispatchEvent(new InputEvent("input", {
					bubbles: true,
					inputType: "insertFromPaste",
					data: text
				}));
			} else if (el?.isContentEditable) {
				el.focus();
				document.execCommand("insertText", false, text);
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
				return decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || url.hostname.replace(/^www\./, "")).replace(/\.html?$/i, "").replace(/[-_]+/g, " ") || url.hostname;
			} catch {
				return "Link";
			}
		};
		const stampLinkCopyLabels = (root = document) => {
			const links = root instanceof HTMLAnchorElement ? [root] : root.querySelectorAll?.("a[href]") || [];
			for (const link of links) if (!link.dataset.copyLabel) link.dataset.copyLabel = linkCopyText(link);
		};
		stampLinkCopyLabels();
		new MutationObserver((records) => {
			for (const record of records) for (const node of record.addedNodes) if (node instanceof Element) stampLinkCopyLabels(node);
		}).observe(document.documentElement, {
			childList: true,
			subtree: true
		});
		const mountContextMenu = () => {
			if (document.getElementById("samey-context-menu")) return;
			const menu = runtimeNode(document.createElement("div"));
			menu.id = "samey-context-menu";
			menu.className = "samey-context-menu";
			menu.hidden = true;
			document.body.append(menu);
			let target = null;
			const close = () => {
				menu.hidden = true;
				menu.replaceChildren();
			};
			const add = (label, action, enabled = true, hint = "") => {
				const button = document.createElement("button");
				button.type = "button";
				button.disabled = !enabled;
				const text = document.createElement("span");
				text.textContent = label;
				button.append(text);
				if (hint) {
					const key = document.createElement("kbd");
					key.textContent = hint;
					button.append(key);
				}
				button.addEventListener("click", async () => {
					close();
					try {
						await action();
					} catch {}
				});
				menu.append(button);
			};
			const sep = () => {
				const hr = document.createElement("hr");
				menu.append(hr);
			};
			document.addEventListener("contextmenu", (event) => {
				if (event.shiftKey) return;
				event.preventDefault();
				target = event.target;
				menu.replaceChildren();
				const link = target instanceof Element ? target.closest("a[href]") : null;
				const image = target instanceof Element ? target.closest("img[src]") : null;
				const selection = selectedText();
				const editable = editableTarget(target);
				if (selection) add("Copy", () => writeClipboard(selection), true, navigator.platform?.includes("Mac") ? "⌘C" : "Ctrl+C");
				if (editable && selection) add("Cut", async () => {
					await writeClipboard(selection);
					document.execCommand("delete");
				}, true, navigator.platform?.includes("Mac") ? "⌘X" : "Ctrl+X");
				if (editable) add("Paste", async () => pasteInto(editable, await navigator.clipboard.readText()), !!navigator.clipboard?.readText, navigator.platform?.includes("Mac") ? "⌘V" : "Ctrl+V");
				add("Select all", () => {
					if (editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement) {
						editable.focus();
						editable.select();
					} else if (editable) {
						const range = document.createRange();
						range.selectNodeContents(editable);
						const sel = getSelection();
						sel.removeAllRanges();
						sel.addRange(range);
					} else {
						const range = document.createRange();
						range.selectNodeContents(document.body);
						const sel = getSelection();
						sel.removeAllRanges();
						sel.addRange(range);
					}
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
						add("Save image", () => {
							const a = document.createElement("a");
							a.href = image.src;
							a.download = image.alt || "image";
							a.click();
						});
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
			document.addEventListener("pointerdown", (event) => {
				if (!menu.hidden && !menu.contains(event.target)) close();
			}, true);
			addEventListener("blur", close);
			addEventListener("resize", close);
			addEventListener("scroll", close, true);
			document.addEventListener("keydown", (event) => {
				if (event.key === "Escape") close();
			});
		};
		const virtualBars = /* @__PURE__ */ new Map();
		let virtualRaf = 0;
		const scrollMetrics = (target) => target === document.scrollingElement ? {
			top: scrollY,
			size: innerHeight,
			total: target.scrollHeight
		} : {
			top: target.scrollTop,
			size: target.clientHeight,
			total: target.scrollHeight
		};
		const setScroll = (target, top) => target === document.scrollingElement ? scrollTo({ top }) : target.scrollTop = top;
		const virtualScrollerEligible = (target) => {
			if (target === document.scrollingElement) return true;
			if (!(target instanceof Element) || !target.isConnected || target.closest("[data-samey-runtime]")) return false;
			const style = getComputedStyle(target);
			if (style.display === "none" || style.visibility === "hidden" || Number.parseFloat(style.opacity || "1") <= .001) return false;
			const r = target.getBoundingClientRect();
			if (r.width < 8 || r.height < 8 || style.pointerEvents === "none") return false;
			return true;
		};
		const updateVirtualBars = () => {
			virtualRaf = 0;
			for (const [target, bar] of virtualBars) {
				if (!virtualScrollerEligible(target)) {
					bar.remove();
					virtualBars.delete(target);
					continue;
				}
				const { top, size, total } = scrollMetrics(target);
				if (total <= size + 2) {
					bar.hidden = true;
					continue;
				}
				bar.hidden = false;
				let height, y, x, topPx;
				if (target === document.scrollingElement) {
					height = innerHeight;
					x = innerWidth - 7;
					topPx = 0;
				} else {
					const r = target.getBoundingClientRect();
					height = Math.max(18, r.height);
					x = r.right - 7;
					topPx = r.top;
					if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) {
						bar.hidden = true;
						continue;
					}
				}
				bar.style.cssText = `height:${height}px;left:${x}px;top:${topPx}px`;
				const thumb = bar.firstElementChild;
				const thumbH = Math.max(24, height * size / total);
				y = (height - thumbH) * top / Math.max(1, total - size);
				thumb.style.height = `${thumbH}px`;
				thumb.style.transform = `translateY(${y}px)`;
			}
			updateVirtualXBars();
		};
		const scheduleVirtualBars = () => {
			if (!virtualRaf) virtualRaf = requestAnimationFrame(updateVirtualBars);
		};
		const addVirtualBar = (target) => {
			if (virtualBars.has(target)) return;
			const bar = runtimeNode(document.createElement("div"));
			bar.className = "samey-vscroll";
			const thumb = document.createElement("div");
			thumb.className = "samey-vscroll-thumb";
			thumb.dataset.grabCursor = "";
			bar.append(thumb);
			document.body.append(bar);
			let startY = 0, startTop = 0;
			thumb.addEventListener("pointerdown", (event) => {
				event.preventDefault();
				thumb.setPointerCapture(event.pointerId);
				startY = event.clientY;
				startTop = scrollMetrics(target).top;
			});
			thumb.addEventListener("pointermove", (event) => {
				if (!thumb.hasPointerCapture(event.pointerId)) return;
				const { size, total } = scrollMetrics(target);
				const track = bar.clientHeight, thumbH = thumb.clientHeight;
				setScroll(target, startTop + (event.clientY - startY) * Math.max(1, total - size) / Math.max(1, track - thumbH));
				scheduleVirtualBars();
			});
			bar.addEventListener("pointerdown", (event) => {
				if (event.target === thumb) return;
				const { size, total } = scrollMetrics(target);
				const r = bar.getBoundingClientRect();
				setScroll(target, (event.clientY - r.top) / r.height * Math.max(0, total - size));
				scheduleVirtualBars();
			});
			target.addEventListener?.("scroll", scheduleVirtualBars, { passive: true });
			virtualBars.set(target, bar);
		};
		const virtualXBars = /* @__PURE__ */ new Map();
		const addVirtualXBar = (target) => {
			if (virtualXBars.has(target)) return;
			const bar = runtimeNode(document.createElement("div"));
			bar.className = "samey-hscroll";
			const thumb = document.createElement("div");
			thumb.className = "samey-hscroll-thumb";
			thumb.dataset.grabCursor = "";
			bar.append(thumb);
			document.body.append(bar);
			let startX = 0, startLeft = 0;
			thumb.addEventListener("pointerdown", (event) => {
				event.preventDefault();
				thumb.setPointerCapture(event.pointerId);
				startX = event.clientX;
				startLeft = target.scrollLeft;
			});
			thumb.addEventListener("pointermove", (event) => {
				if (!thumb.hasPointerCapture(event.pointerId)) return;
				const size = target.clientWidth, total = target.scrollWidth, track = bar.clientWidth, thumbW = thumb.clientWidth;
				target.scrollLeft = startLeft + (event.clientX - startX) * Math.max(1, total - size) / Math.max(1, track - thumbW);
				scheduleVirtualBars();
			});
			bar.addEventListener("pointerdown", (event) => {
				if (event.target === thumb) return;
				const r = bar.getBoundingClientRect();
				target.scrollLeft = (event.clientX - r.left) / r.width * Math.max(0, target.scrollWidth - target.clientWidth);
				scheduleVirtualBars();
			});
			target.addEventListener("scroll", scheduleVirtualBars, { passive: true });
			virtualXBars.set(target, bar);
		};
		const updateVirtualXBars = () => {
			for (const [target, bar] of virtualXBars) {
				if (!virtualScrollerEligible(target)) {
					bar.remove();
					virtualXBars.delete(target);
					continue;
				}
				if (target.scrollWidth <= target.clientWidth + 2) {
					bar.hidden = true;
					continue;
				}
				const r = target.getBoundingClientRect();
				if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) {
					bar.hidden = true;
					continue;
				}
				bar.hidden = false;
				const width = Math.max(18, r.width);
				bar.style.cssText = `width:${width}px;left:${r.left}px;top:${r.bottom - 7}px`;
				const thumb = bar.firstElementChild;
				const thumbW = Math.max(24, width * target.clientWidth / target.scrollWidth);
				const x = (width - thumbW) * target.scrollLeft / Math.max(1, target.scrollWidth - target.clientWidth);
				thumb.style.width = `${thumbW}px`;
				thumb.style.transform = `translateX(${x}px)`;
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
			const pending = /* @__PURE__ */ new Set();
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
			new MutationObserver((records) => {
				const targets = [];
				for (const record of records) {
					targets.push(record.target);
					for (const node of record.addedNodes) targets.push(node instanceof Element ? node : node.parentElement);
				}
				scheduleTargets(targets);
				scheduleVirtualBars();
			}).observe(document.body, {
				subtree: true,
				childList: true
			});
			new ResizeObserver(() => {
				scheduleVirtualBars();
				scheduleTargets([document.body]);
			}).observe(document.documentElement);
			addEventListener("resize", () => {
				scheduleVirtualBars();
				scheduleTargets([document.body]);
			});
			addEventListener("scroll", scheduleVirtualBars, true);
		};
		const hashTarget = (url) => {
			if (!url.hash) return "";
			try {
				return decodeURIComponent(url.hash.slice(1));
			} catch {
				return url.hash.slice(1);
			}
		};
		const pageStyleNodes = () => [...document.head.children].filter((el) => (el.tagName === "STYLE" || el.tagName === "LINK" && el.rel === "stylesheet") && !el.hasAttribute("data-samey-shared"));
		const markInitialPageStyles = () => pageStyleNodes().forEach((el) => el.dataset.spaPage = "");
		const pageCache = /* @__PURE__ */ new Map();
		const setLoading = (value) => {
			const on = !!value;
			document.documentElement.toggleAttribute("data-site-loading", on);
			dispatchEvent(new CustomEvent("samey-loading", { detail: on }));
			document.getElementById("samey-loading-layer")?.removeAttribute("data-visible");
		};
		const syncHtmlData = (doc, baseUrl) => {
			const keep = /* @__PURE__ */ new Set([
				"data-site-theme",
				"data-kb-theme",
				"data-font",
				"data-color"
			]);
			for (const attr of [...document.documentElement.attributes]) if (attr.name.startsWith("data-") && !keep.has(attr.name)) document.documentElement.removeAttribute(attr.name);
			for (const attr of doc.documentElement.attributes) if (attr.name.startsWith("data-")) {
				let value = attr.value;
				if ((attr.name === "data-home-href" || attr.name === "data-back-href") && value) value = new URL(value, baseUrl).href;
				document.documentElement.setAttribute(attr.name, value);
			}
		};
		const logicalPageUrl = (url) => {
			const logical = new URL(url.href);
			if (logical.pathname.endsWith("/blog")) logical.pathname += "/index.html";
			else if (logical.pathname.endsWith("/")) logical.pathname += "index.html";
			else if (!/\.[a-z0-9]+$/i.test(logical.pathname)) logical.pathname += ".html";
			return logical;
		};
		const fetchPage = async (url) => {
			const key = url.href;
			if (pageCache.has(key)) return pageCache.get(key);
			const task = (async () => {
				const logical = logicalPageUrl(url);
				const response = await fetch(logical, { headers: { "X-Samey-SPA": "1" } });
				if (!response.ok) throw new Error("page fetch failed");
				const doc = new DOMParser().parseFromString(await response.text(), "text/html");
				const baseTag = doc.querySelector("base[href]")?.getAttribute("href");
				return {
					doc,
					baseUrl: new URL(baseTag || ".", logical.href),
					responseUrl: logical.href
				};
			})();
			pageCache.set(key, task);
			try {
				return await task;
			} catch (error) {
				pageCache.delete(key);
				throw error;
			}
		};
		const normalizePageUrls = (doc, baseUrl) => {
			for (const el of doc.querySelectorAll("[href]")) {
				const value = el.getAttribute("href");
				if (!value || value.startsWith("#") || /^(?:mailto:|tel:|javascript:|data:)/i.test(value)) continue;
				try {
					el.setAttribute("href", new URL(value, baseUrl).href);
				} catch {}
			}
			for (const el of doc.querySelectorAll("[src]")) {
				const value = el.getAttribute("src");
				if (!value || /^(?:data:|blob:)/i.test(value)) continue;
				try {
					el.setAttribute("src", new URL(value, baseUrl).href);
				} catch {}
			}
		};
		const runBodyScripts = (baseUrl) => {
			for (const old of [...document.body.querySelectorAll("script")]) {
				const fresh = document.createElement("script");
				for (const attr of old.attributes) if (attr.name !== "src") fresh.setAttribute(attr.name, attr.value);
				if (old.src || old.getAttribute("src")) fresh.src = new URL(old.getAttribute("src"), baseUrl).href;
				else fresh.textContent = old.textContent;
				old.replaceWith(fresh);
			}
		};
		const runHeadScripts = (doc, baseUrl) => {
			document.head.querySelectorAll("script[data-spa-page-script]").forEach((script) => script.remove());
			for (const old of [...doc.head.querySelectorAll("script")]) {
				const source = old.getAttribute("src");
				const resolved = source ? new URL(source, baseUrl).href : "";
				if (resolved && /\/shared-runtime\.js(?:[?#]|$)/.test(resolved)) continue;
				const fresh = document.createElement("script");
				for (const attr of old.attributes) if (attr.name !== "src") fresh.setAttribute(attr.name, attr.value);
				fresh.dataset.spaPageScript = "";
				if (resolved) fresh.src = resolved;
				else fresh.textContent = old.textContent;
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
			try {
				globalThis.SameyToolsDispose?.();
				delete globalThis.SameyToolsDispose;
			} catch {}
			try {
				globalThis.SameySolidDispose?.();
			} catch {}
			try {
				globalThis.SameyWordleDispose?.();
			} catch {}
			try {
				globalThis.SameyKeybrDispose?.();
			} catch {}
			dispatchEvent(new Event("samey-pageleave"));
			normalizePageUrls(doc, baseUrl);
			document.querySelectorAll("head > [data-spa-page]").forEach((el) => el.remove());
			for (const el of [...doc.head.children]) if (el.tagName === "STYLE" || el.tagName === "LINK" && el.rel === "stylesheet") {
				const copy = el.cloneNode(true);
				copy.dataset.spaPage = "";
				if (copy.tagName === "LINK") copy.href = new URL(el.getAttribute("href"), baseUrl).href;
				document.head.append(copy);
			}
			const runtimeAnchor = clearPageBody();
			for (const child of [...doc.body.children]) document.body.insertBefore(document.importNode(child, true), runtimeAnchor);
			document.title = doc.title;
			syncHtmlData(doc, baseUrl);
			currentPagePath = url.pathname;
			(replace ? replaceState : pushState)({}, "", url.href);
			runBodyScripts(baseUrl);
			runHeadScripts(doc, baseUrl);
			queueMicrotask(() => globalThis.SameyMountSolid?.());
			apply();
			scanVirtualScrollers();
			if (!url.hash) scrollTo({
				top: 0,
				left: 0,
				behavior: "instant"
			});
			else queueMicrotask(() => document.getElementById(hashTarget(url))?.scrollIntoView());
			dispatchEvent(new CustomEvent("samey-pageload", { detail: { url: url.href } }));
		};
		const destinationRoot = () => {
			if (document.documentElement.dataset.siteKind === "keybr") return document.getElementById("app");
			if (document.documentElement.hasAttribute("data-static-article")) return document.querySelector(".article-route");
			return document.querySelector("#solid-site-app,#wordle-root,.site-route,.article-route");
		};
		const waitForDestinationRoot = async () => {
			for (let i = 0; i < 90; i++) {
				const root = destinationRoot();
				if (root && root.childElementCount > 0) return root;
				await new Promise((resolve) => requestAnimationFrame(resolve));
			}
			throw new Error(`The ${document.documentElement.dataset.siteKind || "destination"} application did not mount.`);
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
			panel.querySelector("[data-retry]").addEventListener("click", () => {
				dismissLoadError();
				retry();
			});
			panel.querySelector("[data-dismiss]").addEventListener("click", dismissLoadError);
			document.body.append(panel);
		};
		let pageNavigationId = 0;
		const cancelPageNavigation = () => {
			pageNavigationId++;
			setLoading(false);
		};
		globalThis.SameyCancelPageSwap = cancelPageNavigation;
		const loadPage = async (href, { replace = false, force = false } = {}) => {
			const id = ++pageNavigationId;
			const url = new URL(href, location.href);
			if (url.origin !== location.origin) {
				location.href = url.href;
				return;
			}
			dismissLoadError();
			if (!force && url.href === location.href) {
				setLoading(false);
				return;
			}
			setLoading(true);
			try {
				const { doc, baseUrl } = await fetchPage(url);
				if (id !== pageNavigationId) return;
				const current = destinationRoot();
				const commit = async () => {
					swapPage(doc, baseUrl, url, replace);
					await waitForDestinationRoot();
					document.getElementById("samey-boot")?.remove();
					document.getElementById("samey-boot-style")?.remove();
				};
				await animateRootSwap(current, commit, destinationRoot, url.pathname === "/" || /\/index(?:\.html)?$/.test(url.pathname) ? "back" : "forward");
			} catch (error) {
				if (id !== pageNavigationId) return;
				showLoadError(url, error, () => loadPage(url.href, {
					replace,
					force
				}));
				throw error;
			} finally {
				if (id === pageNavigationId) setLoading(false);
			}
		};
		globalThis.SameyPageSwapNavigate = (href, opts) => loadPage(href, opts);
		globalThis.SameyAnimateLocalSwap = (root, commit, direction = "forward") => animateRootSwap(root, commit, () => root, direction);
		const shouldSpa = (url) => url.origin === location.origin;
		const prefetch = (href) => {
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
			markInitialPageStyles();
			document.addEventListener("pointerover", (event) => {
				if (document.documentElement.hasAttribute("data-solid-spa")) return;
				const a = event.target.closest?.("a[href]");
				if (a && !a.target) prefetch(a.href);
			}, { passive: true });
			document.addEventListener("focusin", (event) => {
				if (document.documentElement.hasAttribute("data-solid-spa")) return;
				const a = event.target.closest?.("a[href]");
				if (a && !a.target) prefetch(a.href);
			});
			document.addEventListener("click", (event) => {
				if (document.documentElement.hasAttribute("data-solid-spa")) return;
				if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
				const a = event.target.closest?.("a[href]");
				if (!a || a.target || a.hasAttribute("download")) return;
				const url = new URL(a.href, location.href);
				if (!shouldSpa(url) || url.hash && url.pathname === location.pathname && url.search === location.search) return;
				event.preventDefault();
				loadPage(url.href).catch(() => {});
			});
			addEventListener("popstate", () => {
				if (document.documentElement.hasAttribute("data-solid-spa") || location.pathname === currentPagePath) return;
				loadPage(location.href, {
					replace: true,
					force: true
				}).catch(() => {});
			});
		};
		addEventListener("storage", (event) => {
			if (event.key === KEY || event.key === FONT_KEY) apply();
		});
		matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
			const raw = rawPrefs();
			if (!raw.color || raw.color === "system") apply();
		});
		apply();
		const mountRuntime = () => {
			normalizeExternalLinks();
			observeExternalLinks();
			mountControls();
			mountCursor();
			mountContextMenu();
			mountVirtualScrollbars();
			mountSpa();
			addEventListener("samey-pageload", mountSpa);
		};
		if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountRuntime, { once: true });
		else mountRuntime();
		if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register(new URL("sw.js", SCRIPT_ROOT).href).catch(() => {});
	})();
	//#endregion
	//#region src/shared/catalog.ts
	var TOOLS = [
		{
			id: "text",
			label: "Text",
			title: "Text Inspector",
			note: "Word, character, line and Unicode inspection in one editor."
		},
		{
			id: "base",
			label: "Encode",
			title: "Encode / Decode",
			note: "Base64, URL, Base32, Base58, hex, binary and text encodings."
		},
		{
			id: "diff",
			label: "Diff",
			title: "Live Diff",
			note: "Fast live text diff with inline change highlighting."
		},
		{
			id: "number",
			label: "Numbers",
			title: "Number Lab",
			note: "Inspect and convert integers across bases 2–62."
		},
		{
			id: "markdown",
			label: "Markdown",
			title: "Markdown",
			note: "Live local Markdown editor and preview."
		}
	];
	//#endregion
	//#region src/site/data.ts
	var games = [
		{
			title: "Wordle",
			href: "/wordle.html",
			kind: "Game",
			note: "A Wordle clone.",
			tags: ["solidjs", "word game"]
		},
		{
			title: "Keybr",
			href: "/keybr.html",
			kind: "Game",
			note: "A local-first fork of keybr.com.",
			tags: ["typing", "local-first"]
		},
		{
			title: "Chain Reaction",
			href: "/chain/",
			kind: "Game",
			note: "Canvas-rendered chain reaction with local AI.",
			tags: [
				"canvas",
				"game",
				"ai"
			]
		}
	];
	var tools = TOOLS.map((tool) => ({
		title: tool.title,
		href: `/tools/?tool=${tool.id}`,
		kind: "Tool",
		note: tool.note
	}));
	var projects = [
		{
			title: "zhtml",
			href: "/projects/zhtml/",
			kind: "Project",
			note: "Throughput-oriented HTML parser in Zig.",
			tags: [
				"zig",
				"parser",
				"performance"
			]
		},
		{
			title: "Reverb",
			href: "/projects/reverb/",
			kind: "Project",
			note: "Android rolling audio recorder backed by an in-memory circular buffer.",
			tags: [
				"kotlin",
				"android",
				"audio"
			]
		},
		{
			title: "OneSerial",
			href: "/projects/oneserial/",
			kind: "Project",
			note: "Nested Zig data structures in one contiguous allocation.",
			tags: [
				"zig",
				"serialization",
				"memory"
			]
		},
		{
			title: "CNN",
			href: "/projects/cnn/",
			kind: "Project",
			note: "Convolutional network implemented from scratch in Zig.",
			tags: [
				"zig",
				"ml",
				"mnist"
			]
		}
	];
	var moreProjects = [{
		title: "zxml",
		href: "https://github.com/SmallThingz/zxml",
		kind: "Project",
		note: "Fast XML parsing with explicit memory management.",
		tags: ["zig", "xml"]
	}, {
		title: "java debug shell",
		href: "https://github.com/SmallThingz/java_debug_shell",
		kind: "Project",
		note: "Attach, inspect and evaluate inside a running JVM.",
		tags: ["java", "jvm"]
	}];
	var posts = [{
		title: "btop's broken lock",
		href: "/blog/posts/btop-mutex.html",
		kind: "Writing",
		note: "the mutex that wasn't",
		tags: [
			"c++",
			"concurrency",
			"btop"
		]
	}];
	var contributions = [
		{
			title: "aristocratos/btop · PR #1649",
			href: "https://github.com/aristocratos/btop/pull/1649",
			kind: "OSS",
			note: "Data races, mutex-like locking and signal-safety fixes.",
			tags: ["c++", "concurrency"]
		},
		{
			title: "karlseguin/http.zig",
			href: "https://github.com/karlseguin/http.zig",
			kind: "OSS",
			note: "Memory leak fixes, CORS performance and Zig build updates.",
			tags: ["zig", "http"]
		},
		{
			title: "gofiber/fiber",
			href: "https://github.com/gofiber/fiber",
			kind: "OSS",
			note: "Route parameter binding and request-context lifecycle fixes.",
			tags: ["go", "http"]
		}
	];
	var searchIndex = [
		...games,
		...tools,
		...posts,
		...projects,
		...moreProjects,
		...contributions,
		{
			title: "Home",
			href: "/",
			kind: "Page",
			note: "Games, tools and writing."
		},
		{
			title: "Work",
			href: "/work/",
			kind: "Page",
			note: "Projects and open-source contributions."
		}
	];
	//#endregion
	//#region src/shared/site.ts
	var api = globalThis;
	var nav = navigator;
	var currentScript = document.currentScript;
	var SCRIPT_ROOT = new URL(".", currentScript instanceof HTMLScriptElement ? currentScript.src : location.href);
	var norm = (value) => value.toLowerCase();
	function score(item, query) {
		if (!query) return 1;
		const title = norm(item.title);
		if (title === query) return 100;
		if (title.startsWith(query)) return 70;
		if (title.includes(query)) return 50;
		const text = norm(`${item.title} ${item.kind} ${item.note} ${(item.tags ?? []).join(" ")}`);
		const words = query.split(/\s+/).filter(Boolean);
		return words.every((word) => text.includes(word)) ? 20 + words.length : 0;
	}
	var box;
	var input;
	var results;
	var opener = null;
	var active = 0;
	var visible = [];
	var shortcutLabel = /Mac|iPhone|iPad|iPod/i.test(nav.userAgentData?.platform || nav.platform || nav.userAgent) ? "⌘ K" : "Ctrl K";
	var syncShortcutLabels = () => document.querySelectorAll("[data-search-shortcut]").forEach((element) => element.textContent = shortcutLabel);
	syncShortcutLabels();
	addEventListener("samey-pageload", syncShortcutLabels);
	function resultNode(item, index) {
		const anchor = document.createElement("a");
		anchor.className = `search-result${index === active ? " active" : ""}`;
		anchor.href = new URL(item.href, SCRIPT_ROOT).href;
		const text = document.createElement("span");
		const title = document.createElement("b");
		const note = document.createElement("small");
		const meta = document.createElement("span");
		meta.className = "search-result-meta";
		const kind = document.createElement("em");
		const destination = document.createElement("span");
		destination.className = "search-result-destination";
		const targetUrl = new URL(item.href, SCRIPT_ROOT);
		const external = targetUrl.origin !== location.origin;
		const newPage = external || targetUrl.pathname !== location.pathname;
		title.textContent = item.title;
		note.textContent = item.note;
		kind.textContent = item.kind;
		destination.textContent = external ? "↗" : newPage ? "→" : "";
		destination.setAttribute("aria-label", external ? "External website" : newPage ? "Opens another page" : "Opens in this page");
		if (external) {
			anchor.target = "_blank";
			anchor.rel = "noopener noreferrer";
		}
		text.append(title, note);
		meta.append(kind, destination);
		anchor.append(text, meta);
		return anchor;
	}
	function render() {
		const query = norm(input.value.trim());
		visible = searchIndex.map((item) => [item, score(item, query)]).filter(([, rank]) => rank > 0).sort(([a, ar], [b, br]) => br - ar || a.title.localeCompare(b.title)).slice(0, 9).map(([item]) => item);
		active = Math.min(active, Math.max(0, visible.length - 1));
		if (visible.length) results.replaceChildren(...visible.map(resultNode));
		else {
			const empty = document.createElement("div");
			empty.className = "search-empty";
			empty.textContent = "No match";
			results.replaceChildren(empty);
		}
	}
	function close(restoreFocus = true) {
		if (!box || box.hidden) return;
		box.hidden = true;
		const target = opener;
		opener = null;
		if (restoreFocus && target) requestAnimationFrame(() => target.isConnected && target.focus());
	}
	function ensure() {
		if (box) return;
		box = document.createElement("div");
		box.className = "site-search";
		box.dataset.sameyRuntime = "";
		box.hidden = true;
		box.innerHTML = "<div class=\"site-search-backdrop\" data-close-search></div><div class=\"site-search-panel\" role=\"dialog\" aria-modal=\"true\" aria-label=\"Search\"><div class=\"site-search-input\"><span>›</span><input autocomplete=\"off\" spellcheck=\"false\" placeholder=\"Search games, tools, writing, work…\"><kbd>esc</kbd></div><div class=\"site-search-results\"></div></div>";
		document.body.append(box);
		input = box.querySelector("input");
		results = box.querySelector(".site-search-results");
		input.addEventListener("input", () => {
			active = 0;
			render();
		});
		box.addEventListener("click", (event) => {
			const target = event.target instanceof Element ? event.target : null;
			if (target?.closest("a.search-result")) close(false);
			else if (target?.closest("[data-close-search]")) close();
		});
		input.addEventListener("keydown", (event) => {
			if (event.key === "ArrowDown" || event.key === "ArrowUp") {
				event.preventDefault();
				active = (active + (event.key === "ArrowDown" ? 1 : visible.length - 1)) % Math.max(visible.length, 1);
				render();
			} else if (event.key === "Enter" && visible[active]) {
				event.preventDefault();
				const targetUrl = new URL(visible[active].href, SCRIPT_ROOT);
				close(false);
				if (targetUrl.origin !== location.origin) window.open(targetUrl.href, "_blank", "noopener,noreferrer");
				else if (api.SameyNavigate) api.SameyNavigate(targetUrl.href);
				else location.assign(targetUrl.href);
			}
		});
	}
	function open$1(trigger) {
		ensure();
		opener = trigger instanceof HTMLElement ? trigger : document.activeElement instanceof HTMLElement ? document.activeElement : null;
		box.hidden = false;
		active = 0;
		input.value = "";
		render();
		requestAnimationFrame(() => input.focus());
	}
	addEventListener("samey-pageleave", () => close(false));
	addEventListener("keydown", (event) => {
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
			event.preventDefault();
			box && !box.hidden ? close() : open$1();
		} else if (event.key === "Escape") close();
	});
	document.addEventListener("click", (event) => {
		const trigger = (event.target instanceof Element ? event.target : null)?.closest("[data-open-search]");
		if (trigger) open$1(trigger);
	});
	//#endregion
})();
