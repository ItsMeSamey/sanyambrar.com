import {
  For,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  type Component,
} from "solid-js";
import { render } from "solid-js/web";
import {
  BarChart3,
  CircleHelp,
  Home,
  Maximize2,
  Minimize2,
  Redo2,
  RotateCcw,
  Settings as SettingsIcon,
  SunMoon,
  Trash2,
  Undo2,
  X,
} from "lucide-solid";
import {
  KeyboardOptions,
  KeyCharacters,
  KeyModifier,
  Language,
  Layout,
  keyboardProps,
  loadKeyboard,
  type Keyboard,
  type KeyShape,
} from "@keybr/keyboard";
import {
  BooksLesson,
  CodeLesson,
  CustomTextLesson,
  GuidedLesson,
  Lesson,
  lessonProps,
  LessonType,
  NumbersLesson,
  WordListLesson,
  type Lesson as LessonInstance,
} from "@keybr/lesson";
import { schedule } from "@keybr/lang";
import { loadContent } from "@keybr/content-books";
import { loadWordList } from "@keybr/content-words";
import { loaderImpl as loadPhoneticModel } from "@keybr/phonetic-model-loader";
import { type Result, Result as ResultClass, makeSummaryStats } from "@keybr/result";
import { createResultStorage } from "@keybr/result-loader";
import { Settings } from "@keybr/settings";
import {
  Attr,
  TextInput,
  makeStats,
} from "@keybr/textinput";
import { textInputProps, toTextInputSettings } from "./input-settings.ts";
import { Progress } from "./progress.ts";
import "./style.css";


type View = "practice" | "statistics" | "settings";
type Engine = {
  readonly settings: Settings;
  readonly keyboard: Keyboard;
  readonly lesson: LessonInstance;
  readonly progress: Progress;
};
type LoadState =
  | { readonly type: "loading"; readonly total: number; readonly current: number }
  | { readonly type: "ready"; readonly engine: Engine }
  | { readonly type: "error"; readonly message: string };

const resultStorage = createResultStorage();
let history: Result[] = [];

function loadSettings(): Settings {
  try {
    const value = localStorage.getItem("settings");
    if (value != null) return new Settings(JSON.parse(value));
  } catch {}

  let settings = new Settings(undefined, true);
  const layout = Layout.findLayout(navigator.language);
  if (layout != null) {
    settings = KeyboardOptions.default()
      .withLanguage(layout.language)
      .withLayout(layout)
      .save(settings);
  }
  storeSettings(settings);
  return settings;
}

function storeSettings(settings: Settings): void {
  try {
    localStorage.setItem("settings", JSON.stringify(settings.toJSON()));
  } catch {}
}

