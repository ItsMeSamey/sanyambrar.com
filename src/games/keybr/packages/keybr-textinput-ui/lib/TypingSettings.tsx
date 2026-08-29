import { KeyboardOptions, useKeyboard } from "@keybr/keyboard";
import { Tasks } from "@keybr/lang";
import { Settings, useSettings } from "@keybr/settings";
import { CaretMovementStyle, CaretShapeStyle, Feedback, Font, textDisplayProps, textInputProps, toTextDisplaySettings, WhitespaceStyle, } from "@keybr/textinput";
import { makeSoundPlayer, PlaySounds, soundProps, SoundTheme, } from "@keybr/textinput-sounds";
import { Description, Explainer, Field, FieldList, FieldSet, Icon, IconButton, OptionList, Range, SegmentedControl, Toggle, } from "@keybr/widget";
import { mdiPlayCircleOutline, mdiStopCircleOutline } from "@keybr/solid-compat/mdi";
import { useEffect, useState } from "@keybr/solid-compat/react";
import { createMemo } from "solid-js";
import { FormattedMessage, useIntl } from "@keybr/solid-compat/intl";
import { AnimatedText } from "./AnimatedText.tsx";
import * as styles from "./TypingSettings.module.css";
export function TypingSettings() {
    const { formatMessage } = useIntl();
    return (<>
      <FieldSet legend={formatMessage({
            id: "t_Typing_options",
            defaultMessage: "Typing options",
        })}>
        <Explainer>
          <Description>
            <FormattedMessage id="settings.typingAssists.description" defaultMessage="These are the typing assists which help your preserve your concentration and keep the flow by automatically correcting your errors."/>
          </Description>
        </Explainer>
        <StopOnErrorProp />
        <ForgiveErrorsProp />
        <SpaceSkipsWordsProp />
      </FieldSet>
      <FieldSet legend={formatMessage({
            id: "t_Text_appearance",
            defaultMessage: "Text appearance",
        })}>
        <ExampleText />
        <FontProp />
        <WhitespaceProp />
        <CursorShapeProp />
        <CursorMovementProp />
        <SoundsProp />
        <SoundsThemeProp />
      </FieldSet>
    </>);
}
function ExampleText() {
    const { settings } = useSettings();
    const keyboard = useKeyboard();
    return (<div class={styles.exampleText}>
      <AnimatedText settings={toTextDisplaySettings(settings)} text={keyboard.getExampleText()}/>
    </div>);
}
function StopOnErrorProp() {
    const { formatMessage } = useIntl();
    const { settings, updateSettings } = useSettings();
    return (<>
      <FieldList>
        <Field>
          <Toggle label={formatMessage({
            id: "t_Stop_cursor_on_error",
            defaultMessage: "Stop cursor on error",
        })} checked={settings.get(textInputProps.stopOnError)} onChange={(value) => {
            updateSettings(settings.set(textInputProps.stopOnError, value));
        }}/>
        </Field>
      </FieldList>
      <Explainer>
        <Description>
          <FormattedMessage id="settings.stopCursorOnError.description" defaultMessage="If enabled, the text cursor stops advancing until the right key is pressed at the current position. If disabled, all errors will be accumulated in the text input field and must be cleared with the delete key."/>
        </Description>
      </Explainer>
    </>);
}
function ForgiveErrorsProp() {
    const { formatMessage } = useIntl();
    const { settings, updateSettings } = useSettings();
    return (<>
      <FieldList>
        <Field>
          <Toggle label={formatMessage({
            id: "t_Forgive_errors:",
            defaultMessage: "Forgive errors",
        })} checked={settings.get(textInputProps.forgiveErrors)} onChange={(value) => {
            updateSettings(settings.set(textInputProps.forgiveErrors, value));
        }}/>
        </Field>
      </FieldList>
      <Explainer>
        <Description>
          <FormattedMessage id="settings.forgiveErrors.description" defaultMessage="If enabled, the text input field will forgive some kinds of errors by automatically fixing them. These are errors such as typing a wrong character or skipping a character."/>
        </Description>
      </Explainer>
    </>);
}
function SpaceSkipsWordsProp() {
    const { formatMessage } = useIntl();
    const { settings, updateSettings } = useSettings();
    return (<>
      <FieldList>
        <Field>
          <Toggle label={formatMessage({
            id: "t_Space_skips_words",
            defaultMessage: "Space skips words",
        })} checked={settings.get(textInputProps.spaceSkipsWords)} onChange={(value) => {
            updateSettings(settings.set(textInputProps.spaceSkipsWords, value));
        }}/>
        </Field>
      </FieldList>
      <Explainer>
        <Description>
          <FormattedMessage id="settings.spaceSkipsWords.description" defaultMessage="If enabled, pressing the space key in the middle of a word will skip the remaining characters of the word and position cursor at the beginning of the next word."/>
        </Description>
      </Explainer>
    </>);
}
function FontProp() {
    const { settings, updateSettings } = useSettings();
    const language = () => KeyboardOptions.from(settings).language;
    const fonts = () => Font.select(language());
    const font = () => Font.find(fonts(), settings.get(textDisplayProps.font));
    return (<FieldList>
      <Field size={10}>
        <FormattedMessage id="t_Font:" defaultMessage="Font:"/>
      </Field>
      <Field>
        <OptionList options={fonts().map((item) => ({
            value: item.id,
            name: <span style={item.cssProperties}>{item.name}</span>,
        }))} value={font().id} onSelect={(id) => {
            updateSettings(settings.set(textDisplayProps.font, Font.ALL.get(id)));
        }}/>
      </Field>
    </FieldList>);
}
function WhitespaceProp() {
    const { formatMessage } = useIntl();
    const { settings, updateSettings } = useSettings();
    return (<FieldList>
      <Field size={10}><FormattedMessage id="t_Whitespace:" defaultMessage="Whitespace:"/></Field>
      <Field>
        <SegmentedControl
          label="Whitespace"
          value={settings.get(textDisplayProps.whitespaceStyle)}
          options={[
            { value: WhitespaceStyle.Space, label: formatMessage({ id: "t_ws_No_whitespace", defaultMessage: "None" }) },
            { value: WhitespaceStyle.Bar, label: formatMessage({ id: "t_ws_Bar_whitespace", defaultMessage: "Bar" }) },
            { value: WhitespaceStyle.Bullet, label: formatMessage({ id: "t_ws_Bullet_whitespace", defaultMessage: "Bullet" }) },
          ]}
          onChange={(value) => updateSettings(settings.set(textDisplayProps.whitespaceStyle, value))}
        />
      </Field>
    </FieldList>);
}
function CursorShapeProp() {
    const { settings, updateSettings } = useSettings();
    return (<FieldList>
      <Field size={10}><FormattedMessage id="t_Cursor_shape:" defaultMessage="Cursor shape:"/></Field>
      <Field>
        <SegmentedControl
          label="Cursor shape"
          value={settings.get(textDisplayProps.caretShapeStyle)}
          options={[
            { value: CaretShapeStyle.Block, label: "Block" },
            { value: CaretShapeStyle.Box, label: "Box" },
            { value: CaretShapeStyle.Line, label: "Line" },
            { value: CaretShapeStyle.Underline, label: "Underline" },
          ]}
          onChange={(value) => updateSettings(settings.set(textDisplayProps.caretShapeStyle, value))}
        />
      </Field>
    </FieldList>);
}
function CursorMovementProp() {
    const { settings, updateSettings } = useSettings();
    return (<FieldList>
      <Field size={10}><FormattedMessage id="t_Cursor_movement:" defaultMessage="Cursor movement:"/></Field>
      <Field>
        <SegmentedControl
          label="Cursor movement"
          value={settings.get(textDisplayProps.caretMovementStyle)}
          options={[
            { value: CaretMovementStyle.Jumping, label: "Jumping" },
            { value: CaretMovementStyle.Smooth, label: "Smooth" },
          ]}
          onChange={(value) => updateSettings(settings.set(textDisplayProps.caretMovementStyle, value))}
        />
      </Field>
    </FieldList>);
}
function SoundsProp() {
    const { settings, updateSettings } = useSettings();
    return (<>
      <FieldList>
        <Field size={10}><FormattedMessage id="t_Play_sounds:" defaultMessage="Play sounds:"/></Field>
        <Field>
          <SegmentedControl
            label="Play sounds"
            value={settings.get(soundProps.playSounds)}
            options={[
              { value: PlaySounds.None, label: "None" },
              { value: PlaySounds.ErrorsOnly, label: "Error only" },
              { value: PlaySounds.KeysOnly, label: "Key only" },
              { value: PlaySounds.All, label: "All" },
            ]}
            onChange={(value) => updateSettings(settings.set(soundProps.playSounds, value))}
          />
        </Field>
      </FieldList>
      <FieldList>
        <Field size={10}><FormattedMessage id="t_Sound_volume:" defaultMessage="Volume:"/></Field>
        <Field>
          <Range min={0} max={100} step={1} value={Math.round(settings.get(soundProps.soundVolume) * 100)} onChange={(value) => {
              updateSettings(settings.set(soundProps.soundVolume, value / 100));
          }}/>
        </Field>
      </FieldList>
    </>);
}
function SoundsThemeProp() {
    const { settings, updateSettings } = useSettings();
    return (<FieldList>
      <Field size={10}>
        <FormattedMessage id="t_Sound_theme:" defaultMessage="Sound theme:"/>
      </Field>
      <Field>
        <OptionList options={SoundTheme.ALL.map((item) => ({
            value: item.id,
            name: item.name,
        }))} value={settings.get(soundProps.soundTheme).id} onSelect={(id) => {
            updateSettings(settings.set(soundProps.soundTheme, SoundTheme.ALL.get(id)));
        }}/>
      </Field>
      <Field>
        <SoundThemePreview />
      </Field>
    </FieldList>);
}
function SoundThemePreview() {
    const { settings } = useSettings();
    const player = createMemo(() => {
        if (process.env.NODE_ENV === "test") {
            return () => { };
        }
        return makeSoundPlayer(new Settings()
            .set(soundProps.playSounds, PlaySounds.All)
            .set(soundProps.soundVolume, settings.get(soundProps.soundVolume))
            .set(soundProps.soundTheme, settings.get(soundProps.soundTheme)));
    });
    const [playing, setPlaying] = useState(false);
    useEffect(() => {
        const tasks = new Tasks();
        if (playing()) {
            tasks.repeated(300, () => {
                player()(Feedback.Succeeded);
            });
        }
        return () => {
            tasks.cancelAll();
        };
    }, () => [player, playing()]);
    return (<IconButton icon={<Icon shape={playing() ? mdiStopCircleOutline : mdiPlayCircleOutline}/>} onClick={() => {
            setPlaying(!playing());
        }}/>);
}
