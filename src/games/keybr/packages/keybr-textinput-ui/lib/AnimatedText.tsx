import { Tasks } from "@keybr/lang";
import { type Char, type TextDisplaySettings, TextInput, } from "@keybr/textinput";
import { type ReactNode, useEffect, useMemo, useState } from "@keybr/solid-compat/react";
import { StaticText } from "./StaticText.tsx";
import { type TextLineSize } from "./TextLines.tsx";
export function AnimatedText(solidProps: {
    readonly settings: TextDisplaySettings;
    readonly text: string;
    readonly wrap?: boolean;
    readonly size?: TextLineSize;
}): ReactNode {
    const chars = useAnimatedTextState(solidProps.text);
    return (<StaticText settings={solidProps.settings} lines={{ text: solidProps.text, lines: [{ text: solidProps.text, chars }] }} cursor={true} wrap={solidProps.wrap} size={solidProps.size}/>);
}
function useAnimatedTextState(text: string): readonly Char[] {
    const textInput = useMemo(() => new TextInput(text, {
        stopOnError: false,
        forgiveErrors: false,
        spaceSkipsWords: false,
    }), () => [text]);
    const [chars, setChars] = useState<readonly Char[]>([]);
    useEffect(() => {
        setChars(textInput.chars);
        const tasks = new Tasks();
        tasks.repeated(500, () => {
            if (textInput.completed) {
                textInput.reset();
            }
            else {
                textInput.appendChar(0, textInput.at(textInput.pos).codePoint, 0);
            }
            setChars(textInput.chars);
        });
        return () => {
            tasks.cancelAll();
        };
    }, () => [textInput]);
    return chars();
}