async function makeLesson(settings: Settings, keyboard: Keyboard) {
  const { language } = KeyboardOptions.from(settings);
  const model = await loadPhoneticModel(language);
  switch (settings.get(lessonProps.type)) {
    case LessonType.GUIDED:
      return new GuidedLesson(settings, keyboard, model, await loadWordList(language));
    case LessonType.WORDLIST:
      return new WordListLesson(settings, keyboard, model, await loadWordList(language));
    case LessonType.BOOKS: {
      const book = settings.get(lessonProps.books.book);
      return new BooksLesson(settings, keyboard, model, {
        book,
        content: await loadContent(book),
      });
    }
    case LessonType.CUSTOM:
      return new CustomTextLesson(settings, keyboard, model);
    case LessonType.CODE:
      return new CodeLesson(settings, keyboard, model);
    case LessonType.NUMBERS:
      return new NumbersLesson(settings, keyboard, model);
    default:
      throw new Error("Unsupported lesson type");
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

const App: Component = () => {
  const [settings, setSettings] = createSignal(loadSettings());
  const [historyReady, setHistoryReady] = createSignal(false);
  const [historyEpoch, setHistoryEpoch] = createSignal(0);
  const [historyRevision, setHistoryRevision] = createSignal(0);
  const [loadState, setLoadState] = createSignal<LoadState>({ type: "loading", total: 0, current: 0 });
  const [input, setInput] = createSignal<TextInput | null>(null, { equals: false });
  const [inputRevision, setInputRevision] = createSignal(0);
  const [lastResult, setLastResult] = createSignal<Result | null>(null);
  const [pressed, setPressed] = createSignal<ReadonlySet<string>>(new Set());
  const [view, setViewSignal] = createSignal<View>("practice");
  const [helpOpen, setHelpOpen] = createSignal(false);
  const [fullscreen, setFullscreen] = createSignal(Boolean(document.fullscreenElement));
  let loadController: AbortController | null = null;
  let lastKeyTime = 0;

  const currentEngine = createMemo(() => {
    const state = loadState();
    return state.type === "ready" ? state.engine : null;
  });

  const setView = (next: View) => {
    if (next === view()) return;
    const commit = () => setViewSignal(next);
    const root = document.getElementById("app");
    const animate = (globalThis as any).SameyAnimateLocalSwap;
    if (root && animate) void animate(root, commit, next === "practice" ? "back" : "forward");
    else commit();
  };

  const updateSettings = (next: Settings) => {
    storeSettings(next);
    setSettings(next);
  };

  const newInput = (engine = currentEngine()) => {
    if (engine == null) return;
    const lessonKeys = engine.lesson.update(engine.progress.keyStatsMap);
    setInput(new TextInput(
      engine.lesson.generate(lessonKeys, Lesson.rng),
      toTextInputSettings(engine.settings),
    ));
    setInputRevision((v) => v + 1);
    lastKeyTime = 0;
  };

  const resetInput = () => {
    const value = input();
    if (value == null) return;
    value.reset();
    setInput(value);
    setInputRevision((v) => v + 1);
    lastKeyTime = 0;
  };

  const appendResult = (result: Result) => {
    const engine = currentEngine();
    if (engine == null || !result.validate()) return;
    engine.progress.append(result);
    history.push(result);
    setHistoryRevision((v) => v + 1);
    void resultStorage.append([result]).catch((error) => console.error("Could not persist Keybr result", error));
  };

  const completeLesson = (value: TextInput) => {
    const engine = currentEngine();
    if (engine == null) return;
    const result = ResultClass.fromStats(
      engine.settings.get(keyboardProps.layout),
      engine.settings.get(lessonProps.type).textType,
      Date.now(),
      makeStats(value.steps),
    );
    setLastResult(result);
    appendResult(result);
    newInput(engine);
  };

  const sendInput = (inputType: "appendChar" | "appendLineBreak" | "clearChar" | "clearWord", codePoint = 0) => {
    const value = input();
    if (value == null || value.completed) return;
    const now = performance.now();
    value.onInput({
      timeStamp: now,
      inputType,
      codePoint,
      timeToType: lastKeyTime === 0 ? 0 : Math.max(0, now - lastKeyTime),
    });
    if (inputType === "appendChar" || inputType === "appendLineBreak") lastKeyTime = now;
    setInput(value);
    setInputRevision((v) => v + 1);
    if (value.completed) completeLesson(value);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.repeat && (event.key === "Backspace" || event.key === "Enter")) return;
    if (view() !== "practice" || helpOpen() || event.metaKey || event.ctrlKey && event.key !== "Backspace") return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("input,select,textarea,button,[contenteditable=true]") != null) return;

    setPressed((old) => {
      const next = new Set(old);
      next.add(event.code);
      return next;
    });

    if (event.key === "Backspace") {
      event.preventDefault();
      sendInput(event.ctrlKey ? "clearWord" : "clearChar");
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      sendInput("appendLineBreak");
      return;
    }
    if (event.key === "Escape") {
      resetInput();
      return;
    }

    const keyboard = currentEngine()?.keyboard;
    if (keyboard == null || event.altKey && !event.getModifierState("AltGraph")) return;
    const characters = keyboard.getCharacters(event.code);
    const codePoint = characters?.getCodePoint(KeyModifier.from(event.shiftKey, event.getModifierState("AltGraph")))
      ?? (event.key.length === 1 ? event.key.codePointAt(0) ?? 0 : 0);
    if (codePoint !== 0) {
      event.preventDefault();
      sendInput("appendChar", codePoint);
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    setPressed((old) => {
      if (!old.has(event.code)) return old;
      const next = new Set(old);
      next.delete(event.code);
      return next;
    });
  };

  const clearPressed = () => setPressed(new Set<string>());

  const handleFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement));

  onMount(() => {
    addEventListener("keydown", handleKeyDown);
    addEventListener("keyup", handleKeyUp);
    addEventListener("blur", clearPressed);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    resultStorage.load().then(
      (loaded) => {
        history = loaded;
        setHistoryRevision((v) => v + 1);
        setHistoryReady(true);
      },
      (error) => {
        console.error("Could not load Keybr history", error);
        history = [];
        setHistoryReady(true);
      },
    );
  });

  onCleanup(() => {
    loadController?.abort();
    removeEventListener("keydown", handleKeyDown);
    removeEventListener("keyup", handleKeyUp);
    removeEventListener("blur", clearPressed);
    document.removeEventListener("fullscreenchange", handleFullscreenChange);
  });

  createEffect(() => {
    const currentSettings = settings();
    historyEpoch();
    if (!historyReady()) return;

    loadController?.abort();
    const controller = new AbortController();
    loadController = controller;
    const { signal } = controller;
    setLoadState({ type: "loading", total: 0, current: 0 });
    setInput(null);

    void (async () => {
      try {
        const keyboard = loadKeyboard(KeyboardOptions.from(currentSettings));
        const lesson = await makeLesson(currentSettings, keyboard);
        if (signal.aborted) return;
        const progress = new Progress(currentSettings, lesson);
        const relevant = lesson.filter(history);
        await schedule(progress.seedAsync(relevant, ({ total, current }) => {
          if (!signal.aborted) setLoadState({ type: "loading", total, current });
        }), { signal });
        if (signal.aborted) return;
        const engine = { settings: currentSettings, keyboard, lesson, progress };
        setLoadState({ type: "ready", engine });
        newInput(engine);
      } catch (error) {
        if (!signal.aborted) setLoadState({ type: "error", message: errorMessage(error) });
      }
    })();
  });

  const clearHistory = async () => {
    if (!confirm("Delete all local Keybr statistics?")) return;
    try {
      await resultStorage.clear();
      history = [];
      setLastResult(null);
      setHistoryRevision((v) => v + 1);
      setHistoryEpoch((v) => v + 1);
    } catch (error) {
      console.error(error);
      alert("Could not clear local typing history.");
    }
  };

  const downloadHistory = () => {
    historyRevision();
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "keybr-history.json";
    link.click();
    queueMicrotask(() => URL.revokeObjectURL(url));
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  };

  return (
    <main class="keybr-shell">
      <Show when={helpOpen()}>
        <div class="modal-backdrop" role="presentation" onPointerDown={() => setHelpOpen(false)}>
          <section class="modal" role="dialog" aria-modal="true" aria-labelledby="keybr-help-title" onPointerDown={(e) => e.stopPropagation()}>
            <button class="modal-close" aria-label="Close help" onClick={() => setHelpOpen(false)}><X size={18} /></button>
            <h2 id="keybr-help-title">Typing practice</h2>
            <p>Type the highlighted text. The lesson adapts to the keys that need work.</p>
            <p><kbd>Esc</kbd> resets the current lesson. The undo and redo controls reset or skip the lesson.</p>
          </section>
        </div>
      </Show>

      <Switch>
        <Match when={view() === "practice"}>
          <PracticeView
            state={loadState()}
            input={input()}
            inputRevision={inputRevision()}
            pressed={pressed()}
            lastResult={lastResult()}
            onHelp={() => setHelpOpen(true)}
            onReset={resetInput}
            onSkip={newInput}
            onFullscreen={toggleFullscreen}
            fullscreen={fullscreen()}
            onStats={() => setView("statistics")}
            onSettings={() => setView("settings")}
          />
        </Match>
        <Match when={view() === "statistics"}>
          <StatisticsView
            revision={historyRevision()}
            onBack={() => setView("practice")}
            onClear={clearHistory}
            onDownload={downloadHistory}
          />
        </Match>
        <Match when={view() === "settings"}>
          <SettingsView
            settings={settings()}
            onChange={updateSettings}
            onBack={() => setView("practice")}
          />
        </Match>
      </Switch>
    </main>
  );
};

