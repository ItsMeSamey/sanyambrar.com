import type { JSX } from "@solidjs/web";
import { getDir } from "@keybr/intl";
import { Field, FieldList, Icon, IconButton, Range } from "@keybr/widget";
import { SkipForward, SkipBack } from "@keybr/widget";

import { useIntl } from "@keybr/intl";
import { ParagraphIndex } from "./ParagraphPreview.tsx";
export function ParagraphSelector(solidProps: {
    readonly paragraphs: readonly string[];
    readonly paragraphIndex: number;
    readonly onChange: (paragraphIndex: number) => void;
}): JSX.Element {
    const { locale } = useIntl();
    const rtl = getDir(locale) === "rtl";
    return (<FieldList>
      <Field>Paragraph:</Field>
      <Field>
        <ParagraphIndex paragraphIndex={solidProps.paragraphIndex}/>
      </Field>
      <Field>
        <Range size={32} min={0} max={solidProps.paragraphs.length - 1} step={1} value={solidProps.paragraphIndex} onChange={solidProps.onChange}/>
      </Field>
      <Field>
        <span style={{ display: "contents" }}>
          <IconButton icon={<Icon shape={rtl ? SkipForward : SkipBack}/>} disabled={solidProps.paragraphIndex === 0} onClick={() => {
            if (solidProps.paragraphIndex > 0) {
                solidProps.onChange(solidProps.paragraphIndex - 1);
            }
        }}/>
          <IconButton icon={<Icon shape={rtl ? SkipBack : SkipForward}/>} disabled={solidProps.paragraphIndex === solidProps.paragraphs.length - 1} onClick={() => {
            if (solidProps.paragraphIndex < solidProps.paragraphs.length - 1) {
                solidProps.onChange(solidProps.paragraphIndex + 1);
            }
        }}/>
        </span>
      </Field>
    </FieldList>);
}
