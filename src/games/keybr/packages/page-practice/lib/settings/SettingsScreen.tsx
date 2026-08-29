import { KeyboardProvider } from "@keybr/keyboard";
import { Screen } from "@keybr/pages-shared";
import { createReactiveSettings, Settings, SettingsContext, useSettings } from "@keybr/settings";
import { TypingSettings } from "@keybr/textinput-ui";
import { Button, ExplainerBoundary, Header, Icon, Spacer, useView } from "@keybr/widget";
import { mdiDeleteForever } from "@keybr/solid-compat/mdi";
import { FormattedMessage, useIntl } from "@keybr/solid-compat/intl";
import { onCleanup } from "solid-js";
import { views } from "../views.tsx";
import { ExplainSettings } from "./ExplainSettings.tsx";
import { KeyboardSettings } from "./KeyboardSettings.tsx";
import { LessonSettings } from "./LessonSettings.tsx";
import { MiscSettings } from "./MiscSettings.tsx";
import * as styles from "./SettingsScreen.module.css";

export function SettingsScreen() {
    const { settings, updateSettings } = useSettings();
    const { setBeforeLeave } = useView(views);
    const draft = createReactiveSettings(snapshotSettings(settings));
    const draftContext = {
        settings: draft.settings,
        updateSettings: draft.replace,
    };
    const disposeBeforeLeave = setBeforeLeave(() => {
        updateSettings(snapshotSettings(draft.current()));
    });
    onCleanup(disposeBeforeLeave);
    return (<SettingsContext.Provider value={draftContext}>
      <KeyboardProvider>
        <Content />
      </KeyboardProvider>
    </SettingsContext.Provider>);
}

function snapshotSettings(settings: Settings): Settings {
    return new Settings(settings.toJSON(), settings.isNew);
}

function Content() {
    const { formatMessage } = useIntl();
    const { settings, updateSettings } = useSettings();
    return (<Screen>
      <ExplainerBoundary>
        <div class={styles.lessonHeading}>
          <Header level={1}>
            <FormattedMessage id="t_Lessons" defaultMessage="Lessons"/>
          </Header>
          <div class={styles.lessonActions}>
            <Button size={16} icon={<Icon shape={mdiDeleteForever}/>} label={formatMessage({
                id: "settings.reset.label",
                defaultMessage: "Reset settings",
            })} onClick={() => {
                updateSettings(settings.reset());
            }}/>
            <ExplainSettings />
          </div>
        </div>
        <LessonSettings />

        <Spacer size={5}/>

        <Header level={1}>
          <FormattedMessage id="t_Typing" defaultMessage="Typing"/>
        </Header>
        <TypingSettings />

        <Spacer size={5}/>

        <Header level={1}>
          <FormattedMessage id="t_Keyboard" defaultMessage="Keyboard"/>
        </Header>
        <KeyboardSettings />

        <Spacer size={5}/>

        <Header level={1}>
          <FormattedMessage id="t_Miscellaneous" defaultMessage="Miscellaneous"/>
        </Header>
        <MiscSettings />
      </ExplainerBoundary>
    </Screen>);
}
