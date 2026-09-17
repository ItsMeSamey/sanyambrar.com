import { KeyboardProvider } from "../../keyboard/context.tsx";
import { Screen } from "../../ui/Screen.tsx";
import { useSettings } from "../../settings/context.ts";
import { TypingSettings } from "../../textinput-ui/TypingSettings.tsx";
import { Button } from "../../widget/components/button/Button.tsx";
import { ExplainerBoundary } from "../../widget/components/explainer/ExplainerBoundary.tsx";
import { Header } from "../../widget/components/text/Header.tsx";
import { Icon } from "../../widget/components/icon/Icon.tsx";
import { Spacer } from "../../widget/components/text/Spacer.tsx";
import { Trash2 } from "../../widget/icons.ts";
import { FormattedMessage, useIntl } from "../../intl/runtime.tsx";
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
            <Button size={16} icon={<Icon shape={Trash2}/>} label={formatMessage({
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
