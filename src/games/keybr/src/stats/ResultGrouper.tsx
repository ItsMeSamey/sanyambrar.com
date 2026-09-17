import type { JSX } from "@solidjs/web";
import { useCollator } from "../intl/collator.ts";
import { KeyboardContext } from "../keyboard/context.tsx";
import { keyboardProps } from "../keyboard/settings.ts";
import { Layout } from "../keyboard/layout.ts";
import { loadKeyboard } from "../keyboard/load.ts";
import { useFormattedNames } from "../keyboard/use-formatted-names.ts";
import { Letter } from "../phonetic-model/letter.ts";
import { PhoneticModelLoader } from "../phonetic-model/loader.tsx";
import { type KeyStatsMap, makeKeyStatsMap } from "../result/keystats.ts";
import { ResultGroups } from "../result/group.ts";
import { useResults } from "../result/context.ts";
import { useSettings } from "../settings/context.ts";
import { Field, FieldList } from "../widget/components/fieldlist/FieldList.tsx";
import { OptionList } from "../widget/components/optionlist/OptionList.tsx";

import { createMemo, createSignal } from 'solid-js';
import { FormattedMessage, useIntl } from "../intl/runtime.tsx";
export function ResultGrouper(props: {
    children: (keyStatsMap: KeyStatsMap) => JSX.Element;
    actions?: JSX.Element;
}) {
    const { formatMessage } = useIntl();
    const { settings } = useSettings();
    const { results } = useResults();
    const groups = createMemo(() => ResultGroups.byLayout(results()));
    const configuredLayout = () => settings.get(keyboardProps.layout);
    const resultsLayouts = createMemo(() => {
        const layouts = new Set(groups().keys());
        if (layouts.size === 0) layouts.add(configuredLayout());
        return layouts;
    });
    const defaultLayout = () => resultsLayouts().has(configuredLayout())
        ? configuredLayout()
        : [...resultsLayouts()][0];
    const [choice, setSelectedLayout] = createSignal(defaultLayout);
    const selectedLayout = () => resultsLayouts().has(choice()) ? choice() : defaultLayout();
    const [characterClass, setCharacterClass] = createSignal("letters");
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
        {props.actions != null && <Field>{props.actions}</Field>}
      </FieldList>

      <KeyboardContext value={keyboard}>
        <PhoneticModelLoader language={selectedLayout().language}>
          {({ letters }) => {
            switch (characterClass()) {
                case "letters":
                    return props.children(makeKeyStatsMap(Letter.restrict(letters, keyboard().getCodePoints()), group()));
                case "digits":
                    return props.children(makeKeyStatsMap(Letter.digits, group()));
                case "punctuators":
                    return props.children(makeKeyStatsMap(Letter.punctuators, group()));
                case "specials":
                    return props.children(makeKeyStatsMap(Letter.specials, group()));
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
