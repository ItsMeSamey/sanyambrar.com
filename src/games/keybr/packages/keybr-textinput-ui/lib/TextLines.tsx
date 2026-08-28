import { type Char, charArraysAreEqual, type Line, type LineList, type TextDisplaySettings, textDisplaySettings, } from "@keybr/textinput";
import { clsx } from "@keybr/solid-compat/clsx";
import { type ComponentType, type CSSProperties, memo, type ReactNode, } from "@keybr/solid-compat/react";
import { renderChars } from "./chars.tsx";
import { Cursor } from "./Cursor.tsx";
import { textItemStyle } from "./styles.ts";
import * as styles from "./TextLines.module.css";
export type TextLineSize = "X0" | "X1" | "X2" | "X3";
export const TextLines = memo(function TextLines({ settings = textDisplaySettings, lines, wrap = true, size = "X0", lineTemplate: LineTemplate, cursor, focus, }: {
    readonly lines: LineList;
    readonly settings?: TextDisplaySettings;
    readonly wrap?: boolean;
    readonly size?: TextLineSize;
    readonly lineTemplate?: ComponentType<any>;
    readonly cursor: boolean;
    readonly focus: boolean;
}): ReactNode {
    const className = clsx(styles.root, wrap ? styles.wrap : styles.nowrap, focus ? styles.focus : styles.blur, size === "X0" && styles.sizeX0, size === "X1" && styles.sizeX1, size === "X2" && styles.sizeX2, size === "X3" && styles.sizeX3);
    const children = lines.lines.map(({ text, chars, ...props }: Line) => LineTemplate != null ? (<LineTemplate {...props}>
        <TextLine settings={settings} chars={chars} className={className} style={settings.font.cssProperties}/>
      </LineTemplate>) : (<TextLine settings={settings} chars={chars} className={className} style={settings.font.cssProperties}/>));
    return cursor ? <Cursor settings={settings}>{children}</Cursor> : children;
});
const TextLine = memo(function TextLine({ settings, chars, className, style, }: {
    readonly settings: TextDisplaySettings;
    readonly chars: readonly Char[];
    readonly className: string;
    readonly style: CSSProperties;
}): ReactNode {
    const items: Char[][] = [];
    let itemChars: Char[] = [];
    let ws = false;
    for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        switch (char.codePoint) {
            case 0x0009:
            case 0x000a:
            case 0x0020:
                ws = true;
                break;
            default:
                if (ws) {
                    if (itemChars.length > 0) {
                        items.push(itemChars);
                        itemChars = [];
                    }
                    ws = false;
                }
                break;
        }
        itemChars.push(char);
    }
    if (itemChars.length > 0) {
        items.push(itemChars);
        itemChars = [];
    }
    return (<div class={className} style={style} dir={settings.language.direction}>
        {items.map((chars, index) => (<TextItem settings={settings} chars={chars}/>))}
      </div>);
}, (prevProps, nextProps) => prevProps.settings === nextProps.settings &&
    charArraysAreEqual(prevProps.chars, nextProps.chars) && // deep equality
    prevProps.className === nextProps.className);
const TextItem = memo(function TextItem({ settings, chars, }: {
    readonly settings: TextDisplaySettings;
    readonly chars: readonly Char[];
}): ReactNode {
    return <span style={textItemStyle}>{renderChars(settings, chars)}</span>;
}, (prevProps, nextProps) => prevProps.settings === nextProps.settings &&
    charArraysAreEqual(prevProps.chars, nextProps.chars));
