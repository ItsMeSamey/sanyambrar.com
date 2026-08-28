import { type KeyId } from "@keybr/keyboard";
import { names } from "@keybr/lesson-ui";
import { Screen } from "@keybr/pages-shared";
import { booleanProp, enumProp, Preferences } from "@keybr/settings";
import { type LineList } from "@keybr/textinput";
import { type IInputEvent, type IKeyboardEvent, ModifierState } from "@keybr/textinput-events";
import { TextArea } from "@keybr/textinput-ui";
import { type Focusable, Zoomer } from "@keybr/widget";
import { Match, Switch, createSignal, onMount, type JSX } from "solid-js";
import { Controls } from "./Controls.tsx";
import { Indicators } from "./Indicators.tsx";
import { DeferredKeyboardPresenter } from "./KeyboardPresenter.tsx";
import { PracticeTour } from "./PracticeTour.tsx";
import * as styles from "./Presenter.module.css";
import { type LessonState } from "./state/index.ts";

type Props = {
  readonly state: LessonState;
  readonly lines: LineList;
  readonly depressedKeys: readonly KeyId[];
  readonly onResetLesson: () => void;
  readonly onSkipLesson: () => void;
  readonly onKeyDown: (ev: IKeyboardEvent) => void;
  readonly onKeyUp: (ev: IKeyboardEvent) => void;
  readonly onInput: (ev: IInputEvent) => void;
};

enum View { Normal = 1, Compact = 2, Bare = 3 }
function getNextView(view: View): View {
  return view === View.Normal ? View.Compact : view === View.Compact ? View.Bare : View.Normal;
}
const propView = enumProp("prefs.practice.view", View, View.Normal);
const propTourSeen = booleanProp("prefs.practice.tourSeen", false);

export function Presenter(props: Props): JSX.Element {
  const focusRef: { current: Focusable | null } = { current: null };
  const [view, setView] = createSignal(Preferences.get(propView));
  const [tour, setTour] = createSignal(false);
  const [focus, setFocus] = createSignal(false);

  onMount(() => {
    if (props.state.settings.isNew && !Preferences.get(propTourSeen)) {
      Preferences.set(propTourSeen, true);
      setView(View.Normal);
      setTour(true);
    }
  });

  const reset = () => { props.onResetLesson(); focusRef.current?.focus(); };
  const skip = () => { props.onSkipLesson(); focusRef.current?.focus(); };
  const keyDown = (ev: IKeyboardEvent) => { if (focus()) props.onKeyDown(ev); };
  const keyUp = (ev: IKeyboardEvent) => { if (focus()) props.onKeyUp(ev); };
  const input = (ev: IInputEvent) => { if (focus()) props.onInput(ev); };
  const onFocus = () => { setFocus(true); props.onResetLesson(); };
  const onBlur = () => { setFocus(false); props.onResetLesson(); };
  const changeView = () => {
    const next = getNextView(view());
    Preferences.set(propView, next);
    setView(next);
    props.onResetLesson();
    queueMicrotask(() => focusRef.current?.focus());
  };
  const help = () => {
    setView(View.Normal); setTour(true); props.onResetLesson(); queueMicrotask(() => focusRef.current?.blur());
  };
  const closeTour = () => {
    setView(View.Normal); setTour(false); props.onResetLesson(); queueMicrotask(() => focusRef.current?.focus());
  };
  const controls = () => <Controls onChangeView={changeView} onResetLesson={reset} onSkipLesson={skip} onHelp={help} />;
  const textInput = (size: "X0" | "X1" | "X2", id: string) => (
    <Zoomer id={id}>
      {(moving) => <TextArea
        moving={moving()}
        focusRef={focusRef}
        settings={props.state.textDisplaySettings}
        lines={props.lines}
        size={size}
        demo={tour()}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={keyDown}
        onKeyUp={keyUp}
        onInput={input}
      />}
    </Zoomer>
  );

  return (
    <Switch>
      <Match when={view() === View.Normal}>
        <NormalLayout state={props.state} focus={tour() || focus()} depressedKeys={props.depressedKeys} toggledKeys={ModifierState.modifiers} controls={controls()} textInput={textInput("X0", "TextArea/Normal")} tour={tour() && <PracticeTour onClose={closeTour} />} />
      </Match>
      <Match when={view() === View.Compact}>
        <CompactLayout state={props.state} controls={controls()} textInput={textInput("X1", "TextArea/Compact")} />
      </Match>
      <Match when={view() === View.Bare}>
        <BareLayout controls={controls()} textInput={textInput("X2", "TextArea/Bare")} />
      </Match>
    </Switch>
  );
}

function NormalLayout(props: { readonly state: LessonState; readonly focus: boolean; readonly depressedKeys: readonly string[]; readonly toggledKeys: readonly string[]; readonly controls: JSX.Element; readonly textInput: JSX.Element; readonly tour: JSX.Element }) {
  return <Screen>
    <Indicators state={props.state} />
    <div id={names.textInput} class={styles.textInputNormal}>{props.textInput}</div>
    <div id={names.keyboard} class={styles.keyboard}>
      <Zoomer id="Keyboard/Normal"><DeferredKeyboardPresenter focus={props.focus} depressedKeys={props.depressedKeys} toggledKeys={props.toggledKeys} suffix={props.state.suffix} lastLesson={props.state.lastLesson} /></Zoomer>
    </div>
    {props.controls}{props.tour}
  </Screen>;
}
function CompactLayout(props: { readonly state: LessonState; readonly controls: JSX.Element; readonly textInput: JSX.Element }) {
  return <Screen><Indicators state={props.state} /><div id={names.textInput} class={styles.textInputCompact}>{props.textInput}</div>{props.controls}</Screen>;
}
function BareLayout(props: { readonly controls: JSX.Element; readonly textInput: JSX.Element }) {
  return <Screen><div id={names.textInput} class={styles.textInputBare}>{props.textInput}</div>{props.controls}</Screen>;
}
