import type { JSX } from "@solidjs/web";
import type { Component } from "solid-js";
import { type Char, type Line, type LineList, type TextDisplaySettings, textDisplaySettings, } from "@keybr/textinput";
import { clsx } from "clsx";

import { renderChars } from "./chars.tsx";
import { Cursor } from "./Cursor.tsx";
import { textItemStyle } from "./styles.ts";
import * as styles from "./TextLines.module.css";
import { createMemo, For } from 'solid-js';
export type TextLineSize = "X0" | "X1" | "X2" | "X3";
export const TextLines = function TextLines(props: {
    readonly lines: LineList;
    readonly settings?: TextDisplaySettings;
    readonly wrap?: boolean;
    readonly size?: TextLineSize;
    readonly lineTemplate?: Component<{
        readonly children?: JSX.Element;
    }>;
    readonly cursor: boolean;
    readonly focus: boolean;
}): JSX.Element {
    const settings = () => props.settings ?? textDisplaySettings;
    const className = () => clsx(styles.root, (props.wrap ?? true) ? styles.wrap : styles.nowrap, props.focus ? styles.focus : styles.blur, (props.size ?? "X0") === "X0" && styles.sizeX0, (props.size ?? "X0") === "X1" && styles.sizeX1, (props.size ?? "X0") === "X2" && styles.sizeX2, (props.size ?? "X0") === "X3" && styles.sizeX3);
    const children = () => props.lines.lines.map(({ text, chars, ...lineProps }: Line) => props.lineTemplate != null ? (<props.lineTemplate {...lineProps}>
        <TextLine settings={settings()} chars={chars} className={className()} style={settings().font.cssProperties}/>
      </props.lineTemplate>) : (<TextLine settings={settings()} chars={chars} className={className()} style={settings().font.cssProperties}/>));
    return <>{props.cursor ? <Cursor settings={settings()}>{children()}</Cursor> : children()}</>;
};
const TextLine = function TextLine(props: {
    readonly settings: TextDisplaySettings;
    readonly chars: readonly Char[];
    readonly className: string;
    readonly style: JSX.CSSProperties;
}): JSX.Element {
    const items = createMemo(() => {
        const groups: Char[][] = [];
        let itemChars: Char[] = [];
        let ws = false;
        for (let i = 0; i < props.chars.length; i++) {
            const char = props.chars[i];
            switch (char.codePoint) {
                case 0x0009:
                case 0x000a:
                case 0x0020:
                    ws = true;
                    break;
                default:
                    if (ws) {
                        if (itemChars.length > 0)
                            groups.push(itemChars);
                        itemChars = [];
                        ws = false;
                    }
                    break;
            }
            itemChars.push(char);
        }
        if (itemChars.length > 0)
            groups.push(itemChars);
        return groups;
    });
    return (<div class={props.className} style={props.style} dir={props.settings.language.direction}>
        <For each={items()}>{(chars) => <TextItem settings={props.settings} chars={chars}/>}</For>
      </div>);
};
const TextItem = function TextItem(props: {
    readonly settings: TextDisplaySettings;
    readonly chars: readonly Char[];
}): JSX.Element {
    return <span style={textItemStyle}>{renderChars(props.settings, props.chars)}</span>;
};
