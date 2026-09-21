import { loadContent, loadWordList } from "../../content/load.ts";
import { KeyboardProvider } from "../../keyboard/context.tsx";
import { KeyboardOptions } from "../../keyboard/settings.ts";
import { lessonProps } from "../../lesson/settings.ts";
import { LessonType } from "../../lesson/lessontype.ts";
import { Screen } from "../../ui/Screen.tsx";
import { useSettings } from "../../settings/context.ts";
import { TypingSettings } from "../../textinput-ui/TypingSettings.tsx";
import { Button } from "../../widget/components/button/Button.tsx";
import { ExplainerBoundary } from "../../widget/components/explainer/ExplainerBoundary.tsx";
import { Header } from "../../widget/components/text/Header.tsx";
import { Icon } from "../../widget/components/icon/Icon.tsx";
import { Spacer } from "../../widget/components/text/Spacer.tsx";
import { Trash2 } from "../../../../shared/components/Icons.tsx";
import { FormattedMessage, useIntl } from "../../intl/runtime.tsx";
import { onCleanup, onSettled } from "solid-js";
import { ExplainToggle } from "../../ui/ExplainToggle.tsx";
import { KeyboardSettings } from "./KeyboardSettings.tsx";
import { LessonSettings } from "./LessonSettings.tsx";
import { MiscSettings } from "./MiscSettings.tsx";
import styles from "./SettingsScreen.module.css";

export function SettingsScreen() {
    return (<KeyboardProvider>
      <Content />
    </KeyboardProvider>);
}

function Content() {
    const { formatMessage } = useIntl();
    const { settings, updateSettings } = useSettings();
    let warmTimer = 0;
    let warmIdle = 0;
    onSettled(() => {
      const warm = () => {
        const type = settings.get(lessonProps.type);
        if (type === LessonType.GUIDED || type === LessonType.WORDLIST) {
          void loadWordList(KeyboardOptions.from(settings).language);
        } else if (type === LessonType.BOOKS) {
          void loadContent(settings.get(lessonProps.books.book));
        }
      };
      if (typeof requestIdleCallback === "function") {
        warmIdle = requestIdleCallback(warm, { timeout: 700 });
      } else {
        warmTimer = window.setTimeout(warm, 120);
      }
    });
    onCleanup(() => {
      if (warmIdle && typeof cancelIdleCallback === "function") cancelIdleCallback(warmIdle);
      if (warmTimer) clearTimeout(warmTimer);
    });
    return (<Screen className={styles.settingsScreen}>
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
            <ExplainToggle preference="prefs.settings.explain" messageId="t_Explain_settings" defaultMessage="Explain settings" />
          </div>
        </div>
        <LessonSettings />

        <section class={styles.settingsSection}>
          <Spacer size={5}/>
          <Header level={1}>
            <FormattedMessage id="t_Typing" defaultMessage="Typing"/>
          </Header>
          <TypingSettings />
        </section>

        <section class={styles.settingsSection}>
          <Spacer size={5}/>
          <Header level={1}>
            <FormattedMessage id="t_Keyboard" defaultMessage="Keyboard"/>
          </Header>
          <KeyboardSettings />
        </section>

        <section class={styles.settingsSection}>
          <Spacer size={5}/>
          <Header level={1}>
            <FormattedMessage id="t_Miscellaneous" defaultMessage="Miscellaneous"/>
          </Header>
          <MiscSettings />
        </section>
      </ExplainerBoundary>
    </Screen>);
}
