import { getDir } from "@keybr/intl";
import { names } from "@keybr/lesson-ui";
import { Icon, IconButton } from "@keybr/widget";
import {
  mdiAspectRatio,
  mdiHelpCircleOutline,
  mdiRedo,
  mdiUndo,
} from "@keybr/solid-compat/mdi";
import { memo, type ReactNode } from "@keybr/solid-compat/react";
import { useIntl } from "@keybr/solid-compat/intl";
import * as styles from "./Controls.module.css";

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
      <IconButton
        icon={<Icon shape={mdiHelpCircleOutline} />}
        title={formatMessage({
          id: "practice.widget.showTour.description",
          defaultMessage: "Show a guided tour with help slides.",
        })}
        onClick={props.onHelp}
      />
      <IconButton
        icon={<Icon shape={rtl ? mdiRedo : mdiUndo} />}
        title={formatMessage({
          id: "practice.widget.resetLesson.description",
          defaultMessage: "Reset the current lesson (Ctrl + Left Arrow).",
        })}
        onClick={props.onResetLesson}
      />
      <IconButton
        icon={<Icon shape={rtl ? mdiUndo : mdiRedo} />}
        title={formatMessage({
          id: "practice.widget.skipLesson.description",
          defaultMessage: "Skip the current lesson (Ctrl + Right Arrow).",
        })}
        onClick={props.onSkipLesson}
      />
      <IconButton
        icon={<Icon shape={mdiAspectRatio} />}
        title={formatMessage({
          id: "practice.widget.switchView.description",
          defaultMessage: "Switch the current interface layout.",
        })}
        onClick={props.onChangeView}
      />
    </div>
  );
});
