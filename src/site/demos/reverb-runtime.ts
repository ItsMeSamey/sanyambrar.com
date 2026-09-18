// Interactive Reverb demo runtime. The geometry and state mirror the Android
// Compose surfaces in the Reverb repository; the demo remains browser-only.
export type ReverbDemoDocument = Pick<Document, "createElement"> & {
  querySelector<E extends Element = Element>(selectors: string): E | null;
  querySelectorAll<E extends Element = Element>(
    selectors: string,
  ): NodeListOf<E>;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
};

type DemoRaf = (callback: FrameRequestCallback) => number;
type DemoSetTimeout = (
  handler: (...args: unknown[]) => void,
  timeout?: number,
  ...args: unknown[]
) => number;
type DemoClearTimeout = (id?: number) => void;
type DemoAddWindowEventListener = (
  type: keyof WindowEventMap,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
) => () => void;
type BufferSlot = "one" | "loop";
type RetentionMode = "time" | "size";
type GestureMode = "settings" | "library";
type ScreenId =
  | "homeScreen"
  | "settingsScreen"
  | "libraryScreen"
  | "incidentsScreen"
  | "rangeScreen";
type BlobRuntime = {
  setActive(active: boolean): void;
  setVisible(visible: boolean): void;
  refreshTheme(): void;
};
type Uniforms = Record<string, WebGLUniformLocation | null>;
type SettingsSnapshot = {
  theme: string;
  retentionMode: RetentionMode;
  oneValue: string;
  loopValue: string;
  dropdowns: string[];
  wake: boolean;
};

const NOISE_URL = new URL("./reverb-noise.png", import.meta.url).href;
const PAUSE_PATH = "#i-pause";
const WAVE_PATH = "#i-wave";
const bufferSlot = (value: string | undefined): BufferSlot =>
  value === "loop" ? "loop" : "one";

