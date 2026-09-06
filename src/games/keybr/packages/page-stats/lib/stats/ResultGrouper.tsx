import { useCollator } from "@keybr/intl";
import { KeyboardContext, keyboardProps, Layout, loadKeyboard, useFormattedNames, } from "@keybr/keyboard";
import { Letter } from "@keybr/phonetic-model";
import { PhoneticModelLoader } from "@keybr/phonetic-model-loader";
import { type KeyStatsMap, makeKeyStatsMap, ResultGroups, useResults, } from "@keybr/result";
import { useSettings } from "@keybr/settings";
import { Field, FieldList, OptionList } from "@keybr/widget";
import { type ReactNode, useState } from "@keybr/solid-compat/react";
import { createMemo } from 'solid-js';
import { FormattedMessage, useIntl } from "@keybr/solid-compat/intl";
export function ResultGrouper(solidProps: {
    children: (keyStatsMap: KeyStatsMap) => ReactNode;
    actions?: ReactNode;
}) {
    const { formatMessage } = useIntl();
    const { settings } = useSettings();
    const { results } = useResults();
    const groups = createMemo(() => ResultGroups.byLayout(results));
    const configuredLayout = () => settings.get(keyboardProps.layout);
    const resultsLayouts = createMemo(() => {
        const layouts = new Set(groups().keys());
        if (layouts.size === 0) layouts.add(configuredLayout());
        return layouts;
    });
    const defaultLayout = () => resultsLayouts().has(configuredLayout())
        ? configuredLayout()
        : [...resultsLayouts()][0];
    const [choice, setSelectedLayout] = useState(defaultLayout);
    const selectedLayout = () => resultsLayouts().has(choice()) ? choice() : defaultLayout();
    const [characterClass, setCharacterClass] = useState("letters");
    const layoutOptions = useLayoutOptions(resultsLayouts);
    const keyboard = createMemo(() => loadKeyboard(selectedLayout()));
    const group = () => groups().get(selectedLayout());
    return (<>
      <FieldList>
        <Field>
          <FormattedMessage id="t_Show_statistics_for:" defaultMessage="Show statistics for:"/>
        </Field>
        <Field>
          <OptionList options={layoutOptions()} value={selectedLayout().id} onSelect={(value) => {
            setSelectedLayout(Layout.ALL.get(value));
        }}/>
        </Field>
        <Field size={16}>
          <OptionList options={[
            {
                name: formatMessage({
                    id: "t_cc_Letters",
                    defaultMessage: "Letters",
                }),
                value: "letters",
            },
            {
                name: formatMessage({
                    id: "t_cc_Digits",
                    defaultMessage: "Digits",
                }),
                value: "digits",
            },
            {
                name: formatMessage({
                    id: "t_cc_Punctuation_characters",
                    defaultMessage: "Punctuation",
                }),
                value: "punctuators",
            },
            {
                name: formatMessage({
                    id: "t_cc_Special_characters",
                    defaultMessage: "Special",
                }),
                value: "specials",
            },
        ]} value={characterClass()} onSelect={(value) => {
            setCharacterClass(value);
        }}/>
        </Field>
        <Field.Filler />
        {solidProps.actions != null && <Field>{solidProps.actions}</Field>}
      </FieldList>

      <KeyboardContext value={keyboard()}>
        <PhoneticModelLoader language={selectedLayout().language}>
          {({ letters }) => {
            switch (characterClass()) {
                case "letters":
                    return solidProps.children(makeKeyStatsMap(Letter.restrict(letters, keyboard().getCodePoints()), group()));
                case "digits":
                    return solidProps.children(makeKeyStatsMap(Letter.digits, group()));
                case "punctuators":
                    return solidProps.children(makeKeyStatsMap(Letter.punctuators, group()));
                case "specials":
                    return solidProps.children(makeKeyStatsMap(Letter.specials, group()));
                default:
                    throw new Error();
            }
        }}
        </PhoneticModelLoader>
      </KeyboardContext>
    </>);
}
function useLayoutOptions(layouts: () => Iterable<Layout>) {
    const { formatFullLayoutName } = useFormattedNames();
    const { compare } = useCollator();
    return createMemo(() => [...layouts()]
        .map((item) => ({
        value: item.id,
        name: formatFullLayoutName(item),
    }))
        .sort((a, b) => compare(a.name, b.name)));
}
