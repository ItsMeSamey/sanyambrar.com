import { getDir } from "@keybr/intl";
import { names } from "@keybr/lesson-ui";
import { CircleHelp } from '../../../../../../ui-kit/components/lucide.tsx';
import { Maximize2 } from '../../../../../../ui-kit/components/lucide.tsx';
import { Redo2 } from '../../../../../../ui-kit/components/lucide.tsx';
import { Undo2 } from '../../../../../../ui-kit/components/lucide.tsx';
import { memo, type ReactNode } from "@keybr/solid-compat/react";
import { useIntl } from "@keybr/solid-compat/intl";
import * as styles from "./Controls.module.css";

function ControlButton(props: {
  readonly title: string;
  readonly onClick: () => void;
  readonly children: ReactNode;
}) {
  return <button type="button" class={styles.controlButton} title={props.title} aria-label={props.title} onClick={props.onClick}>{props.children}</button>;
}

export const Controls = memo(function Controls(props: {
  readonly onChangeView: () => void;
  readonly onResetLesson: () => void;
  readonly onSkipLesson: () => void;
  readonly onHelp: () => void;
}): ReactNode {
  const { formatMessage, locale } = useIntl();
  const rtl = getDir(locale) === "rtl";
  return (
    <div id={names.controls} class={styles.controls}>
      <ControlButton
        title={formatMessage({
          id: "practice.widget.showTour.description",
          defaultMessage: "Show a guided tour with help slides.",
        })}
        onClick={props.onHelp}
      ><CircleHelp aria-hidden="true" /></ControlButton>
      <ControlButton
        title={formatMessage({
          id: "practice.widget.switchView.description",
          defaultMessage: "Switch the current interface layout.",
        })}
        onClick={props.onChangeView}
      ><Maximize2 aria-hidden="true" /></ControlButton>
      <ControlButton
        title={formatMessage({
          id: "practice.widget.resetLesson.description",
          defaultMessage: "Reset the current lesson (Ctrl + Left Arrow).",
        })}
        onClick={props.onResetLesson}
      >{rtl ? <Redo2 aria-hidden="true" /> : <Undo2 aria-hidden="true" />}</ControlButton>
      <ControlButton
        title={formatMessage({
          id: "practice.widget.skipLesson.description",
          defaultMessage: "Skip the current lesson (Ctrl + Right Arrow).",
        })}
        onClick={props.onSkipLesson}
      >{rtl ? <Undo2 aria-hidden="true" /> : <Redo2 aria-hidden="true" />}</ControlButton>
    </div>
  );
});
