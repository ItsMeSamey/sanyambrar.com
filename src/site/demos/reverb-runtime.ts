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
  oneTimeSeconds: number;
  oneSizeMiB: number;
  loopTimeSeconds: number;
  loopSizeMiB: number;
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
  let oneSeconds = 30 * 60;
  let loopSeconds = 47 * 3600 + 59 * 60 + 55;
  const bytesPerSecond = 44100 * 2;
  let oneRetentionTimeSeconds = 24 * 3600;
  let loopRetentionTimeSeconds = 48 * 3600;
  let oneRetentionSizeMiB = 6;
  let loopRetentionSizeMiB = 4199;
  let oneLimitSeconds = oneRetentionTimeSeconds;
  let loopLimitSeconds = loopRetentionTimeSeconds;
  let lastTick = performance.now();
  let toastTimer = 0;
  let settingsDirty = false;
  let retentionMode: RetentionMode = "time";
  let settingsInitial: SettingsSnapshot;
  let settingsOneTimeSeconds = oneRetentionTimeSeconds;
  let settingsLoopTimeSeconds = loopRetentionTimeSeconds;
  let settingsOneSizeMiB = oneRetentionSizeMiB;
  let settingsLoopSizeMiB = loopRetentionSizeMiB;
  let settingsOneTimeText = "";
  let settingsLoopTimeText = "";
  let settingsOneSizeText = "";
  let settingsLoopSizeText = "";
  let settingsReturnFocus: HTMLElement | null = null;
  let incidentsReturnFocus: HTMLElement | null = null;

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
  function parseRetentionTime(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!trimmed.includes(":")) {
      const minutes = Number(trimmed.replace(",", "."));
      if (!Number.isFinite(minutes) || minutes < 0) return null;
      const seconds = Math.round(minutes * 60);
      return seconds <= 0x7fffffff ? seconds : null;
    }
    const parts = trimmed.split(":");
    if (
      parts.length < 2 ||
      parts.length > 3 ||
      parts.some((part) => !/^\d+$/.test(part))
    )
      return null;
    const values = parts.map(Number);
    if (values.slice(1).some((part) => part >= 60)) return null;
    let seconds = 0;
    for (const part of values) {
      seconds = seconds * 60 + part;
      if (seconds > 0x7fffffff) return null;
    }
    return seconds;
  }
  function parseRetentionSize(value: string): number | null {
    const size = Number(value.trim().replace(",", "."));
    return Number.isFinite(size) && size >= 0 ? size : null;
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
  function defaultScreenFocus(id: ScreenId): HTMLElement {
    switch (id) {
      case "settingsScreen":
        return byId<HTMLElement>("settingsNav");
      case "libraryScreen":
        return byId<HTMLElement>("libraryBack");
      case "incidentsScreen":
        return byId<HTMLElement>("incidentsBack");
      case "rangeScreen":
        return byId<HTMLElement>("rangeClose");
      default:
        return byId<HTMLElement>("brandButton");
    }
  }
  function focusScreen(id: ScreenId, preferred?: HTMLElement | null): void {
    requestAnimationFrame(() => {
      const target =
        preferred?.isConnected && preferred.getClientRects().length > 0
          ? preferred
          : defaultScreenFocus(id);
      if (target.isConnected && target.getClientRects().length > 0)
        target.focus({ preventScroll: true });
    });
  }
  function showScreen(
    id: ScreenId,
    focusTarget?: HTMLElement | null,
  ): void {
    if (id === "settingsScreen") prepareSettingsSession();
    currentScreen = id;
    screens.forEach((screen) =>
      screen.classList.toggle("active", screen.id === id),
    );
    blobShader.setVisible(id === "homeScreen");
    closeDropdown();
    focusScreen(id, focusTarget);
  }
  function openSettings(event?: Event): void {
    if (currentScreen !== "settingsScreen")
      settingsReturnScreen = currentScreen;
    settingsReturnFocus =
      event?.currentTarget instanceof HTMLElement
        ? event.currentTarget
        : currentScreen === "homeScreen"
          ? byId<HTMLElement>("openSettings")
          : currentScreen === "rangeScreen"
            ? byId<HTMLElement>("rangeSettings")
            : null;
    showScreen("settingsScreen");
  }
  function openIncidents(event?: Event): void {
    if (currentScreen !== "incidentsScreen")
      incidentsReturnScreen = currentScreen;
    incidentsReturnFocus =
      event?.currentTarget instanceof HTMLElement
        ? event.currentTarget
        : currentScreen === "homeScreen"
          ? byId<HTMLElement>("openIncidents")
          : currentScreen === "rangeScreen"
            ? byId<HTMLElement>("rangeIncidents")
            : null;
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
        segment.tabIndex = selected ? 0 : -1;
      });
    const displayedActive = live && activeBuffer === selectedBuffer;
    const blockedByOther =
      live && activeBuffer != null && activeBuffer !== selectedBuffer;
    blobControl.classList.toggle("live", displayedActive);
    blobControl.classList.toggle("dimmed", blockedByOther);
    blobControl.setAttribute(
      "aria-label",
      displayedActive ? "Tap to pause capture" : "Tap to start capture",
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
  type RangeEditTarget = "start" | "end";
  const rangeStartInput = byId<HTMLElement>("rangeStart");
  const rangeEndInput = byId<HTMLElement>("rangeEnd");
  const rangeStartBoundary = byId<HTMLElement>("rangeStartBoundary");
  const rangeEndBoundary = byId<HTMLElement>("rangeEndBoundary");
  const rangeDurationWheel = byId<HTMLElement>("rangeDurationWheel");
  const rangeWavebox =
    document.querySelector<HTMLElement>(".range-timeline .wavebox");
  if (!rangeWavebox) throw new Error("Reverb demo is missing range waveform");
  let rangeTimelineDurationSeconds = 0.1;
  let rangeStartSeconds = 0;
  let rangeEndSeconds = 0.1;
  let rangeEditTarget: RangeEditTarget = "start";
  let rangeWheelProfileIndex = 0;
  const rangeWheelProfiles = ["1x", "5x", "15x"] as const;

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
  function parseRangeTime(value: string): number | null {
    const parts = value.trim().split(":");
    if (
      parts.length < 1 ||
      parts.length > 3 ||
      parts.some((part) => part.length === 0)
    )
      return null;
    const secondsPart = Number(parts.at(-1));
    if (
      !Number.isFinite(secondsPart) ||
      secondsPart < 0 ||
      (parts.length > 1 && secondsPart >= 60)
    )
      return null;
    const minuteText = parts.length >= 2 ? parts[parts.length - 2] ?? "" : "0";
    const minutes = /^\d+$/.test(minuteText) ? Number(minuteText) : Number.NaN;
    if (
      !Number.isSafeInteger(minutes) ||
      minutes < 0 ||
      (parts.length === 3 && minutes >= 60)
    )
      return null;
    const hourText = parts.length === 3 ? parts[0] ?? "" : "0";
    const hours = /^\d+$/.test(hourText) ? Number(hourText) : Number.NaN;
    if (!Number.isSafeInteger(hours) || hours < 0) return null;
    const result = hours * 3600 + minutes * 60 + secondsPart;
    return Number.isFinite(result) ? result : null;
  }
  const rangeSelectionSeconds = () =>
    Math.max(0, rangeEndSeconds - rangeStartSeconds);
  const rangeWheelStepSeconds = () =>
    rangeWheelProfileIndex === 1 ? 5 : rangeWheelProfileIndex === 2 ? 15 : 1;
  const splitRangeWholeSeconds = (seconds: number) => {
    const whole = Math.max(0, Math.floor(seconds));
    return {
      hours: Math.floor(whole / 3600),
      minutes: Math.floor((whole % 3600) / 60),
      seconds: whole % 60,
    };
  };
  const twoDigits = (value: number) => String(value).padStart(2, "0");
  const rangeInputText = (input: HTMLElement) => input.textContent ?? "";
  const setRangeInputText = (input: HTMLElement, value: string) => {
    if (input.textContent !== value) input.textContent = value;
  };

  function renderRangeWheel(): void {
    const selection = rangeSelectionSeconds();
    const parts = splitRangeWholeSeconds(selection);
    const currentFaces = [
      ...rangeDurationWheel.querySelectorAll<HTMLElement>(
        ".wheel-face.current:not(.wheel-profile)",
      ),
    ];
    const values = [parts.hours, parts.minutes, parts.seconds];
    currentFaces.forEach((face, index) => {
      face.textContent = twoDigits(values[index] ?? 0);
    });
    const currentProfile =
      rangeDurationWheel.querySelector<HTMLElement>(
        ".wheel-face.current.wheel-profile",
      );
    if (currentProfile)
      currentProfile.textContent =
        rangeWheelProfiles[rangeWheelProfileIndex] ?? "1x";
    const maximum =
      rangeEditTarget === "start"
        ? rangeEndSeconds
        : Math.max(0, rangeTimelineDurationSeconds - rangeStartSeconds);
    rangeDurationWheel.setAttribute("aria-valuemin", "0.05");
    rangeDurationWheel.setAttribute("aria-valuemax", String(maximum));
    rangeDurationWheel.setAttribute(
      "aria-valuenow",
      String(Math.round(selection * 10) / 10),
    );
    rangeDurationWheel.setAttribute(
      "aria-valuetext",
      `${parts.hours}:${twoDigits(parts.minutes)}:${twoDigits(parts.seconds)} ${
        rangeWheelProfiles[rangeWheelProfileIndex] ?? "1x"
      }`,
    );
  }
  function renderRangeUi(): void {
    const duration = Math.max(0.1, rangeTimelineDurationSeconds);
    const startFraction = Math.max(
      0,
      Math.min(1, rangeStartSeconds / duration),
    );
    const endFraction = Math.max(0, Math.min(1, rangeEndSeconds / duration));
    setRangeInputText(rangeStartInput, formatRangeTime(rangeStartSeconds));
    setRangeInputText(rangeEndInput, formatRangeTime(rangeEndSeconds));
    rangeStartInput.removeAttribute("aria-invalid");
    rangeEndInput.removeAttribute("aria-invalid");
    byId("rangeDurationLabel").textContent = formatRangeTime(duration);

    const timelineWidth = 375;
    const timelineInset = 12;
    const waveformWidth = timelineWidth - timelineInset * 2;
    const bubbleWidth = 100;
    const bubbleLeftFor = (fraction: number) => {
      const markerX = timelineInset + waveformWidth * fraction;
      return Math.max(
        0,
        Math.min(timelineWidth - bubbleWidth, markerX - bubbleWidth / 2),
      );
    };
    rangeStartInput.style.left = `${bubbleLeftFor(startFraction)}px`;
    rangeEndInput.style.left = `${bubbleLeftFor(endFraction)}px`;
    rangeEndInput.style.right = "auto";
    rangeStartBoundary.style.left = `${startFraction * 100}%`;
    rangeEndBoundary.style.left = `${endFraction * 100}%`;
    const selectedRect = byId<SVGRectElement>("selectedWaveRect");
    const clipX = 360 * startFraction;
    const clipEnd = 360 * endFraction;
    selectedRect.setAttribute("x", clipX.toFixed(2));
    selectedRect.setAttribute(
      "width",
      Math.max(0, clipEnd - clipX).toFixed(2),
    );
    rangeStartInput.classList.toggle("active", rangeEditTarget === "start");
    rangeEndInput.classList.toggle("active", rangeEditTarget === "end");
    rangeStartBoundary.classList.toggle("active", rangeEditTarget === "start");
    rangeEndBoundary.classList.toggle("active", rangeEditTarget === "end");

    const loop = selectedBuffer === "loop";
    byId("rangeBufferLabel").textContent = loop ? "Looping" : "One-shot";
    byId<SVGUseElement>("rangeBufferIcon").setAttribute(
      "href",
      loop ? "#i-loop" : "#i-one",
    );
    renderRangeWheel();
  }
  function resetRangeUi(): void {
    rangeTimelineDurationSeconds = Math.max(0.1, currentSeconds());
    const selection = Math.min(
      rememberedRangeDurationSeconds,
      rangeTimelineDurationSeconds,
    );
    rangeStartSeconds = Math.max(
      0,
      rangeTimelineDurationSeconds - selection,
    );
    rangeEndSeconds = rangeTimelineDurationSeconds;
    rangeEditTarget = "start";
    rangeWheelProfileIndex = 0;
    renderRangeUi();
  }
  function setRangeEditTarget(target: RangeEditTarget): void {
    rangeEditTarget = target;
    renderRangeUi();
  }
  function adjustRangeTarget(
    target: RangeEditTarget,
    requestedSeconds: number,
  ): void {
    const duration = Math.max(0, rangeTimelineDurationSeconds);
    const minimum = Math.min(0.05, duration);
    let start = Math.max(0, Math.min(duration, rangeStartSeconds));
    let end = Math.max(start, Math.min(duration, rangeEndSeconds));
    if (end - start < minimum) {
      end = Math.min(duration, start + minimum);
      start = Math.max(0, end - minimum);
    }
    if (target === "start") {
      const requested = Math.max(
        0,
        Math.min(Math.max(0, duration - minimum), requestedSeconds),
      );
      if (requested > end - minimum) {
        start = requested;
        end = Math.min(duration, start + minimum);
      } else {
        start = requested;
      }
    } else {
      const requested = Math.max(
        Math.min(minimum, duration),
        Math.min(duration, requestedSeconds),
      );
      if (requested < start + minimum) {
        end = requested;
        start = Math.max(0, end - minimum);
      } else {
        end = requested;
      }
    }
    rangeStartSeconds = start;
    rangeEndSeconds = end;
    rangeEditTarget = target;
    renderRangeUi();
  }
  function resizeRangeSelection(requestedSeconds: number): void {
    const duration = Math.max(0, rangeTimelineDurationSeconds);
    const minimum = Math.min(0.05, duration);
    const requested = Math.max(minimum, requestedSeconds);
    if (rangeEditTarget === "start") {
      rangeStartSeconds = Math.max(
        0,
        Math.min(
          Math.max(0, rangeEndSeconds - minimum),
          rangeEndSeconds - requested,
        ),
      );
    } else {
      rangeEndSeconds = Math.max(
        Math.min(duration, rangeStartSeconds + minimum),
        Math.min(duration, rangeStartSeconds + requested),
      );
    }
    renderRangeUi();
  }
  function commitRangeInput(
    input: HTMLElement,
    target: RangeEditTarget,
  ): boolean {
    const parsed = parseRangeTime(rangeInputText(input));
    if (parsed == null) {
      input.setAttribute("aria-invalid", "true");
      return false;
    }
    adjustRangeTarget(target, parsed);
    return true;
  }
  (
    [
      [rangeStartInput, "start"],
      [rangeEndInput, "end"],
    ] as const
  ).forEach(([input, target]) => {
    input.addEventListener("focus", () => {
      if (input.getAttribute("aria-invalid") === "true") return;
      const other = target === "start" ? rangeEndInput : rangeStartInput;
      if (other.getAttribute("aria-invalid") === "true") {
        requestAnimationFrame(() => {
          if (other.isConnected) other.focus({ preventScroll: true });
        });
        return;
      }
      setRangeEditTarget(target);
    });
    input.addEventListener("input", () => input.removeAttribute("aria-invalid"));
    input.addEventListener("blur", () => {
      const other = target === "start" ? rangeEndInput : rangeStartInput;
      if (other.getAttribute("aria-invalid") === "true") return;
      commitRangeInput(input, target);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (commitRangeInput(input, target)) input.blur();
      } else if (event.key === "Escape") {
        event.preventDefault();
        renderRangeUi();
        input.blur();
      }
    });
  });

  let rangeWavePointerId = -1;
  rangeWavebox.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const path = event.composedPath();
    const target: RangeEditTarget = path.includes(rangeEndBoundary)
      ? "end"
      : path.includes(rangeStartBoundary)
        ? "start"
        : rangeEditTarget;
    rangeEditTarget = target;
    rangeWavePointerId = event.pointerId;
    rangeWavebox.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    const rect = rangeWavebox.getBoundingClientRect();
    const seconds =
      ((event.clientX - rect.left) / Math.max(1, rect.width)) *
      rangeTimelineDurationSeconds;
    adjustRangeTarget(target, seconds);
  });
  rangeWavebox.addEventListener("pointermove", (event) => {
    if (event.pointerId !== rangeWavePointerId) return;
    const rect = rangeWavebox.getBoundingClientRect();
    const seconds =
      ((event.clientX - rect.left) / Math.max(1, rect.width)) *
      rangeTimelineDurationSeconds;
    adjustRangeTarget(rangeEditTarget, seconds);
  });
  const endRangeWavePointer = (event: PointerEvent) => {
    if (event.pointerId !== rangeWavePointerId) return;
    rangeWavePointerId = -1;
    if (rangeWavebox.hasPointerCapture?.(event.pointerId))
      rangeWavebox.releasePointerCapture(event.pointerId);
  };
  rangeWavebox.addEventListener("pointerup", endRangeWavePointer);
  rangeWavebox.addEventListener("pointercancel", endRangeWavePointer);

  const adjustRangeWheel = (deltaSeconds: number) => {
    resizeRangeSelection(rangeSelectionSeconds() + deltaSeconds);
  };
  const cycleRangeWheelProfile = (direction: number) => {
    rangeWheelProfileIndex =
      (rangeWheelProfileIndex +
        direction +
        rangeWheelProfiles.length) %
      rangeWheelProfiles.length;
    renderRangeWheel();
  };
  const adjustRangeWheelAt = (
    clientX: number,
    direction: number,
  ) => {
    const rect = rangeDurationWheel.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = x / Math.max(1, rect.width);
    if (ratio >= 0.81) {
      cycleRangeWheelProfile(direction);
      return;
    }
    const profileStep = rangeWheelStepSeconds();
    const unit =
      ratio < 0.27 ? 3600 : ratio < 0.54 ? 60 * profileStep : profileStep;
    adjustRangeWheel(direction * unit);
  };
  rangeDurationWheel.addEventListener("wheel", (event) => {
    if (event.deltaY === 0) return;
    event.preventDefault();
    adjustRangeWheelAt(event.clientX, event.deltaY < 0 ? -1 : 1);
  });
  rangeDurationWheel.addEventListener("click", (event) => {
    const rect = rangeDurationWheel.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const direction =
      y < rect.height / 3 ? -1 : y > (rect.height * 2) / 3 ? 1 : 0;
    if (direction !== 0) adjustRangeWheelAt(event.clientX, direction);
  });
  rangeDurationWheel.addEventListener("keydown", (event) => {
    const profileStep = rangeWheelStepSeconds();
    let delta = 0;
    if (event.key === "ArrowUp" || event.key === "ArrowRight")
      delta = profileStep;
    else if (event.key === "ArrowDown" || event.key === "ArrowLeft")
      delta = -profileStep;
    else if (event.key === "PageUp") delta = 60 * profileStep;
    else if (event.key === "PageDown") delta = -60 * profileStep;
    else if (event.key === "Home") {
      event.preventDefault();
      resizeRangeSelection(0.05);
      return;
    } else if (event.key === "End") {
      event.preventDefault();
      resizeRangeSelection(
        rangeEditTarget === "start"
          ? rangeEndSeconds
          : rangeTimelineDurationSeconds - rangeStartSeconds,
      );
      return;
    } else {
      return;
    }
    event.preventDefault();
    adjustRangeWheel(delta);
  });

  const bufferSegments = [
    ...document.querySelectorAll<HTMLButtonElement>(".buffer-segment"),
  ];
  const selectBufferPage = (segment: HTMLButtonElement, focus = false) => {
    selectedBuffer = bufferSlot(segment.dataset.buffer);
    syncBufferUi();
    if (focus) segment.focus({ preventScroll: true });
  };
  bufferSegments.forEach((segment) => {
    segment.addEventListener("click", () => {
      selectBufferPage(segment);
    });
    segment.addEventListener("keydown", (event) => {
      let target: HTMLButtonElement | undefined;
      const index = bufferSegments.indexOf(segment);
      if (event.key === "ArrowRight" || event.key === "ArrowDown")
        target = bufferSegments[(index + 1) % bufferSegments.length];
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
        target =
          bufferSegments[(index - 1 + bufferSegments.length) % bufferSegments.length];
      else if (event.key === "Home") target = bufferSegments[0];
      else if (event.key === "End")
        target = bufferSegments[bufferSegments.length - 1];
      else return;
      event.preventDefault();
      if (target) selectBufferPage(target, true);
    });
  });
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
    settingsReturnFocus = byId<HTMLElement>("openLibrary");
    showScreen("settingsScreen");
  });
  byId("rangeSettings").addEventListener("click", openSettings);
  byId("openIncidents").addEventListener("click", openIncidents);
  byId("libraryIncidents").addEventListener("click", () => {
    incidentsReturnScreen = "homeScreen";
    incidentsReturnFocus = byId<HTMLElement>("openLibrary");
    showScreen("incidentsScreen");
  });
  byId("rangeIncidents").addEventListener("click", openIncidents);
  byId("openLibrary").addEventListener("click", () =>
    showScreen("libraryScreen"),
  );
  byId("libraryBack").addEventListener("click", () =>
    showScreen("homeScreen", byId<HTMLElement>("openLibrary")),
  );
  byId("openRange").addEventListener("click", () => {
    resetRangeUi();
    showScreen("rangeScreen");
  });
  byId("rangeClose").addEventListener("click", () =>
    showScreen("homeScreen", byId<HTMLElement>("openRange")),
  );
  byId("incidentsBack").addEventListener("click", () =>
    showScreen(incidentsReturnScreen, incidentsReturnFocus),
  );

  const aboutSheet = byId<HTMLElement>("aboutSheet");
  let aboutReturnFocus: HTMLElement | null = null;
  let aboutBackground:
    | { screen: HTMLElement; inert: boolean; ariaHidden: string | null }
    | null = null;
  const aboutFocusable = () => [...aboutSheet.querySelectorAll<HTMLElement>(
    'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])',
  )].filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
  const openAbout = (event: Event) => {
    aboutReturnFocus = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    const background = screens.find((screen) => screen.classList.contains("active"));
    if (background) {
      aboutBackground = {
        screen: background,
        inert: background.inert,
        ariaHidden: background.getAttribute("aria-hidden"),
      };
      background.inert = true;
      background.setAttribute("aria-hidden", "true");
    }
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
    if (aboutBackground) {
      const { screen, inert, ariaHidden } = aboutBackground;
      screen.inert = inert;
      if (ariaHidden == null) screen.removeAttribute("aria-hidden");
      else screen.setAttribute("aria-hidden", ariaHidden);
      aboutBackground = null;
    }
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
  const incidentCards = [
    ...document.querySelectorAll<HTMLElement>(".incident-card"),
  ];
  const activeIncidentHoldTimers = new Set<number>();
  const syncIncidentAlert = () =>
    setIncidentAlert(
      incidentCards.some((card) => card.dataset.acknowledged === "false"),
    );
  incidentCards.forEach((incidentCard) => {
    const incidentIndicator =
      incidentCard.querySelector<HTMLElement>(".incident-ack");
    const incidentCheckUse =
      incidentCard.querySelector<SVGUseElement>(".incident-ack use");
    if (!incidentIndicator || !incidentCheckUse) return;

    let incidentAcknowledged =
      incidentCard.dataset.acknowledged !== "false";
    let incidentHoldTimer = 0;
    let incidentHoldTriggered = false;
    const incidentCopyText = incidentCard.innerText.trim();
    const syncIncidentState = () => {
      incidentCard.dataset.acknowledged = String(incidentAcknowledged);
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
      syncIncidentAlert();
    };
    const copyIncident = () => {
      incidentHoldTriggered = true;
      void navigator.clipboard
        ?.writeText(incidentCopyText)
        .catch(() => undefined);
      showToast("Incident copied");
    };
    const toggleIncident = () => {
      if (incidentHoldTriggered) {
        incidentHoldTriggered = false;
        return;
      }
      incidentAcknowledged = !incidentAcknowledged;
      syncIncidentState();
    };
    incidentCard.addEventListener("click", toggleIncident);
    incidentCard.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggleIncident();
    });
    const clearIncidentHold = () => {
      if (!incidentHoldTimer) return;
      clearTimeout(incidentHoldTimer);
      activeIncidentHoldTimers.delete(incidentHoldTimer);
      incidentHoldTimer = 0;
    };
    incidentCard.addEventListener("pointerdown", () => {
      incidentHoldTriggered = false;
      clearIncidentHold();
      incidentHoldTimer = setTimeout(() => {
        activeIncidentHoldTimers.delete(incidentHoldTimer);
        incidentHoldTimer = 0;
        copyIncident();
      }, 520);
      activeIncidentHoldTimers.add(incidentHoldTimer);
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach((type) =>
      incidentCard.addEventListener(type, clearIncidentHold),
    );
    incidentCard.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      clearIncidentHold();
      copyIncident();
    });
    syncIncidentState();
  });
  syncIncidentAlert();
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
    ...document.querySelectorAll<HTMLButtonElement>("#themeSegments .segment"),
  ];
  const retentionSegments = [
    ...document.querySelectorAll<HTMLButtonElement>("#retentionSegments .segment"),
  ];
  const themeGroup = byId<HTMLElement>("themeSegments");
  const retentionGroup = byId<HTMLElement>("retentionSegments");
  themeGroup.setAttribute("role", "radiogroup");
  themeGroup.setAttribute("aria-label", "Theme");
  retentionGroup.setAttribute("role", "radiogroup");
  retentionGroup.setAttribute("aria-label", "Retention");
  const syncRadioSegments = (
    segments: HTMLButtonElement[],
    selected: (segment: HTMLButtonElement) => boolean,
  ) => {
    segments.forEach((segment) => {
      const checked = selected(segment);
      segment.setAttribute("role", "radio");
      segment.setAttribute("aria-checked", String(checked));
      segment.tabIndex = checked ? 0 : -1;
      segment.classList.toggle("selected", checked);
    });
  };
  const oneRetention = byId<HTMLInputElement>("oneRetention");
  const loopRetention = byId<HTMLInputElement>("loopRetention");
  const oneRetentionUnit = byId<HTMLElement>("oneRetentionUnit");
  const loopRetentionUnit = byId<HTMLElement>("loopRetentionUnit");
  const retentionError = byId<HTMLElement>("retentionError");
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
      oneTimeSeconds: oneRetentionTimeSeconds,
      oneSizeMiB: oneRetentionSizeMiB,
      loopTimeSeconds: loopRetentionTimeSeconds,
      loopSizeMiB: loopRetentionSizeMiB,
      dropdowns: dropdownValues().map((value) => value.textContent ?? ""),
      wake: wakeSwitch.classList.contains("on"),
    };
  }
  const formatRetentionTimeInput = (seconds: number) => {
    const value = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const secs = value % 60;
    return hours + ":" + String(minutes).padStart(2, "0") + ":" +
      String(secs).padStart(2, "0");
  };
  const formatRetentionSizeInput = (sizeMiB: number) => String(sizeMiB);
  const resetRetentionDrafts = (snapshot: SettingsSnapshot) => {
    settingsOneTimeSeconds = snapshot.oneTimeSeconds;
    settingsLoopTimeSeconds = snapshot.loopTimeSeconds;
    settingsOneSizeMiB = snapshot.oneSizeMiB;
    settingsLoopSizeMiB = snapshot.loopSizeMiB;
    settingsOneTimeText = formatRetentionTimeInput(settingsOneTimeSeconds);
    settingsLoopTimeText = formatRetentionTimeInput(settingsLoopTimeSeconds);
    settingsOneSizeText = formatRetentionSizeInput(settingsOneSizeMiB);
    settingsLoopSizeText = formatRetentionSizeInput(settingsLoopSizeMiB);
  };
  settingsInitial = captureSettingsSnapshot();
  resetRetentionDrafts(settingsInitial);
  const settingsDone = byId<HTMLButtonElement>("settingsDone");
  function setDirty(dirty: boolean): void {
    settingsDirty = dirty;
    settingsDone.disabled = !dirty;
    settingsDone.classList.toggle("disabled", !dirty);
    byId("settingsNavBack").style.display = dirty ? "none" : "block";
    byId("settingsNavUndo").style.display = dirty ? "block" : "none";
    byId("settingsNav").setAttribute("aria-label", dirty ? "Undo" : "Back");
  }
  setDirty(false);
  const activeRetentionInvalid = () =>
    retentionMode === "time"
      ? parseRetentionTime(settingsOneTimeText) == null ||
        parseRetentionTime(settingsLoopTimeText) == null
      : parseRetentionSize(settingsOneSizeText) == null ||
        parseRetentionSize(settingsLoopSizeText) == null;
  const settingsMatchSnapshot = () => {
    if (
      selectedTheme() !== settingsInitial.theme ||
      retentionMode !== settingsInitial.retentionMode ||
      settingsOneTimeSeconds !== settingsInitial.oneTimeSeconds ||
      settingsLoopTimeSeconds !== settingsInitial.loopTimeSeconds ||
      settingsOneSizeMiB !== settingsInitial.oneSizeMiB ||
      settingsLoopSizeMiB !== settingsInitial.loopSizeMiB ||
      wakeSwitch.classList.contains("on") !== settingsInitial.wake
    )
      return false;
    const dropdowns = dropdownValues();
    return dropdowns.every(
      (value, index) =>
        (value.textContent ?? "") === (settingsInitial.dropdowns[index] ?? ""),
    );
  };
  const recomputeDirty = () =>
    setDirty(!settingsMatchSnapshot() || activeRetentionInvalid());
  type RetentionErrorState = {
    message: string;
    oneInvalid: boolean;
    loopInvalid: boolean;
  };
  let retentionTimeError: RetentionErrorState | null = null;
  let retentionSizeError: RetentionErrorState | null = null;
  const renderRetentionError = () => {
    retentionError.hidden = true;
    retentionError.textContent = "";
    oneRetention.removeAttribute("aria-invalid");
    loopRetention.removeAttribute("aria-invalid");
    oneRetention.removeAttribute("aria-describedby");
    loopRetention.removeAttribute("aria-describedby");
    const error =
      retentionMode === "time" ? retentionTimeError : retentionSizeError;
    if (!error) return;
    retentionError.textContent = error.message;
    retentionError.hidden = false;
    if (error.oneInvalid) {
      oneRetention.setAttribute("aria-invalid", "true");
      oneRetention.setAttribute("aria-describedby", "retentionError");
    }
    if (error.loopInvalid) {
      loopRetention.setAttribute("aria-invalid", "true");
      loopRetention.setAttribute("aria-describedby", "retentionError");
    }
  };
  const clearRetentionErrors = () => {
    retentionTimeError = null;
    retentionSizeError = null;
    renderRetentionError();
  };
  const clearActiveRetentionError = (slot?: BufferSlot) => {
    const current =
      retentionMode === "time" ? retentionTimeError : retentionSizeError;
    if (!current) return;
    const next = { ...current };
    if (slot == null || slot === "one") next.oneInvalid = false;
    if (slot == null || slot === "loop") next.loopInvalid = false;
    const value = next.oneInvalid || next.loopInvalid ? next : null;
    if (retentionMode === "time") retentionTimeError = value;
    else retentionSizeError = value;
    renderRetentionError();
  };
  const showRetentionError = (
    message: string,
    oneInvalid = true,
    loopInvalid = true,
  ) => {
    const value = { message, oneInvalid, loopInvalid };
    if (retentionMode === "time") retentionTimeError = value;
    else retentionSizeError = value;
    renderRetentionError();
  };
  function setTheme(theme: string, dirty = true): void {
    if (dirty && selectedTheme() === theme) return;
    syncRadioSegments(
      themeSegments,
      (segment) => segment.dataset.theme === theme,
    );
    if (dirty) recomputeDirty();
  }
  const formatRetentionMinutesEstimate = (seconds: number) => {
    const wholeSeconds = Math.max(0, Math.floor(seconds));
    if (wholeSeconds <= 0) return "0";
    return wholeSeconds % 60 === 0
      ? String(wholeSeconds / 60)
      : (wholeSeconds / 60).toFixed(1);
  };
  const renderRetentionEstimates = () => {
    if (retentionMode === "time") {
      byId("oneEstimate").textContent =
        "≈ " +
        Math.round((settingsOneTimeSeconds * bytesPerSecond) / (1024 * 1024)) +
        " MiB";
      byId("loopEstimate").textContent =
        "≈ " +
        Math.round((settingsLoopTimeSeconds * bytesPerSecond) / (1024 * 1024)) +
        " MiB";
    } else {
      const oneSeconds =
        (settingsOneSizeMiB * 1024 * 1024) / bytesPerSecond;
      const loopSeconds =
        (settingsLoopSizeMiB * 1024 * 1024) / bytesPerSecond;
      byId("oneEstimate").textContent =
        "≈ " + formatRetentionMinutesEstimate(oneSeconds) + " min";
      byId("loopEstimate").textContent =
        "≈ " + formatRetentionMinutesEstimate(loopSeconds) + " min";
    }
  };
  const renderRetentionInputs = () => {
    const sizeMode = retentionMode === "size";
    oneRetentionUnit.hidden = !sizeMode;
    loopRetentionUnit.hidden = !sizeMode;
    if (retentionMode === "time") {
      oneRetention.value = settingsOneTimeText;
      loopRetention.value = settingsLoopTimeText;
    } else {
      oneRetention.value = settingsOneSizeText;
      loopRetention.value = settingsLoopSizeText;
    }
    renderRetentionEstimates();
  };
  function setRetentionMode(mode: RetentionMode, dirty = true): void {
    if (dirty && retentionMode === mode) return;
    retentionMode = mode;
    syncRadioSegments(
      retentionSegments,
      (segment) => segment.dataset.retentionMode === mode,
    );
    renderRetentionError();
    renderRetentionInputs();
    if (dirty) recomputeDirty();
  }
  setTheme(selectedTheme(), false);
  setRetentionMode(retentionMode, false);
  const updateRetentionDraft = (slot: BufferSlot, value: string) => {
    clearActiveRetentionError(slot);
    if (retentionMode === "time") {
      const parsed = parseRetentionTime(value);
      if (slot === "one") {
        settingsOneTimeText = value;
        if (parsed != null) settingsOneTimeSeconds = parsed;
      } else {
        settingsLoopTimeText = value;
        if (parsed != null) settingsLoopTimeSeconds = parsed;
      }
    } else {
      const parsed = parseRetentionSize(value);
      if (slot === "one") {
        settingsOneSizeText = value;
        if (parsed != null) settingsOneSizeMiB = parsed;
      } else {
        settingsLoopSizeText = value;
        if (parsed != null) settingsLoopSizeMiB = parsed;
      }
    }
    renderRetentionEstimates();
    recomputeDirty();
  };
  const installRadioGroupKeys = (
    segments: HTMLButtonElement[],
    select: (segment: HTMLButtonElement) => void,
  ) => {
    segments.forEach((segment) => {
      segment.addEventListener("keydown", (event) => {
        const index = segments.indexOf(segment);
        let target: HTMLButtonElement | undefined;
        if (event.key === "ArrowRight" || event.key === "ArrowDown")
          target = segments[(index + 1) % segments.length];
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
          target = segments[(index - 1 + segments.length) % segments.length];
        else if (event.key === "Home") target = segments[0];
        else if (event.key === "End") target = segments[segments.length - 1];
        else return;
        event.preventDefault();
        if (!target) return;
        select(target);
        target.focus({ preventScroll: true });
      });
    });
  };
  themeSegments.forEach((segment) =>
    segment.addEventListener("click", () =>
      setTheme(segment.dataset.theme ?? "Auto"),
    ),
  );
  const selectRetentionMode = (segment: HTMLButtonElement) => {
    const mode =
      segment.dataset.retentionMode === "size" ? "size" : "time";
    if (mode === retentionMode) return;
    setRetentionMode(mode);
  };
  retentionSegments.forEach((segment) =>
    segment.addEventListener("click", () => selectRetentionMode(segment)),
  );
  installRadioGroupKeys(themeSegments, (segment) =>
    setTheme(segment.dataset.theme ?? "Auto"),
  );
  installRadioGroupKeys(retentionSegments, selectRetentionMode);
  oneRetention.addEventListener("input", () =>
    updateRetentionDraft("one", oneRetention.value),
  );
  loopRetention.addEventListener("input", () =>
    updateRetentionDraft("loop", loopRetention.value),
  );
  wakeSwitch.addEventListener("click", () => {
    const on = !wakeSwitch.classList.contains("on");
    wakeSwitch.classList.toggle("on", on);
    wakeSwitch.setAttribute("aria-checked", String(on));
    recomputeDirty();
  });
  function restoreSettings(): void {
    clearRetentionErrors();
    setTheme(settingsInitial.theme, false);
    dropdownValues().forEach((value, index) => {
      value.textContent = settingsInitial.dropdowns[index] ?? "";
    });
    wakeSwitch.classList.toggle("on", settingsInitial.wake);
    wakeSwitch.setAttribute("aria-checked", String(settingsInitial.wake));
    resetRetentionDrafts(settingsInitial);
    retentionMode = settingsInitial.retentionMode;
    setRetentionMode(retentionMode, false);
    setDirty(false);
  }
  function prepareSettingsSession(): void {
    if (settingsDirty) return;
    clearRetentionErrors();
    resetRetentionDrafts(settingsInitial);
    retentionMode = settingsInitial.retentionMode;
    setRetentionMode(retentionMode, false);
  }
  const validateRetentionDrafts = () => {
    clearRetentionErrors();
    if (retentionMode === "time") {
      const one = parseRetentionTime(settingsOneTimeText);
      const loop = parseRetentionTime(settingsLoopTimeText);
      if (one == null) {
        showRetentionError("Use H:MM:SS.", true, false);
        return false;
      }
      if (loop == null) {
        showRetentionError("Use H:MM:SS.", false, true);
        return false;
      }
      settingsOneTimeSeconds = one;
      settingsLoopTimeSeconds = loop;
      if (one <= 0 && loop <= 0) {
        showRetentionError("Keep at least one buffer on.");
        return false;
      }
    } else {
      const one = parseRetentionSize(settingsOneSizeText);
      const loop = parseRetentionSize(settingsLoopSizeText);
      if (one == null) {
        showRetentionError("Enter a valid number.", true, false);
        return false;
      }
      if (loop == null) {
        showRetentionError("Enter a valid number.", false, true);
        return false;
      }
      settingsOneSizeMiB = one;
      settingsLoopSizeMiB = loop;
      if (one <= 0 && loop <= 0) {
        showRetentionError("Keep at least one buffer on.");
        return false;
      }
    }
    return true;
  };
  byId("settingsNav").addEventListener("click", () => {
    if (settingsDirty) restoreSettings();
    else showScreen(settingsReturnScreen, settingsReturnFocus);
  });
  byId("settingsDone").addEventListener("click", () => {
    if (!settingsDirty) return;
    if (!validateRetentionDrafts()) {
      recomputeDirty();
      return;
    }
    oneRetentionTimeSeconds = settingsOneTimeSeconds;
    loopRetentionTimeSeconds = settingsLoopTimeSeconds;
    oneRetentionSizeMiB = settingsOneSizeMiB;
    loopRetentionSizeMiB = settingsLoopSizeMiB;
    oneLimitSeconds =
      retentionMode === "time"
        ? oneRetentionTimeSeconds
        : (oneRetentionSizeMiB * 1024 * 1024) / bytesPerSecond;
    loopLimitSeconds =
      retentionMode === "time"
        ? loopRetentionTimeSeconds
        : (loopRetentionSizeMiB * 1024 * 1024) / bytesPerSecond;
    oneSeconds = Math.min(oneSeconds, oneLimitSeconds);
    loopSeconds = Math.min(loopSeconds, loopLimitSeconds);
    syncBufferUi();
    settingsInitial = captureSettingsSnapshot();
    clearRetentionErrors();
    setDirty(false);
    showScreen(settingsReturnScreen, settingsReturnFocus);
  });

  let activeDropdown: HTMLElement | null = null;
  dropdownMenu.setAttribute("role", "menu");
  dropdownMenu.setAttribute("aria-hidden", "true");
  function closeDropdown(restoreFocus = false): void {
    const trigger = activeDropdown;
    trigger?.setAttribute("aria-expanded", "false");
    dropdownMenu.classList.remove("show");
    dropdownMenu.setAttribute("aria-hidden", "true");
    dropdownMenu.removeAttribute("aria-label");
    dropdownMenu.replaceChildren();
    activeDropdown = null;
    if (restoreFocus && trigger)
      requestAnimationFrame(() =>
        trigger.isConnected && trigger.focus({ preventScroll: true }),
      );
  }
  document
    .querySelector<HTMLElement>(".settings-body")
    ?.addEventListener("scroll", () => closeDropdown(true), { passive: true });
  const removeResizeListener = addWindowEventListener(
    "resize",
    () => closeDropdown(true),
    { passive: true },
  );
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
    .forEach((field) => {
      field.setAttribute("aria-haspopup", "menu");
      field.setAttribute("aria-controls", "dropdownMenu");
      field.setAttribute("aria-expanded", "false");
      field.addEventListener("click", (event) => {
        event.stopPropagation();
        if (activeDropdown === field && dropdownMenu.classList.contains("show")) {
          closeDropdown(true);
          return;
        }
        closeDropdown();
        activeDropdown = field;
        field.setAttribute("aria-expanded", "true");
        const options = (field.dataset.options ?? "")
          .split("|")
          .filter(Boolean);
        const value = field.querySelector<HTMLElement>(".value");
        if (!value) return;
        let selectedButton: HTMLButtonElement | null = null;
        options.forEach((option) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "dropdown-item";
          button.textContent = option;
          button.setAttribute("role", "menuitemradio");
          const selected = option === value.textContent;
          button.setAttribute("aria-checked", String(selected));
          if (selected) selectedButton = button;
          button.addEventListener("click", () => {
            value.textContent = option;
            recomputeDirty();
            closeDropdown(true);
          });
          dropdownMenu.appendChild(button);
        });
        const caption =
          field.querySelector<HTMLElement>(".caption")?.textContent?.trim();
        if (caption) dropdownMenu.setAttribute("aria-label", caption + " options");
        const rect = field.getBoundingClientRect(),
          root = phone.getBoundingClientRect();
        dropdownMenu.classList.add("show");
        const scaleX = root.width > 0 ? root.width / phone.clientWidth : 1;
        const scaleY = root.height > 0 ? root.height / phone.clientHeight : 1;
        const localLeft = (rect.left - root.left) / scaleX;
        const localTop = (rect.top - root.top) / scaleY;
        const localBottom = (rect.bottom - root.top) / scaleY;
        const menuWidth = Math.min(
          phone.clientWidth - 16,
          Math.max(160, rect.width / scaleX),
        );
        const menuHeight = Math.min(300, dropdownMenu.scrollHeight);
        const below = phone.clientHeight - 8 - (localBottom + 4);
        const above = localTop - 4 - 8;
        const preferredTop = below >= menuHeight || below >= above
          ? localBottom + 4
          : localTop - menuHeight - 4;
        const maxTop = Math.max(8, phone.clientHeight - menuHeight - 8);
        const maxLeft = Math.max(8, phone.clientWidth - menuWidth - 8);
        dropdownMenu.style.left = `${Math.min(maxLeft, Math.max(8, localLeft))}px`;
        dropdownMenu.style.top = `${Math.min(maxTop, Math.max(8, preferredTop))}px`;
        dropdownMenu.style.width = `${menuWidth}px`;
        dropdownMenu.setAttribute("aria-hidden", "false");
        const initialFocus =
          selectedButton ??
          dropdownMenu.querySelector<HTMLButtonElement>(".dropdown-item");
        if (initialFocus)
          requestAnimationFrame(() =>
            initialFocus.isConnected &&
            initialFocus.focus({ preventScroll: true }),
          );
      });
    });
  dropdownMenu.addEventListener("keydown", (event) => {
    if (!(event instanceof KeyboardEvent) || !activeDropdown) return;
    const items = [
      ...dropdownMenu.querySelectorAll<HTMLButtonElement>(
        ".dropdown-item:not(:disabled)",
      ),
    ];
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeDropdown(true);
      return;
    }
    if (event.key === "Tab") {
      const trigger = activeDropdown;
      const focusable = [
        ...byId<HTMLElement>("settingsScreen").querySelectorAll<HTMLElement>(
          'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])',
        ),
      ].filter(
        (element) =>
          element.tabIndex >= 0 &&
          element.getClientRects().length > 0 &&
          !dropdownMenu.contains(element),
      );
      const index = focusable.indexOf(trigger);
      const next = event.shiftKey
        ? index <= 0
          ? focusable[focusable.length - 1]
          : focusable[index - 1]
        : index < 0 || index === focusable.length - 1
          ? focusable[0]
          : focusable[index + 1];
      event.preventDefault();
      closeDropdown();
      next?.focus({ preventScroll: true });
      return;
    }
    if (!items.length) return;
    const current =
      event.target instanceof HTMLButtonElement ? event.target : null;
    const index = current ? items.indexOf(current) : -1;
    let next: HTMLButtonElement | undefined;
    if (event.key === "ArrowDown")
      next = items[index < 0 || index === items.length - 1 ? 0 : index + 1];
    else if (event.key === "ArrowUp")
      next = items[index <= 0 ? items.length - 1 : index - 1];
    else if (event.key === "Home") next = items[0];
    else if (event.key === "End") next = items[items.length - 1];
    else return;
    event.preventDefault();
    next?.focus({ preventScroll: true });
  });

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
      settingsReturnFocus = byId<HTMLElement>("openSettings");
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
      showScreen("homeScreen", byId<HTMLElement>("openLibrary"));
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
  const removeBlurListener = addWindowEventListener("blur", () => {
    clearGesture();
    blobControl.classList.remove("pressed");
    for (const timer of activeIncidentHoldTimers) clearTimeout(timer);
    activeIncidentHoldTimers.clear();
  });

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
      removeBlurListener();
    },
  };
}
