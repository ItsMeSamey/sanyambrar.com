import { KeyboardProvider } from "@keybr/keyboard";
import { Screen } from "@keybr/pages-shared";
import { useSettings } from "@keybr/settings";
import { TypingSettings } from "@keybr/textinput-ui";
import { Button, ExplainerBoundary, Header, Icon, Spacer } from "@keybr/widget";
import { mdiDeleteForever } from "@keybr/solid-compat/mdi";
import { FormattedMessage, useIntl } from "@keybr/solid-compat/intl";
import { ExplainSettings } from "./ExplainSettings.tsx";
import { KeyboardSettings } from "./KeyboardSettings.tsx";
import { LessonSettings } from "./LessonSettings.tsx";
import { MiscSettings } from "./MiscSettings.tsx";
import * as styles from "./SettingsScreen.module.css";

export function SettingsScreen() {
    return (<KeyboardProvider>
      <Content />
    </KeyboardProvider>);
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
