import type { JSX } from "@solidjs/web";
import { getDir } from "../../intl/locale.ts";
import { names } from "../../lesson-ui/names.ts";
import { CircleHelp } from '../../../../../shared/components/Icons.tsx';
import { Maximize2 } from '../../../../../shared/components/Icons.tsx';
import { Redo2 } from '../../../../../shared/components/Icons.tsx';
import { Undo2 } from '../../../../../shared/components/Icons.tsx';

import { useIntl } from "../../intl/runtime.tsx";
import styles from "./Controls.module.css";
function ControlButton(props: {
    readonly title: string;
    readonly onClick: () => void;
    readonly children: JSX.Element;
}) {
    return <button type="button" class={styles.controlButton} title={props.title} aria-label={props.title} onPointerDown={(event) => event.preventDefault()} onClick={props.onClick}>{props.children}</button>;
}
export const Controls = function Controls(props: {
    readonly onChangeView: () => void;
    readonly onPreviousLesson: () => void;
    readonly previousLesson: boolean;
    readonly onSkipLesson: () => void;
    readonly onHelp: () => void;
}): JSX.Element {
    const { formatMessage, locale } = useIntl();
    const rtl = getDir(locale) === "rtl";
    return (<div id={names.controls} class={styles.controls}>
      <ControlButton title={formatMessage({
            id: "practice.widget.showTour.description",
            defaultMessage: "Show a guided tour with help slides.",
        })} onClick={props.onHelp}><CircleHelp aria-hidden="true"/></ControlButton>
      <ControlButton title={formatMessage({
            id: "practice.widget.switchView.description",
            defaultMessage: "Switch the current interface layout.",
        })} onClick={props.onChangeView}><Maximize2 aria-hidden="true"/></ControlButton>
      <ControlButton title={props.previousLesson
            ? formatMessage({
                id: "practice.widget.previousLesson.description",
                defaultMessage: "Previous lesson (Ctrl + Left Arrow).",
            })
            : formatMessage({
                id: "practice.widget.resetLesson.description",
                defaultMessage: "Reset the current lesson (Ctrl + Left Arrow).",
            })} onClick={props.onPreviousLesson}>{rtl ? <Redo2 aria-hidden="true"/> : <Undo2 aria-hidden="true"/>}</ControlButton>
      <ControlButton title={formatMessage({
            id: "practice.widget.skipLesson.description",
            defaultMessage: "Skip the current lesson (Ctrl + Right Arrow).",
        })} onClick={props.onSkipLesson}>{rtl ? <Undo2 aria-hidden="true"/> : <Redo2 aria-hidden="true"/>}</ControlButton>
    </div>);
};
