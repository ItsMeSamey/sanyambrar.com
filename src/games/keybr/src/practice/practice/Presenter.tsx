import { type KeyId } from "../../keyboard/types.ts";
import { BooksLesson } from "../../lesson/books.ts";
import { type CodePoint } from "../../unicode/types.ts";
import { names } from "../../lesson-ui/names.ts";
import { Screen } from "../../ui/Screen.tsx";
import { booleanProp, enumProp } from "../../settings/props.ts";
import { Preferences } from "../../settings/preferences.ts";
import { type LineList } from "../../textinput/chars.ts";
import { type IInputEvent, type IKeyboardEvent } from "../../textinput-events/types.ts";
import { ModifierState } from "../../textinput-events/modifiers.ts";
import { TextArea } from "../../textinput-ui/TextArea.tsx";
import { type Focusable } from "../../widget/components/types.ts";
import { Zoomer } from "../../widget/components/zoomer/Zoomer.tsx";
import { Match, Switch, createSignal, onSettled } from 'solid-js';
import { type JSX } from '@solidjs/web';
import { Controls } from "./Controls.tsx";
import { Indicators } from "./Indicators.tsx";
import { KeyboardPresenter } from "./KeyboardPresenter.tsx";
import { PracticeTour } from "./PracticeTour.tsx";
import * as styles from "./Presenter.module.css";
import { type LastLesson } from "./state/last-lesson.ts";
import { type LessonState } from "./state/lesson-state.ts";

type Props = {
  readonly state: LessonState;
  readonly lines: LineList;
  readonly depressedKeys: readonly KeyId[];
  readonly suffix: readonly CodePoint[];
  readonly lastLesson: LastLesson | null;
  readonly onResetLesson: () => void;
  readonly onPreviousLesson: () => void;
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
  let focusTarget: Focusable | null = null;
  const [view, setView] = createSignal(Preferences.get(propView));
  const [tour, setTour] = createSignal(false);
  const [focus, setFocus] = createSignal(false);

  onSettled(() => {
    if (props.state.settings.isNew && !Preferences.get(propTourSeen)) {
      Preferences.set(propTourSeen, true);
      setView(View.Normal);
      setTour(true);
    }
  });

  const previous = () => { props.onPreviousLesson(); focusTarget?.focus(); };
  const skip = () => { props.onSkipLesson(); focusTarget?.focus(); };
  const keyDown = (ev: IKeyboardEvent) => { if (focus()) props.onKeyDown(ev); };
  const keyUp = (ev: IKeyboardEvent) => { if (focus()) props.onKeyUp(ev); };
  const input = (ev: IInputEvent) => { if (focus()) props.onInput(ev); };
  const onFocus = () => setFocus(true);
  const onBlur = () => setFocus(false);
  const changeView = () => {
    const next = getNextView(view());
    Preferences.set(propView, next);
    setView(next);
    props.onResetLesson();
    queueMicrotask(() => focusTarget?.focus());
  };
  const help = () => {
    setView(View.Normal); setTour(true); props.onResetLesson(); queueMicrotask(() => focusTarget?.blur());
  };
  const closeTour = () => {
    setView(View.Normal); setTour(false); props.onResetLesson(); queueMicrotask(() => focusTarget?.focus());
  };
  const controls = () => <Controls onChangeView={changeView} onPreviousLesson={previous} previousLesson={props.state.lesson instanceof BooksLesson} onSkipLesson={skip} onHelp={help} />;
  const textInput = (size: "X0" | "X1" | "X2", id: string) => (
    <Zoomer id={id}>
      {(moving) => <TextArea
        moving={moving()}
        focusRef={(value) => { focusTarget = value; }}
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
        <NormalLayout state={props.state} focus={tour() || focus()} depressedKeys={props.depressedKeys} suffix={props.suffix} toggledKeys={ModifierState.modifiers} lastLesson={props.lastLesson} controls={controls()} textInput={textInput("X0", "TextArea/Normal")} tour={tour() && <PracticeTour onClose={closeTour} />} />
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

function NormalLayout(props: { readonly state: LessonState; readonly focus: boolean; readonly depressedKeys: readonly string[]; readonly suffix: readonly CodePoint[]; readonly toggledKeys: readonly string[]; readonly lastLesson: LastLesson | null; readonly controls: JSX.Element; readonly textInput: JSX.Element; readonly tour: JSX.Element }) {
  return <Screen>
    <Indicators state={props.state} />
    <div id={names.textInput} class={styles.textInputNormal}>{props.textInput}</div>
    <div id={names.keyboard} class={styles.keyboard}>
      <Zoomer id="Keyboard/Normal"><KeyboardPresenter focus={props.focus} depressedKeys={props.depressedKeys} toggledKeys={props.toggledKeys} suffix={props.suffix} lastLesson={props.lastLesson} /></Zoomer>
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