export function runReverbDemoRuntime(
  document: ReverbDemoDocument,
  requestAnimationFrame: DemoRaf,
  setTimeout: DemoSetTimeout,
  clearTimeout: DemoClearTimeout,
  devicePixelRatio: number,
  addWindowEventListener: DemoAddWindowEventListener,
): Pick<BlobRuntime, "refreshTheme"> & { dispose(): void } {
  const byId = <T extends Element = HTMLElement>(id: string): T => {
    const element = document.querySelector<T>(`#${id}`);
    if (!element) throw new Error(`Reverb demo is missing #${id}`);
    return element;
  };
  const phone = byId<HTMLElement>("phone");
  phone.style.setProperty("--reverb-noise", `url("${NOISE_URL}")`);
  phone.style.setProperty(
    "--reverb-noise-size",
    `${1024 / Math.max(devicePixelRatio || 1, 0.01)}px`,
  );
  const blobControl = byId<HTMLElement>("blobControl");
  const blobIconUse = byId<SVGUseElement>("blobIconUse");
  const blobTime = byId<HTMLElement>("blobTime");
  const blobSummary = byId<HTMLElement>("blobSummary");
  const toast = byId<HTMLElement>("toast");
  const dropdownMenu = byId<HTMLElement>("dropdownMenu");
  const screens = [...document.querySelectorAll<HTMLElement>(".screen")];

  let currentScreen: ScreenId = "homeScreen";
  let settingsReturnScreen: ScreenId = "homeScreen";
  let incidentsReturnScreen: ScreenId = "homeScreen";
  let live = true;
  let activeBuffer: BufferSlot | null = "one";
  let selectedBuffer: BufferSlot = "one";
  let oneSeconds = 4 * 3600 + 55 * 60 + 42;
  let loopSeconds = 47 * 3600 + 59 * 60 + 55;
  let oneLimitSeconds = 24 * 3600;
  let loopLimitSeconds = 48 * 3600;
  const bytesPerSecond = 44100 * 2;
  let lastTick = performance.now();
  let toastTimer = 0;
  let settingsDirty = false;
  let retentionMode: RetentionMode = "time";
  let settingsInitial: SettingsSnapshot;

  const blobShader = makeBlobShader(byId<HTMLCanvasElement>("blobCanvas"));
  blobShader.setActive(true);

  function formatTimer(seconds: number): string {
    const value = Math.max(0, Math.floor(seconds));
    const h = Math.floor(value / 3600);
    const m = Math.floor((value % 3600) / 60);
    const s = value % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${m}:${String(s).padStart(2, "0")}`;
  }
  function formatMiB(seconds: number): string {
    return `${((seconds * bytesPerSecond) / (1024 * 1024)).toFixed(1)} MiB`;
  }
  function parseDuration(value: string): number | null {
    const parts = value.trim().split(":");
    if (
      parts.length < 1 ||
      parts.length > 3 ||
      parts.some((part) => !/^\d+$/.test(part))
    )
      return null;
    const values = parts.map(Number);
    if (parts.length === 3 && (values[1] >= 60 || values[2] >= 60)) return null;
    if (parts.length === 2 && values[1] >= 60) return null;
    return parts.length === 3
      ? values[0] * 3600 + values[1] * 60 + values[2]
      : parts.length === 2
        ? values[0] * 60 + values[1]
        : values[0];
  }
  function currentSeconds(): number {
    return selectedBuffer === "one" ? oneSeconds : loopSeconds;
  }
  function showToast(message: string): void {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1200);
  }
  function showScreen(id: ScreenId): void {
    currentScreen = id;
    screens.forEach((screen) =>
      screen.classList.toggle("active", screen.id === id),
    );
    blobShader.setVisible(id === "homeScreen");
    closeDropdown();
  }
  function openSettings(): void {
    if (currentScreen !== "settingsScreen")
      settingsReturnScreen = currentScreen;
    showScreen("settingsScreen");
  }
  function openIncidents(): void {
    if (currentScreen !== "incidentsScreen")
      incidentsReturnScreen = currentScreen;
    showScreen("incidentsScreen");
  }
  function setIncidentAlert(active: boolean): void {
    document
      .querySelectorAll<HTMLElement>(".top-action.incidents")
      .forEach((button) => button.classList.toggle("alert", active));
  }
  function updateClock(): void {
    const now = new Date();
    let h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, "0");
    h = h % 12 || 12;
    document.querySelectorAll<HTMLElement>(".status-time").forEach((node) => {
      node.textContent = `${h}:${m}`;
    });
  }
  updateClock();
  setTimeout(function clockTick() {
    updateClock();
    setTimeout(clockTick, 30000);
  }, 30000);

  function syncBufferUi(): void {
    document
      .querySelectorAll<HTMLElement>(".buffer-segment")
      .forEach((segment) => {
        const slot = bufferSlot(segment.dataset.buffer);
        const selected = slot === selectedBuffer;
        const recording = live && activeBuffer === slot;
        segment.classList.toggle("selected", selected);
        segment.classList.toggle("idle", selected && !recording);
        segment.setAttribute("aria-selected", String(selected));
      });
    const displayedActive = live && activeBuffer === selectedBuffer;
    const blockedByOther =
      live && activeBuffer != null && activeBuffer !== selectedBuffer;
    blobControl.classList.toggle("live", displayedActive);
    blobControl.classList.toggle("dimmed", blockedByOther);
    blobControl.setAttribute(
      "aria-label",
      displayedActive ? "Tap to pause buffer" : "Tap to record buffer",
    );
    blobIconUse.setAttribute("href", displayedActive ? PAUSE_PATH : WAVE_PATH);
    blobTime.textContent = formatTimer(currentSeconds());
    blobSummary.textContent = formatMiB(currentSeconds());
    blobSummary.classList.toggle("hidden", !displayedActive);
    byId<HTMLButtonElement>("clearBuffer").disabled = displayedActive;
    blobShader.setActive(displayedActive && !phone.classList.contains("about-open"));
  }
  function appendCapture(seconds: number): void {
    if (!live || activeBuffer == null || seconds <= 0) return;
    if (activeBuffer === "one") {
      oneSeconds = Math.min(oneLimitSeconds, oneSeconds + seconds);
      if (oneSeconds >= oneLimitSeconds) {
        live = false;
        activeBuffer = null;
      }
    } else {
      loopSeconds = Math.min(loopLimitSeconds, loopSeconds + seconds);
    }
  }
  function scheduleTick(): void {
    const elapsed = performance.now() - lastTick;
    setTimeout(tick, Math.max(16, 1000 - (elapsed % 1000)));
  }
  function tick(): void {
    const now = performance.now();
    if (now - lastTick >= 1000) {
      const elapsed = Math.floor((now - lastTick) / 1000);
      lastTick += elapsed * 1000;
      appendCapture(elapsed);
      syncBufferUi();
    }
    scheduleTick();
  }
  syncBufferUi();
  scheduleTick();

  const rememberedRangeDurationSeconds = 2 * 3600 + 23 * 60 + 53.7;
  function formatRangeTime(seconds: number): string {
    const tenths = Math.max(0, Math.round(seconds * 10));
    const h = Math.floor(tenths / 36000);
    const m = Math.floor((tenths % 36000) / 600);
    const s = Math.floor((tenths % 600) / 10);
    const t = tenths % 10;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${t}`
      : `${m}:${String(s).padStart(2, "0")}.${t}`;
  }
  function syncRangeUi(): void {
    const end = Math.max(0.1, currentSeconds());
    const selection = Math.min(rememberedRangeDurationSeconds, end);
    const start = Math.max(0, end - selection);
    const startFraction = Math.max(0, Math.min(1, start / end));
    byId("rangeStart").textContent = formatRangeTime(start);
    byId("rangeEnd").textContent = formatRangeTime(end);
    byId("rangeDurationLabel").textContent = formatRangeTime(end);

    const timelineWidth = 375;
    const timelineInset = 12;
    const waveformWidth = timelineWidth - timelineInset * 2;
    const bubbleWidth = 100;
    const markerX = timelineInset + waveformWidth * startFraction;
    const bubbleLeft = Math.max(
      0,
      Math.min(timelineWidth - bubbleWidth, markerX - bubbleWidth / 2),
    );
    byId<HTMLElement>("rangeStart").style.left = `${bubbleLeft}px`;
    byId<HTMLElement>("rangeStartBoundary").style.left =
      `${startFraction * 100}%`;
    const selectedRect = byId<SVGRectElement>("selectedWaveRect");
    const clipX = 360 * startFraction;
    selectedRect.setAttribute("x", clipX.toFixed(2));
    selectedRect.setAttribute("width", Math.max(0, 360 - clipX).toFixed(2));

    const loop = selectedBuffer === "loop";
    byId("rangeBufferLabel").textContent = loop ? "Looping" : "One-shot";
    byId<SVGUseElement>("rangeBufferIcon").setAttribute(
      "href",
      loop ? "#i-loop" : "#i-one",
    );
  }

  document.querySelectorAll<HTMLElement>(".buffer-segment").forEach((segment) =>
    segment.addEventListener("click", () => {
      selectedBuffer = bufferSlot(segment.dataset.buffer);
      syncBufferUi();
    }),
  );
  blobControl.addEventListener("pointerdown", () =>
    blobControl.classList.add("pressed"),
  );
  ["pointerup", "pointercancel", "pointerleave"].forEach((type) =>
    blobControl.addEventListener(type, () =>
      blobControl.classList.remove("pressed"),
    ),
  );
  blobControl.addEventListener("click", () => {
    if (live && activeBuffer === selectedBuffer) {
      live = false;
      activeBuffer = null;
    } else {
      live = true;
      activeBuffer = selectedBuffer;
    }
    syncBufferUi();
  });

  byId("openSettings").addEventListener("click", openSettings);
  byId("librarySettings").addEventListener("click", () => {
    settingsReturnScreen = "homeScreen";
    showScreen("settingsScreen");
  });
  byId("rangeSettings").addEventListener("click", openSettings);
  byId("openIncidents").addEventListener("click", openIncidents);
  byId("libraryIncidents").addEventListener("click", () => {
    incidentsReturnScreen = "homeScreen";
    showScreen("incidentsScreen");
  });
  byId("rangeIncidents").addEventListener("click", openIncidents);
  byId("openLibrary").addEventListener("click", () =>
    showScreen("libraryScreen"),
  );
  byId("openRange").addEventListener("click", () => {
    syncRangeUi();
    showScreen("rangeScreen");
  });
  byId("rangeClose").addEventListener("click", () => showScreen("homeScreen"));
  byId("incidentsBack").addEventListener("click", () =>
    showScreen(incidentsReturnScreen),
  );

  const aboutSheet = byId<HTMLElement>("aboutSheet");
  let aboutReturnFocus: HTMLElement | null = null;
  const aboutFocusable = () => [...aboutSheet.querySelectorAll<HTMLElement>(
    'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])',
  )].filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
  const openAbout = (event: Event) => {
    aboutReturnFocus = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    aboutSheet.inert = false;
    aboutSheet.setAttribute("aria-hidden", "false");
    phone.classList.add("about-open");
    // The Android app hides the live visualizer while the About dialog is open,
    // which lets the blob settle back to its compact idle body under the scrim.
    syncBufferUi();
    requestAnimationFrame(() => byId<HTMLElement>("aboutClose").focus({ preventScroll: true }));
  };
  const closeAbout = () => {
    if (!phone.classList.contains("about-open")) return;
    phone.classList.remove("about-open");
    aboutSheet.inert = true;
    aboutSheet.setAttribute("aria-hidden", "true");
    syncBufferUi();
    const target = aboutReturnFocus;
    aboutReturnFocus = null;
    if (target) requestAnimationFrame(() => target.isConnected && target.focus({ preventScroll: true }));
  };
  ["brandButton", "libraryBrand", "rangeBrand"].forEach((id) =>
    byId(id).addEventListener("click", openAbout),
  );
  byId("aboutClose").addEventListener("click", () => closeAbout());
  byId("aboutScrim").addEventListener("click", () => closeAbout());
  document.addEventListener("keydown", (event) => {
    if (!(event instanceof KeyboardEvent) || !phone.classList.contains("about-open")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeAbout();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = aboutFocusable();
    if (!focusable.length) return;
    const current = event.target instanceof HTMLElement ? event.target : null;
    const index = current ? focusable.indexOf(current) : -1;
    const next = event.shiftKey
      ? index <= 0 ? focusable[focusable.length - 1] : focusable[index - 1]
      : index < 0 || index === focusable.length - 1 ? focusable[0] : focusable[index + 1];
    event.preventDefault();
    next.focus({ preventScroll: true });
  });
  const incidentCard = byId<HTMLElement>("incidentCard");
  const incidentIndicator = byId<HTMLElement>("ackIncident");
  const incidentCheckUse = byId<SVGUseElement>("incidentCheckUse");
  let incidentAcknowledged = true;
  let incidentHoldTimer = 0;
  let incidentHoldTriggered = false;
  const incidentCopyText = incidentCard.innerText.trim();
  const syncIncidentState = () => {
    incidentCard.classList.toggle("unread", !incidentAcknowledged);
    incidentCheckUse.setAttribute(
      "href",
      incidentAcknowledged ? "#i-checked" : "#i-unchecked",
    );
    incidentIndicator.setAttribute(
      "aria-label",
      incidentAcknowledged
        ? "Mark incident unchecked"
        : "Mark incident checked",
    );
    setIncidentAlert(!incidentAcknowledged);
  };
  const copyIncident = () => {
    incidentHoldTriggered = true;
    void navigator.clipboard
      ?.writeText(incidentCopyText)
      .catch(() => undefined);
    showToast("Incident copied");
  };
  incidentCard.addEventListener("click", () => {
    if (incidentHoldTriggered) {
      incidentHoldTriggered = false;
      return;
    }
    incidentAcknowledged = !incidentAcknowledged;
    syncIncidentState();
  });
  incidentCard.addEventListener("pointerdown", () => {
    incidentHoldTriggered = false;
    clearTimeout(incidentHoldTimer);
    incidentHoldTimer = setTimeout(copyIncident, 520);
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((type) =>
    incidentCard.addEventListener(type, () => clearTimeout(incidentHoldTimer)),
  );
  incidentCard.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    clearTimeout(incidentHoldTimer);
    copyIncident();
  });
  syncIncidentState();
  document
    .querySelectorAll<HTMLElement>("[data-toast]")
    .forEach((element) =>
      element.addEventListener("click", () =>
        showToast(element.dataset.toast ?? ""),
      ),
    );
  document
    .querySelectorAll<HTMLElement>(".recording-card")
    .forEach((card) =>
      card.addEventListener("click", () =>
        showToast(card.dataset.recording ?? "Recording"),
      ),
    );

  function makeRangeWavePath(): string {
    const width = 360;
    const center = 41;
    const samples = 181;
    let seed = 0x5eed1234;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    const top: string[] = [];
    const bottom: string[] = [];
    for (let index = 0; index < samples; index++) {
      const x = (index / (samples - 1)) * width;
      const phase = index / (samples - 1);
      const slow = 0.55 + 0.18 * Math.sin(phase * 21.4 + 0.7);
      const texture = 0.23 * Math.abs(Math.sin(phase * 83.1 + 1.3));
      const noise = 0.16 + random() * 0.34;
      let amplitude = 9 + 16 * Math.min(1, slow + texture + noise);
      if (index === 33 || index === 34 || index === 153) amplitude += 8;
      if (index === 118 || index === 160) amplitude += 5;
      amplitude = Math.min(34, amplitude);
      top.push(`${x.toFixed(1)} ${(center - amplitude * 0.52).toFixed(1)}`);
      bottom.push(`${x.toFixed(1)} ${(center + amplitude * 0.52).toFixed(1)}`);
    }
    return `M${top.join(" L")} L${bottom.reverse().join(" L")} Z`;
  }
  const rangeWavePath = makeRangeWavePath();
  document
    .querySelectorAll<SVGPathElement>(".wave-outside,.wave-selection")
    .forEach((path) => path.setAttribute("d", rangeWavePath));

  const rangePlay = byId<HTMLElement>("rangePlay");
  let rangePlaying = false;
  rangePlay.addEventListener("click", () => {
    rangePlaying = !rangePlaying;
    const use = rangePlay.querySelector("use");
    use?.setAttribute("href", rangePlaying ? "#i-pause" : "#i-play");
    rangePlay.setAttribute("aria-label", rangePlaying ? "Pause" : "Play");
  });

  const wakeSwitch = byId<HTMLElement>("wakeSwitch");
  const themeSegments = [
    ...document.querySelectorAll<HTMLElement>("#themeSegments .segment"),
  ];
  const retentionSegments = [
    ...document.querySelectorAll<HTMLElement>("#retentionSegments .segment"),
  ];
  const oneRetention = byId<HTMLInputElement>("oneRetention");
  const loopRetention = byId<HTMLInputElement>("loopRetention");
  const dropdownValues = () => [
    ...document.querySelectorAll<HTMLElement>(".settings-card.dropdown .value"),
  ];
  function selectedTheme(): string {
    return (
      themeSegments.find((segment) => segment.classList.contains("selected"))
        ?.dataset.theme ?? "Auto"
    );
  }
  function captureSettingsSnapshot(): SettingsSnapshot {
    return {
      theme: selectedTheme(),
      retentionMode,
      oneValue: oneRetention.value,
      loopValue: loopRetention.value,
      dropdowns: dropdownValues().map((value) => value.textContent ?? ""),
      wake: wakeSwitch.classList.contains("on"),
    };
  }
  settingsInitial = captureSettingsSnapshot();
  function setDirty(dirty = true): void {
    settingsDirty = dirty;
    byId("settingsDone").classList.toggle("disabled", !dirty);
    byId("settingsNavBack").style.display = dirty ? "none" : "block";
    byId("settingsNavUndo").style.display = dirty ? "block" : "none";
    byId("settingsNav").setAttribute("aria-label", dirty ? "Undo" : "Back");
  }
  function setRetentionMode(mode: RetentionMode, dirty = true): void {
    retentionMode = mode;
    retentionSegments.forEach((segment) =>
      segment.classList.toggle(
        "selected",
        segment.dataset.retentionMode === mode,
      ),
    );
    if (mode === "time") {
      oneRetention.value = formatTimer(oneLimitSeconds);
      loopRetention.value = formatTimer(loopLimitSeconds);
      byId("oneEstimate").textContent =
        `≈ ${Math.round((oneLimitSeconds * bytesPerSecond) / (1024 * 1024))} MiB`;
      byId("loopEstimate").textContent =
        `≈ ${Math.round((loopLimitSeconds * bytesPerSecond) / (1024 * 1024))} MiB`;
    } else {
      oneRetention.value = String(
        Math.round((oneLimitSeconds * bytesPerSecond) / (1024 * 1024)),
      );
      loopRetention.value = String(
        Math.round((loopLimitSeconds * bytesPerSecond) / (1024 * 1024)),
      );
      byId("oneEstimate").textContent = `≈ ${formatTimer(oneLimitSeconds)}`;
      byId("loopEstimate").textContent = `≈ ${formatTimer(loopLimitSeconds)}`;
    }
    if (dirty) setDirty();
  }
  function applyRetentionInputs(): void {
    if (retentionMode === "time") {
      const one = parseDuration(oneRetention.value),
        loop = parseDuration(loopRetention.value);
      if (one != null) oneLimitSeconds = one;
      if (loop != null) loopLimitSeconds = loop;
    } else {
      const one = Number.parseFloat(oneRetention.value),
        loop = Number.parseFloat(loopRetention.value);
      if (Number.isFinite(one) && one >= 0)
        oneLimitSeconds = (one * 1024 * 1024) / bytesPerSecond;
      if (Number.isFinite(loop) && loop >= 0)
        loopLimitSeconds = (loop * 1024 * 1024) / bytesPerSecond;
    }
    oneSeconds = Math.min(oneSeconds, oneLimitSeconds);
    loopSeconds = Math.min(loopSeconds, loopLimitSeconds);
    setRetentionMode(retentionMode, false);
    syncBufferUi();
  }
  themeSegments.forEach((segment) =>
    segment.addEventListener("click", () => {
      themeSegments.forEach((item) =>
        item.classList.toggle("selected", item === segment),
      );
      setDirty();
    }),
  );
  retentionSegments.forEach((segment) =>
    segment.addEventListener("click", () =>
      setRetentionMode(
        segment.dataset.retentionMode === "size" ? "size" : "time",
      ),
    ),
  );
  [oneRetention, loopRetention].forEach((input) => {
    input.addEventListener("input", () => setDirty());
    input.addEventListener("change", applyRetentionInputs);
  });
  wakeSwitch.addEventListener("click", () => {
    const on = !wakeSwitch.classList.contains("on");
    wakeSwitch.classList.toggle("on", on);
    wakeSwitch.setAttribute("aria-checked", String(on));
    setDirty();
  });
  function restoreSettings(): void {
    themeSegments.forEach((segment) =>
      segment.classList.toggle(
        "selected",
        segment.dataset.theme === settingsInitial.theme,
      ),
    );
    dropdownValues().forEach((value, index) => {
      value.textContent = settingsInitial.dropdowns[index] ?? "";
    });
    wakeSwitch.classList.toggle("on", settingsInitial.wake);
    wakeSwitch.setAttribute("aria-checked", String(settingsInitial.wake));
    retentionMode = settingsInitial.retentionMode;
    oneRetention.value = settingsInitial.oneValue;
    loopRetention.value = settingsInitial.loopValue;
    setRetentionMode(retentionMode, false);
    setDirty(false);
  }
  byId("settingsNav").addEventListener("click", () => {
    if (settingsDirty) restoreSettings();
    else showScreen(settingsReturnScreen);
  });
  byId("settingsDone").addEventListener("click", () => {
    if (!settingsDirty) return;
    applyRetentionInputs();
    settingsInitial = captureSettingsSnapshot();
    setDirty(false);
    showScreen(settingsReturnScreen);
  });

  let activeDropdown: HTMLElement | null = null;
  function closeDropdown(): void {
    dropdownMenu.classList.remove("show");
    dropdownMenu.replaceChildren();
    activeDropdown = null;
  }
  document
    .querySelector<HTMLElement>(".settings-body")
    ?.addEventListener("scroll", closeDropdown, { passive: true });
  const removeResizeListener = addWindowEventListener("resize", closeDropdown, {
    passive: true,
  });
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (
        activeDropdown &&
        event.target instanceof Node &&
        !dropdownMenu.contains(event.target) &&
        !activeDropdown.contains(event.target)
      )
        closeDropdown();
    },
    true,
  );
  document
    .querySelectorAll<HTMLElement>(".settings-card.dropdown")
    .forEach((field) =>
      field.addEventListener("click", (event) => {
        event.stopPropagation();
        closeDropdown();
        activeDropdown = field;
        const options = (field.dataset.options ?? "")
          .split("|")
          .filter(Boolean);
        const value = field.querySelector<HTMLElement>(".value");
        if (!value) return;
        options.forEach((option) => {
          const button = document.createElement("button");
          button.className = "dropdown-item";
          button.textContent = option;
          button.addEventListener("click", () => {
            value.textContent = option;
            setDirty();
            closeDropdown();
          });
          dropdownMenu.appendChild(button);
        });
        const rect = field.getBoundingClientRect(),
          root = phone.getBoundingClientRect();
        dropdownMenu.style.left = `${Math.max(8, rect.left - root.left)}px`;
        dropdownMenu.style.top = `${Math.min(root.height - 310, rect.bottom - root.top + 4)}px`;
        dropdownMenu.style.width = `${Math.max(160, rect.width)}px`;
        dropdownMenu.classList.add("show");
      }),
    );

  // Capture screen gestures match the app: down above the blob opens settings;
  // up below it opens the library. Library edge-drag down closes it.
  const interactive =
    'button,input,a,[role="button"],[role="switch"],.settings-card';
  function gestureMode(
    clientY: number,
    target: EventTarget | null,
  ): GestureMode | null {
    if (
      currentScreen !== "homeScreen" ||
      phone.classList.contains("about-open")
    )
      return null;
    if (target instanceof Element && target.closest(interactive)) return null;
    const rect = blobControl.getBoundingClientRect();
    if (clientY < rect.top) return "settings";
    if (clientY > rect.bottom) return "library";
    return null;
  }
  function completeGesture(mode: GestureMode, deltaY: number): boolean {
    if (mode === "settings" && deltaY >= 52) {
      settingsReturnScreen = "homeScreen";
      showScreen("settingsScreen");
      return true;
    }
    if (mode === "library" && deltaY <= -52) {
      showScreen("libraryScreen");
      return true;
    }
    return false;
  }
  let dragStartY: number | null = null,
    dragMode: GestureMode | null = null,
    libraryDragY: number | null = null;
  phone.addEventListener("pointerdown", (event) => {
    if (currentScreen === "libraryScreen") {
      const rect = phone.getBoundingClientRect();
      const edge = rect.width * 0.13;
      const x = event.clientX - rect.left;
      if (x <= edge || x >= rect.width - edge) libraryDragY = event.clientY;
      return;
    }
    dragMode = gestureMode(event.clientY, event.target);
    dragStartY = dragMode ? event.clientY : null;
  });
  phone.addEventListener("pointermove", (event) => {
    if (libraryDragY != null && event.clientY - libraryDragY >= 64) {
      libraryDragY = null;
      showScreen("homeScreen");
      return;
    }
    if (
      dragStartY != null &&
      dragMode &&
      completeGesture(dragMode, event.clientY - dragStartY)
    ) {
      dragStartY = null;
      dragMode = null;
    }
  });
  const clearGesture = () => {
    dragStartY = null;
    dragMode = null;
    libraryDragY = null;
  };
  phone.addEventListener("pointerup", clearGesture);
  phone.addEventListener("pointercancel", clearGesture);

  // WebGL port of AudioBlobView's RuntimeShader. Formula/constants are kept source-equivalent.
  function resolveCssColor(
    element: Element,
    variable: string,
    fallback: string,
  ) {
    const probe = document.createElement("span");
    probe.style.cssText = `position:absolute;pointer-events:none;visibility:hidden;color:var(${variable},${fallback})`;
    (element.parentNode ?? phone).appendChild(probe);
    const color = getComputedStyle(probe).color || fallback;
    probe.remove();
    return color;
  }

  function makeWebGLBlob(canvas: HTMLCanvasElement): BlobRuntime {
    const context = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
    });
    if (!context) {
      return makeFallbackBlob(canvas);
    }
    const gl: WebGLRenderingContext = context;
    const vs = `attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}`;
    const precisionInfo = gl.getShaderPrecisionFormat(
      gl.FRAGMENT_SHADER,
      gl.HIGH_FLOAT,
    );
    const fragmentPrecision =
      precisionInfo && precisionInfo.precision ? "highp" : "mediump";
    const fs = `precision ${fragmentPrecision} float;
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
  float blobRadius=baseRadius+active*life*(idle+audioWave*(0.105+activity*0.030));
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
    function shader(type: number, src: string) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("Unable to create Reverb demo shader");
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error(
          gl.getShaderInfoLog(shader) || "Unable to compile Reverb demo shader",
        );
      return shader;
    }
    const prog = gl.createProgram();
    if (!prog) throw new Error("Unable to create Reverb demo shader program");
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
      throw new Error(
        gl.getProgramInfoLog(prog) || "Unable to link Reverb demo shader",
      );
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    if (!buf) throw new Error("Unable to create Reverb demo vertex buffer");
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const locA = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(locA);
    gl.vertexAttribPointer(locA, 2, gl.FLOAT, false, 0, 0);
    const u: Uniforms = {};
    [
      "resolution",
      "time",
      "activity",
      "life",
      "active",
      "bands0",
      "bands1",
      "primaryColor",
      "tertiaryColor",
      "pausedColor",
    ].forEach((n) => (u[n] = gl.getUniformLocation(prog, n)));
    const colorCanvas = document.createElement("canvas"),
      colorCtx = colorCanvas.getContext("2d");
    colorCanvas.width = colorCanvas.height = 1;
    function colorVector(
      variable: string,
      fallback: string,
    ): [number, number, number, number] {
      if (!colorCtx) return [0, 0, 0, 1];
      colorCtx.clearRect(0, 0, 1, 1);
      colorCtx.fillStyle = "#000";
      colorCtx.fillStyle = resolveCssColor(canvas, variable, fallback);
      colorCtx.fillRect(0, 0, 1, 1);
      const pixel = colorCtx.getImageData(0, 0, 1, 1).data;
      return [pixel[0] / 255, pixel[1] / 255, pixel[2] / 255, pixel[3] / 255];
    }
    function refreshWebGLTheme() {
      gl.useProgram(prog);
      gl.uniform4fv(u.primaryColor, colorVector("--blob-primary", "#2DD4BF"));
      gl.uniform4fv(u.tertiaryColor, colorVector("--blob-tertiary", "#ACCBE5"));
      gl.uniform4fv(
        u.pausedColor,
        colorVector("--surface-container-highest", "#2A3244"),
      );
    }
    refreshWebGLTheme();
    let targetLife = 1,
      currentLife = 1,
      targetActivity = 0.22,
      currentActivity = 0.22;
    const targetBands = new Float32Array(8),
      currentBands = new Float32Array(8);
    let activeState = true,
      visibleState = true,
      last = performance.now(),
      signalClock = 0,
      frameQueued = false;
    let fallback: BlobRuntime | null = null;
    function failOverTo2d() {
      if (fallback) return fallback;
      fallback = makeFallbackBlob(canvas);
      fallback.setActive(activeState);
      fallback.setVisible(visibleState);
      fallback.refreshTheme();
      return fallback;
    }
    canvas.addEventListener(
      "webglcontextlost",
      () => {
        failOverTo2d();
      },
      { once: true },
    );
    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width * dpr)),
        h = Math.max(1, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(u.resolution, w, h);
    }
    function advance(dt: number) {
      const normalized = Math.max(0.25, Math.min(3, dt * 30));
      let rate = targetActivity > currentActivity ? 0.72 : 0.16;
      let mix = 1 - Math.pow(1 - rate, normalized);
      currentActivity += (targetActivity - currentActivity) * mix;
      for (let i = 0; i < 8; i++) {
        rate = targetBands[i] > currentBands[i] ? 0.68 : 0.13;
        mix = 1 - Math.pow(1 - rate, normalized);
        currentBands[i] += (targetBands[i] - currentBands[i]) * mix;
      }
      rate = targetLife > currentLife ? 0.18 : 0.15;
      mix = 1 - Math.pow(1 - rate, normalized);
      currentLife += (targetLife - currentLife) * mix;
      if (Math.abs(currentLife - targetLife) <= 0.006) currentLife = targetLife;
    }
    function syntheticSignal(ts: number) {
      if (!activeState) {
        targetActivity = 0;
        targetBands.fill(0);
        return;
      }
      if (ts - signalClock < 85) return;
      signalClock = ts;
      const x = ts / 1000;
      targetActivity =
        0.2 + 0.22 * (0.5 + 0.5 * Math.sin(x * 1.7)) + 0.09 * Math.random();
      for (let i = 0; i < 8; i++) {
        const harmonic = 0.5 + 0.5 * Math.sin(x * (1.13 + i * 0.16) + i * 0.83);
        const pulse = 0.5 + 0.5 * Math.sin(x * 0.41 + i * 1.7);
        targetBands[i] = Math.max(
          0.025,
          Math.min(
            0.82,
            0.07 +
              harmonic * (0.12 + 0.21 * targetActivity) +
              pulse * 0.07 +
              Math.random() * 0.09,
          ),
        );
      }
    }
    const queueFrame = () => {
      if (visibleState && !fallback && !frameQueued) {
        frameQueued = true;
        requestAnimationFrame(frame);
      }
    };
    function frame(now: number) {
      frameQueued = false;
      if (!visibleState || fallback) return;
      if (gl.isContextLost()) {
        failOverTo2d();
        return;
      }
      resize();
      const dt = Math.max(0.001, Math.min(0.1, (now - last) / 1000));
      last = now;
      syntheticSignal(now);
      advance(dt);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.uniform1f(u.time, now / 1000);
      gl.uniform1f(u.activity, currentActivity);
      gl.uniform1f(u.life, currentLife);
      gl.uniform1f(u.active, activeState ? 1 : 0);
      gl.uniform4fv(u.bands0, currentBands.subarray(0, 4));
      gl.uniform4fv(u.bands1, currentBands.subarray(4, 8));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      queueFrame();
    }
    queueFrame();
    return {
      setActive(v: boolean) {
        activeState = v;
        targetLife = v ? 1 : 0.38;
        if (!v) {
          targetActivity = 0;
          targetBands.fill(0);
        }
        fallback?.setActive(v);
      },
      setVisible(v: boolean) {
        visibleState = v;
        fallback?.setVisible(v);
        if (v) {
          last = performance.now();
          queueFrame();
        }
      },
      refreshTheme() {
        if (fallback) fallback.refreshTheme();
        else refreshWebGLTheme();
      },
    };
  }
  function makeBlobShader(canvas: HTMLCanvasElement): BlobRuntime {
    try {
      return makeWebGLBlob(canvas);
    } catch (error) {
      console.warn("Reverb demo WebGL unavailable; using 2D fallback", error);
      return makeFallbackBlob(canvas);
    }
  }

  function makeFallbackBlob(sourceCanvas: HTMLCanvasElement): BlobRuntime {
    let canvas = sourceCanvas,
      ctx = canvas.getContext("2d");
    if (!ctx && canvas.parentNode) {
      // Once a WebGL context has been created the same canvas cannot switch to
      // 2D. Replace it so shader/link failures still get the animated fallback.
      const replacement = canvas.cloneNode(false);
      if (!(replacement instanceof HTMLCanvasElement))
        throw new Error("Unable to clone Reverb demo canvas");
      canvas.replaceWith(replacement);
      canvas = replacement;
      ctx = canvas.getContext("2d");
    }
    if (!ctx) {
      canvas.style.background =
        "radial-gradient(circle at 45% 42%,color-mix(in srgb,var(--blob-primary) 90%,transparent) 0 13%,color-mix(in srgb,var(--blob-tertiary) 45%,transparent) 22%,transparent 42%)";
      return {
        setActive(v: boolean) {
          canvas.style.opacity = v ? "1" : ".56";
        },
        setVisible() {},
        refreshTheme() {},
      };
    }
    const context2d: CanvasRenderingContext2D = ctx;
    let primaryColor = "#2DD4BF",
      tertiaryColor = "#ACCBE5",
      pausedColor = "#2A3244";
    function refreshTheme() {
      primaryColor = resolveCssColor(canvas, "--blob-primary", "#2DD4BF");
      tertiaryColor = resolveCssColor(canvas, "--blob-tertiary", "#ACCBE5");
      pausedColor = resolveCssColor(
        canvas,
        "--surface-container-highest",
        "#2A3244",
      );
    }
    refreshTheme();
    let targetLife = 1,
      currentLife = 1,
      targetActivity = 0.22,
      currentActivity = 0.22,
      activeState = true,
      visibleState = true,
      last = performance.now(),
      signalClock = 0,
      frameQueued = false;
    const targetBands = new Float32Array(8),
      currentBands = new Float32Array(8),
      x = new Float32Array(40),
      y = new Float32Array(40);
    function syntheticSignal(ts: number) {
      if (!activeState) {
        targetActivity = 0;
        targetBands.fill(0);
        return;
      }
      if (ts - signalClock < 85) return;
      signalClock = ts;
      const x = ts / 1000;
      targetActivity =
        0.2 + 0.22 * (0.5 + 0.5 * Math.sin(x * 1.7)) + 0.09 * Math.random();
      for (let i = 0; i < 8; i++) {
        const harmonic = 0.5 + 0.5 * Math.sin(x * (1.13 + i * 0.16) + i * 0.83),
          pulse = 0.5 + 0.5 * Math.sin(x * 0.41 + i * 1.7);
        targetBands[i] = Math.max(
          0.025,
          Math.min(
            0.82,
            0.07 +
              harmonic * (0.12 + 0.21 * targetActivity) +
              pulse * 0.07 +
              Math.random() * 0.09,
          ),
        );
      }
    }
    function advance(dt: number) {
      const normalized = Math.max(0.25, Math.min(3, dt * 30));
      let rate = targetActivity > currentActivity ? 0.34 : 0.16,
        mix = Math.min(0.82, rate * normalized);
      currentActivity += (targetActivity - currentActivity) * mix;
      for (let i = 0; i < 8; i++) {
        rate = targetBands[i] > currentBands[i] ? 0.3 : 0.13;
        mix = Math.min(0.8, rate * normalized);
        currentBands[i] += (targetBands[i] - currentBands[i]) * mix;
      }
      rate = targetLife > currentLife ? 0.18 : 0.15;
      mix = Math.min(0.65, rate * normalized);
      currentLife += (targetLife - currentLife) * mix;
      if (Math.abs(currentLife - targetLife) <= 0.006) currentLife = targetLife;
    }
    const queueFrame = () => {
      if (visibleState && !frameQueued) {
        frameQueued = true;
        requestAnimationFrame(frame);
      }
    };
    function frame(now: number) {
      frameQueued = false;
      if (!visibleState) return;
      const r = canvas.getBoundingClientRect(),
        dpr = Math.min(devicePixelRatio || 1, 2),
        w = Math.max(1, Math.round(r.width * dpr)),
        h = Math.max(1, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const dt = Math.max(0.001, Math.min(0.1, (now - last) / 1000));
      last = now;
      syntheticSignal(now);
      advance(dt);
      context2d.clearRect(0, 0, w, h);
      const min = Math.min(w, h),
        cx = w * 0.5,
        cy = h * 0.5,
        base = min * (0.095 + currentLife * (0.235 + currentActivity * 0.018));
      for (let i = 0; i < 40; i++) {
        const angle = (i / 40) * Math.PI * 2 - Math.PI / 2,
          band = currentBands[Math.floor((i * 8) / 40)];
        const idle = activeState
          ? Math.sin(angle * 3 + (now / 1000) * 0.8) * min * 0.005 +
            Math.sin(angle * 5 - (now / 1000) * 0.55) * min * 0.0025
          : 0;
        const radius = base + (activeState ? band * min * 0.105 + idle : 0);
        x[i] = cx + Math.cos(angle) * radius;
        y[i] = cy + Math.sin(angle) * radius;
      }
      context2d.beginPath();
      context2d.moveTo((x[0] + x[1]) * 0.5, (y[0] + y[1]) * 0.5);
      for (let i = 1; i <= 40; i++) {
        const cur = i % 40,
          next = (i + 1) % 40;
        context2d.quadraticCurveTo(
          x[cur],
          y[cur],
          (x[cur] + x[next]) * 0.5,
          (y[cur] + y[next]) * 0.5,
        );
      }
      context2d.closePath();
      if (activeState) {
        const g = context2d.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, primaryColor);
        g.addColorStop(1, tertiaryColor);
        context2d.fillStyle = g;
      } else context2d.fillStyle = pausedColor;
      context2d.fill();
      queueFrame();
    }
    queueFrame();
    return {
      setActive(v: boolean) {
        activeState = v;
        targetLife = v ? 1 : 0.38;
        if (!v) {
          targetActivity = 0;
          targetBands.fill(0);
        }
      },
      setVisible(v: boolean) {
        visibleState = v;
        if (v) {
          last = performance.now();
          queueFrame();
        }
      },
      refreshTheme,
    };
  }
  return {
    refreshTheme() {
      blobShader.refreshTheme?.();
    },
    dispose() {
      removeResizeListener();
    },
  };
}