function IconButton(props: {
  readonly label: string;
  readonly onClick: (event: MouseEvent) => void;
  readonly children: any;
}) {
  return <button class="icon-button" type="button" title={props.label} aria-label={props.label} onClick={props.onClick}>{props.children}</button>;
}

function HomeButton() {
  return (
    <IconButton label="Home" onClick={() => {
      const href = new URL("./", location.href).href;
      const navigate = (globalThis as any).SameyNavigate;
      if (navigate) void navigate(href);
      else location.assign(href);
    }}><Home size={20} /></IconButton>
  );
}

function AppearanceButton() {
  return (
    <IconButton label="Appearance" onClick={(event) => {
      event.stopPropagation();
      (globalThis as any).SameyOpenAppearance?.(event.currentTarget);
    }}><SunMoon size={20} /></IconButton>
  );
}

const PracticeView: Component<{
  readonly state: LoadState;
  readonly input: TextInput | null;
  readonly inputRevision: number;
  readonly pressed: ReadonlySet<string>;
  readonly lastResult: Result | null;
  readonly onHelp: () => void;
  readonly onReset: () => void;
  readonly onSkip: () => void;
  readonly onFullscreen: () => void;
  readonly fullscreen: boolean;
  readonly onStats: () => void;
  readonly onSettings: () => void;
}> = (props) => {
  const engine = () => props.state.type === "ready" ? props.state.engine : null;
  return (
    <section class="practice-page">
      <div class="practice-frame">
        <div class="control-grid" aria-label="Keybr controls">
          <IconButton label="Help" onClick={props.onHelp}><CircleHelp size={20} /></IconButton>
          <IconButton label="Reset lesson" onClick={props.onReset}><Undo2 size={20} /></IconButton>
          <IconButton label="Skip lesson" onClick={props.onSkip}><Redo2 size={20} /></IconButton>
          <IconButton label={props.fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={props.onFullscreen}>
            <Show when={props.fullscreen} fallback={<Maximize2 size={20} />}><Minimize2 size={20} /></Show>
          </IconButton>
          <HomeButton />
          <AppearanceButton />
          <IconButton label="Statistics" onClick={props.onStats}><BarChart3 size={20} /></IconButton>
          <IconButton label="Settings" onClick={props.onSettings}><SettingsIcon size={20} /></IconButton>
        </div>

        <Switch>
          <Match when={props.state.type === "loading"}>
            <LoadingState total={props.state.type === "loading" ? props.state.total : 0} current={props.state.type === "loading" ? props.state.current : 0} />
          </Match>
          <Match when={props.state.type === "error"}>
            <div class="state-message" role="alert">
              <strong>Could not load the typing lesson.</strong>
              <span>{props.state.type === "error" ? props.state.message : ""}</span>
            </div>
          </Match>
          <Match when={props.state.type === "ready" && props.input != null}>
            <LessonText input={props.input!} revision={props.inputRevision} />
            <Show when={props.lastResult}>
              {(result) => <ResultStrip result={result()} />}
            </Show>
            <Show when={engine()}>{(value) => <KeyboardView engine={value()} input={props.input!} revision={props.inputRevision} pressed={props.pressed} />}</Show>
          </Match>
        </Switch>
      </div>
    </section>
  );
};

function LoadingState(props: { readonly total: number; readonly current: number }) {
  const ratio = () => props.total > 0 ? props.current / props.total : 0;
  return (
    <div class="state-message" role="status">
      <div class="loader-ring" aria-hidden="true" />
      <span>{props.total > 0 ? `Loading history ${Math.round(ratio() * 100)}%` : "Loading lesson"}</span>
    </div>
  );
}

function LessonText(props: { readonly input: TextInput; readonly revision: number }) {
  const chars = createMemo(() => {
    props.revision;
    return props.input.chars;
  });
  return (
    <div class="lesson-text" aria-label="Typing lesson" dir="auto">
      <For each={chars()}>{(char) => {
        const cls = () => {
          const names = ["lesson-char"];
          if (char.attrs & Attr.Hit) names.push("hit");
          if (char.attrs & Attr.Miss) names.push("miss");
          if (char.attrs & Attr.Garbage) names.push("garbage");
          if (char.attrs & Attr.Cursor) names.push("cursor");
          return names.join(" ");
        };
        return <span class={cls()}>{char.codePoint === 0x20 ? " " : String.fromCodePoint(char.codePoint)}</span>;
      }}</For>
    </div>
  );
}

function ResultStrip(props: { readonly result: Result }) {
  return (
    <div class="result-strip">
      <span><b>{Math.round(props.result.speed / 5)}</b> wpm</span>
      <span><b>{Math.round(props.result.accuracy * 100)}</b>% accuracy</span>
      <span><b>{props.result.errors}</b> errors</span>
    </div>
  );
}

function keyLabel(shape: KeyShape, keyboard: Keyboard): string {
  const chars = keyboard.getCharacters(shape.id);
  if (chars != null && KeyCharacters.isCodePoint(chars.a)) return String.fromCodePoint(chars.a);
  const labels: Record<string, string> = {
    Backspace: "⌫", Tab: "tab", CapsLock: "caps", Enter: "enter",
    ShiftLeft: "shift", ShiftRight: "shift", Space: "space",
    ControlLeft: "ctrl", ControlRight: "ctrl", AltLeft: "alt", AltRight: "alt",
    MetaLeft: "meta", MetaRight: "meta",
  };
  return labels[shape.id] ?? shape.id.replace(/^(Key|Digit)/, "").toLowerCase();
}

function KeyboardView(props: {
  readonly engine: Engine;
  readonly input: TextInput;
  readonly revision: number;
  readonly pressed: ReadonlySet<string>;
}) {
  const shapes = createMemo(() => [...props.engine.keyboard.shapes.values()]);
  const bounds = createMemo(() => {
    const list = shapes();
    return {
      width: Math.max(...list.map((shape) => shape.x + shape.w), 1),
      height: Math.max(...list.map((shape) => shape.y + shape.h), 1),
    };
  });
  const expectedKey = createMemo(() => {
    props.revision;
    if (props.input.completed) return null;
    return props.engine.keyboard.getCombo(props.input.at(props.input.pos).codePoint)?.id ?? null;
  });
  return (
    <div class="keyboard-wrap" aria-hidden="true">
      <svg class="keyboard" viewBox={`0 0 ${bounds().width} ${bounds().height}`} preserveAspectRatio="xMidYMid meet">
        <For each={shapes()}>{(shape) => (
          <g classList={{ key: true, expected: expectedKey() === shape.id, pressed: props.pressed.has(shape.id) }}>
            <rect x={shape.x + 0.04} y={shape.y + 0.04} width={Math.max(0.1, shape.w - 0.08)} height={Math.max(0.1, shape.h - 0.08)} rx="0.11" />
            <text x={shape.x + shape.w / 2} y={shape.y + shape.h / 2} dominant-baseline="middle" text-anchor="middle">{keyLabel(shape, props.engine.keyboard)}</text>
          </g>
        )}</For>
      </svg>
    </div>
  );
}

const StatisticsView: Component<{
  readonly revision: number;
  readonly onBack: () => void;
  readonly onClear: () => void;
  readonly onDownload: () => void;
}> = (props) => {
  const summary = createMemo(() => {
    props.revision;
    return makeSummaryStats(history);
  });
  const recent = createMemo(() => {
    props.revision;
    return history.slice(-40);
  });
  const chart = createMemo(() => {
    const values = recent();
    const max = Math.max(1, ...values.map((r) => r.speed / 5));
    return values.map((result, index) => ({
      x: values.length <= 1 ? 50 : (index / (values.length - 1)) * 100,
      y: 100 - (result.speed / 5 / max) * 88,
    }));
  });
  return (
    <section class="panel-page">
      <header class="panel-header">
        <button class="back-button" type="button" onClick={props.onBack}>‹ Practice</button>
        <h1>Statistics</h1>
        <span />
      </header>
      <div class="stats-grid">
        <Stat label="Lessons" value={String(summary().count)} />
        <Stat label="Average" value={`${Math.round(summary().speed.avg / 5)} wpm`} />
        <Stat label="Best" value={`${Math.round(summary().speed.max / 5)} wpm`} />
        <Stat label="Accuracy" value={`${Math.round(summary().accuracy.avg * 100)}%`} />
      </div>
      <div class="chart-panel">
        <h2>Recent speed</h2>
        <Show when={chart().length > 1} fallback={<p class="muted">Complete a few lessons to build a trend.</p>}>
          <svg class="speed-chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Recent typing speed">
            <polyline points={chart().map(({ x, y }) => `${x},${y}`).join(" ")} />
          </svg>
        </Show>
      </div>
      <div class="history-actions">
        <button type="button" onClick={props.onDownload}>Download JSON</button>
        <button class="danger" type="button" onClick={props.onClear}><Trash2 size={16} /> Reset statistics</button>
      </div>
      <div class="recent-list">
        <For each={recent().slice().reverse()}>{(result) => (
          <div class="recent-row">
            <time>{new Date(result.timeStamp).toLocaleDateString()}</time>
            <span>{Math.round(result.speed / 5)} wpm</span>
            <span>{Math.round(result.accuracy * 100)}%</span>
          </div>
        )}</For>
      </div>
    </section>
  );
};

function Stat(props: { readonly label: string; readonly value: string }) {
  return <div class="stat"><span>{props.label}</span><strong>{props.value}</strong></div>;
}

const SettingsView: Component<{
  readonly settings: Settings;
  readonly onChange: (settings: Settings) => void;
  readonly onBack: () => void;
}> = (props) => {
  const options = () => KeyboardOptions.from(props.settings);
  const language = () => options().language;
  const layouts = () => options().selectableLayouts();
  const type = () => props.settings.get(lessonProps.type);
  const set = <T,>(prop: any, value: T) => props.onChange(props.settings.set(prop, value));
  return (
    <section class="panel-page settings-page">
      <header class="panel-header">
        <button class="back-button" type="button" onClick={props.onBack}>‹ Practice</button>
        <h1>Settings</h1>
        <button class="reset-button" type="button" onClick={() => props.onChange(new Settings())}><RotateCcw size={15} /> Reset</button>
      </header>

      <div class="settings-list">
        <label class="field-row"><span>Language</span>
          <select value={language().id} onChange={(event) => {
            const selected = Language.ALL.get(event.currentTarget.value, Language.EN);
            props.onChange(options().withLanguage(selected).save(props.settings));
          }}>
            <For each={[...Language.ALL]}>{(item) => <option value={item.id}>{new Intl.DisplayNames([navigator.language], { type: "language" }).of(item.id) ?? item.id}</option>}</For>
          </select>
        </label>

        <label class="field-row"><span>Keyboard layout</span>
          <select value={options().layout.id} onChange={(event) => {
            const selected = layouts().find((layout) => layout.id === event.currentTarget.value);
            if (selected) props.onChange(options().withLayout(selected).save(props.settings));
          }}>
            <For each={layouts()}>{(layout) => <option value={layout.id}>{layout.name.replace(/[{}]/g, "")}</option>}</For>
          </select>
        </label>

        <label class="field-row"><span>Lesson</span>
          <select value={type().id} onChange={(event) => {
            const selected = [...LessonType.ALL].find((item) => item.id === event.currentTarget.value) ?? LessonType.GUIDED;
            set(lessonProps.type, selected);
          }}>
            <option value="guided">Guided</option>
            <option value="wordlist">Word list</option>
            <option value="custom">Custom text</option>
            <option value="numbers">Numbers</option>
            <option value="code">Code</option>
          </select>
        </label>

        <Show when={type() === LessonType.CUSTOM}>
          <label class="field-column"><span>Custom text</span>
            <textarea rows="5" value={props.settings.get(lessonProps.customText.content)} onChange={(event) => set(lessonProps.customText.content, event.currentTarget.value)} />
          </label>
        </Show>

        <label class="field-column"><span>Target speed <b>{Math.round(props.settings.get(lessonProps.targetSpeed) / 5)} wpm</b></span>
          <input type="range" min="15" max="150" value={props.settings.get(lessonProps.targetSpeed) / 5} onInput={(event) => set(lessonProps.targetSpeed, Number(event.currentTarget.value) * 5)} />
        </label>

        <label class="field-column"><span>Lesson length</span>
          <input type="range" min="0" max="1" step="0.05" value={props.settings.get(lessonProps.length)} onInput={(event) => set(lessonProps.length, Number(event.currentTarget.value))} />
        </label>

        <Show when={type() === LessonType.GUIDED}>
          <label class="field-column"><span>Alphabet size</span>
            <input type="range" min="0" max="1" step="0.05" value={props.settings.get(lessonProps.guided.alphabetSize)} onInput={(event) => set(lessonProps.guided.alphabetSize, Number(event.currentTarget.value))} />
          </label>
          <Toggle label="Natural words" checked={props.settings.get(lessonProps.guided.naturalWords)} onChange={(value) => set(lessonProps.guided.naturalWords, value)} />
          <Toggle label="Recover weak keys" checked={props.settings.get(lessonProps.guided.recoverKeys)} onChange={(value) => set(lessonProps.guided.recoverKeys, value)} />
        </Show>

        <Toggle label="Stop on errors" checked={props.settings.get(textInputProps.stopOnError)} onChange={(value) => set(textInputProps.stopOnError, value)} />
        <Toggle label="Forgive adjacent errors" checked={props.settings.get(textInputProps.forgiveErrors)} onChange={(value) => set(textInputProps.forgiveErrors, value)} />
      </div>
    </section>
  );
};

function Toggle(props: { readonly label: string; readonly checked: boolean; readonly onChange: (value: boolean) => void }) {
  return (
    <label class="toggle-row">
      <span>{props.label}</span>
      <input type="checkbox" checked={props.checked} onChange={(event) => props.onChange(event.currentTarget.checked)} />
    </label>
  );
}

const root = document.getElementById("app");
if (root == null) throw new Error("Missing #app root element");
const dispose = render(() => <App />, root);
(globalThis as any).SameyKeybrDispose = () => {
  dispose();
  delete (globalThis as any).SameyKeybrDispose;
};
