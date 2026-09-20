import type { JSX } from "@solidjs/web";
import { BookPreview } from "../../../content/books/BookPreview.tsx";
import { BookSelector } from "../../../content/books/BookSelector.tsx";
import { ParagraphPreview } from "../../../content/books/ParagraphPreview.tsx";
import { ParagraphSelector } from "../../../content/books/ParagraphSelector.tsx";
import { BooksLesson } from "../../../lesson/books.ts";
import { lessonProps } from "../../../lesson/settings.ts";
import { useSettings } from "../../../settings/context.ts";
import { Toggle } from "../../../widget/components/toggle/Toggle.tsx";
import { Description } from "../../../widget/components/text/Description.tsx";
import { Explainer } from "../../../widget/components/explainer/Explainer.tsx";
import { Field, FieldList } from "../../../widget/components/fieldlist/FieldList.tsx";
import { FieldSet } from "../../../widget/components/form/Form.tsx";
import { Spacer } from "../../../widget/components/text/Spacer.tsx";

import { FormattedMessage, useIntl } from "../../../intl/runtime.tsx";
import { LessonLengthProp } from "./LessonLengthProp.tsx";
import { TargetSpeedProp } from "./TargetSpeedProp.tsx";
export function BooksLessonSettings(props: {
    readonly lesson: BooksLesson;
}): JSX.Element {
    const { formatMessage } = useIntl();
    const { settings, updateSettings } = useSettings();
    const book = () => props.lesson.book;
    const content = () => props.lesson.content;
    const paragraphs = () => props.lesson.paragraphs;
    const paragraphIndex = () => props.lesson.paragraphIndex;
    return (<>
      <Explainer>
        <Description>
          <FormattedMessage id="lessonType.books.description" defaultMessage="Generate typing lessons from the text of a book. All keys are included by default. This mode is for the pros."/>
        </Description>
      </Explainer>
      <FieldSet legend={formatMessage({
            id: "t_Lesson_options",
            defaultMessage: "Lesson options",
        })}>
        <BookPreview book={book()} content={content()} action={<BookSelector book={book()} onChange={(book) => {
            updateSettings(settings
                .set(lessonProps.books.book, book)
                .set(lessonProps.books.paragraphIndex, BooksLesson.savedParagraphIndex(book)));
        }}/>}/>
        <ParagraphSelector paragraphs={paragraphs()} paragraphIndex={paragraphIndex()} onChange={(paragraphIndex) => {
            updateSettings(settings.set(lessonProps.books.paragraphIndex, paragraphIndex));
        }}/>
        <ParagraphPreview paragraphs={paragraphs()} paragraphIndex={paragraphIndex()}/>
        <Spacer size={3}/>
        <BookTextProcessing />
        <TargetSpeedProp />
        <LessonLengthProp />
      </FieldSet>
    </>);
}
function BookTextProcessing(): JSX.Element {
    const { formatMessage } = useIntl();
    const { settings, updateSettings } = useSettings();
    return (<FieldList>
      <Field>
        <Toggle checked={settings.get(lessonProps.books.lettersOnly)} label={formatMessage({
            id: "t_Remove_punctuation_characters",
            defaultMessage: "Remove punctuation characters",
        })} title={formatMessage({
            id: "settings.customTextLettersOnly.description",
            defaultMessage: "Remove punctuation from the text to make it simpler to type.",
        })} onChange={(value) => {
            updateSettings(settings.set(lessonProps.books.lettersOnly, value));
        }}/>
      </Field>
      <Field>
        <Toggle checked={settings.get(lessonProps.books.lowercase)} label={formatMessage({
            id: "t_Transform_to_lowercase",
            defaultMessage: "Transform to lowercase",
        })} title={formatMessage({
            id: "settings.customTextLowercase.description",
            defaultMessage: "Transform all text to lower case to make it simpler to type.",
        })} onChange={(value) => {
            updateSettings(settings.set(lessonProps.books.lowercase, value));
        }}/>
      </Field>
    </FieldList>);
}
