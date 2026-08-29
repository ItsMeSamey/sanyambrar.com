import { getDir } from "@keybr/intl";
import { names } from "@keybr/lesson-ui";
import { Icon, IconButton, useView } from "@keybr/widget";
import { mdiAspectRatio, mdiChartBar, mdiCog, mdiHelpCircleOutline, mdiHome, mdiThemeLightDark, mdiRedo, mdiUndo, } from "@keybr/solid-compat/mdi";
import { memo, type ReactNode } from "@keybr/solid-compat/react";
import { useIntl } from "@keybr/solid-compat/intl";
import { views } from "../views.tsx";
import * as styles from "./Controls.module.css";
export const Controls = memo(function Controls(solidProps: {
    readonly onChangeView: () => void;
    readonly onResetLesson: () => void;
    readonly onSkipLesson: () => void;
    readonly onHelp: () => void;
}): ReactNode {
    const { formatMessage, locale } = useIntl();
    const rtl = getDir(locale) === "rtl";
    const { setView } = useView(views);
    return (<div id={names.controls} class={styles.controls}>
      <IconButton icon={<Icon shape={mdiHome}/>} title="Home" onClick={() => {
            const href = new URL("./", location.href).href;
            const navigate = (globalThis as any).SameyNavigate;
            if (navigate)
                void navigate(href);
            else
                location.assign(href);
        }}/>
      <IconButton icon={<Icon shape={mdiThemeLightDark}/>} title="Appearance" data-samey-appearance="" aria-expanded="false"/>
      <IconButton icon={<Icon shape={mdiHelpCircleOutline}/>} title={formatMessage({
            id: "practice.widget.showTour.description",
            defaultMessage: "Show a guided tour with help slides.",
        })} onClick={solidProps.onHelp}/>
      <span style={{ display: "contents" }}>
        <IconButton icon={<Icon shape={rtl ? mdiRedo : mdiUndo}/>} title={formatMessage({
            id: "practice.widget.resetLesson.description",
            defaultMessage: "Reset the current lesson (Ctrl + Left Arrow).",
        })} onClick={solidProps.onResetLesson}/>
        <IconButton icon={<Icon shape={rtl ? mdiUndo : mdiRedo}/>} title={formatMessage({
            id: "practice.widget.skipLesson.description",
            defaultMessage: "Skip the current lesson (Ctrl + Right Arrow).",
        })} onClick={solidProps.onSkipLesson}/>
      </span>
      <IconButton icon={<Icon shape={mdiAspectRatio}/>} title={formatMessage({
            id: "practice.widget.switchView.description",
            defaultMessage: "Switch the current interface layout.",
        })} onClick={solidProps.onChangeView}/>
      <IconButton icon={<Icon shape={mdiChartBar}/>} title={formatMessage({
            id: "local.statistics.description",
            defaultMessage: "Show your local typing statistics.",
        })} onClick={() => setView("statistics")}/>
      <IconButton icon={<Icon shape={mdiCog}/>} title={formatMessage({
            id: "practice.widget.settings.description",
            defaultMessage: "Change lesson settings, configure language, keyboard layout, etc.",
        })} onClick={() => setView("settings")}/>
    </div>);
});
