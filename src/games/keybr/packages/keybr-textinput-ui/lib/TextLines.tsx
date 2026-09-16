import { type Char, charArraysAreEqual, type Line, type LineList, type TextDisplaySettings, textDisplaySettings, } from "@keybr/textinput";
import { clsx } from "@keybr/solid-compat/clsx";
import { type ComponentType, type CSSProperties, memo, type ReactNode, } from "@keybr/solid-compat/react";
import { renderChars } from "./chars.tsx";
import { Cursor } from "./Cursor.tsx";
import { textItemStyle } from "./styles.ts";
import * as styles from "./TextLines.module.css";
import { createMemo, For } from 'solid-js';
export type TextLineSize = "X0" | "X1" | "X2" | "X3";
export const TextLines = memo(function TextLines(props: {
    readonly lines: LineList;
    readonly settings?: TextDisplaySettings;
    readonly wrap?: boolean;
    readonly size?: TextLineSize;
    readonly lineTemplate?: ComponentType;
    readonly cursor: boolean;
    readonly focus: boolean;
}): ReactNode {
    const settings = () => props.settings ?? textDisplaySettings;
    const className = () => clsx(styles.root, (props.wrap ?? true) ? styles.wrap : styles.nowrap, props.focus ? styles.focus : styles.blur, (props.size ?? "X0") === "X0" && styles.sizeX0, (props.size ?? "X0") === "X1" && styles.sizeX1, (props.size ?? "X0") === "X2" && styles.sizeX2, (props.size ?? "X0") === "X3" && styles.sizeX3);
    const children = () => props.lines.lines.map(({ text, chars, ...lineProps }: Line) => props.lineTemplate != null ? (<props.lineTemplate {...lineProps}>
        <TextLine settings={settings()} chars={chars} className={className()} style={settings().font.cssProperties}/>
      </props.lineTemplate>) : (<TextLine settings={settings()} chars={chars} className={className()} style={settings().font.cssProperties}/>));
    return <>{props.cursor ? <Cursor settings={settings()}>{children()}</Cursor> : children()}</>;
});
const TextLine = memo(function TextLine(solidProps: {
    readonly settings: TextDisplaySettings;
    readonly chars: readonly Char[];
    readonly className: string;
    readonly style: CSSProperties;
}): ReactNode {
    const items = createMemo(() => {
        const groups: Char[][] = [];
        let itemChars: Char[] = [];
        let ws = false;
        for (let i = 0; i < solidProps.chars.length; i++) {
            const char = solidProps.chars[i];
            switch (char.codePoint) {
                case 0x0009:
                case 0x000a:
                case 0x0020:
                    ws = true;
                    break;
                default:
                    if (ws) {
                        if (itemChars.length > 0) groups.push(itemChars);
                        itemChars = [];
                        ws = false;
                    }
                    break;
            }
            itemChars.push(char);
        }
        if (itemChars.length > 0) groups.push(itemChars);
        return groups;
    });
    return (<div class={solidProps.className} style={solidProps.style} dir={solidProps.settings.language.direction}>
        <For each={items()}>{(chars) => <TextItem settings={solidProps.settings} chars={chars}/>}</For>
      </div>);
}, (prevProps, nextProps) => prevProps.settings === nextProps.settings &&
    charArraysAreEqual(prevProps.chars, nextProps.chars) && // deep equality
    prevProps.className === nextProps.className);
const TextItem = memo(function TextItem(solidProps: {
    readonly settings: TextDisplaySettings;
    readonly chars: readonly Char[];
}): ReactNode {
    return <span style={textItemStyle}>{renderChars(solidProps.settings, solidProps.chars)}</span>;
}, (prevProps, nextProps) => prevProps.settings === nextProps.settings &&
    charArraysAreEqual(prevProps.chars, nextProps.chars));
