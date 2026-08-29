import { KeyboardProvider } from "@keybr/keyboard";
import { Screen } from "@keybr/pages-shared";
import { Settings, SettingsContext, useSettings } from "@keybr/settings";
import { TypingSettings } from "@keybr/textinput-ui";
import { Button, ExplainerBoundary, Field, FieldList, Header, Icon, Spacer, useView, } from "@keybr/widget";
import { mdiCheckCircle, mdiDeleteForever } from "@keybr/solid-compat/mdi";
import { useState } from "@keybr/solid-compat/react";
import { liveObject } from "@keybr/solid-compat/live";
import { FormattedMessage, useIntl } from "@keybr/solid-compat/intl";
import { views } from "../views.tsx";
import { ExplainSettings } from "./ExplainSettings.tsx";
import { KeyboardSettings } from "./KeyboardSettings.tsx";
import { LessonSettings } from "./LessonSettings.tsx";
import { MiscSettings } from "./MiscSettings.tsx";
import * as styles from "./SettingsScreen.module.css";
export function SettingsScreen() {
    const { settings, updateSettings } = useSettings();
    const { setView } = useView(views);
    const [newSettings, updateNewSettings] = useState(() => snapshotSettings(settings));
    const draftContext = {
        settings: liveObject(newSettings),
        updateSettings: updateNewSettings,
    };
    return (<SettingsContext.Provider value={draftContext}>
      <KeyboardProvider>
        <Content onSubmit={() => {
            updateSettings(snapshotSettings(newSettings()));
            setView("practice");
        }}/>
      </KeyboardProvider>
    </SettingsContext.Provider>);
}

function snapshotSettings(settings: Settings): Settings {
    return new Settings(settings.toJSON(), settings.isNew);
}

function Content(solidProps: {
    readonly onSubmit: () => void;
}) {
    const { formatMessage } = useIntl();
    const { settings, updateSettings } = useSettings();
    return (<Screen>
      <ExplainerBoundary>
        <ExplainSettings />

        <Header level={1}>
          <FormattedMessage id="t_Lessons" defaultMessage="Lessons"/>
        </Header>
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

        <div class={styles.footer}>
          <FieldList>
            <Field>
              <Button size={16} icon={<Icon shape={mdiDeleteForever}/>} label={formatMessage({
            id: "t_Reset",
            defaultMessage: "Reset",
        })} onClick={() => {
            updateSettings(settings.reset());
        }}/>
            </Field>
            <Field.Filler />
            <Field>
              <Button size={16} icon={<Icon shape={mdiCheckCircle}/>} label={formatMessage({
            id: "t_Done",
            defaultMessage: "Done",
        })} onClick={() => {
            solidProps.onSubmit();
        }}/>
            </Field>
          </FieldList>
        </div>
      </ExplainerBoundary>
    </Screen>);
}
