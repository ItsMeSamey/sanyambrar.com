import { loadContent, loadWordList } from "@keybr/content";
import { KeyboardOptions, useKeyboard } from "@keybr/keyboard";
import { BooksLesson } from "./books.ts";
import { CodeLesson } from "./code.ts";
import { CustomTextLesson } from "./customtext.ts";
import { GuidedLesson } from "./guided.ts";
import { type Lesson } from "./lesson.ts";
import { LessonType } from "./lessontype.ts";
import { NumbersLesson } from "./numbers.ts";
import { lessonProps } from "./settings.ts";
import { WordListLesson } from "./wordlist.ts";
import { LoadingProgress } from "@keybr/pages-shared";
import { type PhoneticModel, PhoneticModelLoader } from "@keybr/phonetic-model";
import { useSettings } from "@keybr/settings";
import { createMemo, Loading, Show } from 'solid-js';
import { type JSX } from '@solidjs/web';

export function LessonLoader(props: {
  readonly children: (result: Lesson) => JSX.Element;
  readonly fallback?: JSX.Element;
}) {
  const { settings } = useSettings();
  return (
    <PhoneticModelLoader language={KeyboardOptions.from(settings).language}>
      {(model) => <Loader model={model} fallback={props.fallback}>{props.children}</Loader>}
    </PhoneticModelLoader>
  );
}

function Loader(props: {
  readonly model: PhoneticModel;
  readonly children: (result: Lesson) => JSX.Element;
  readonly fallback?: JSX.Element;
}) {
  const { settings } = useSettings();
  const keyboard = useKeyboard();
  const lesson = createMemo(async () => {
      const type = settings.get(lessonProps.type);
      const language = KeyboardOptions.from(settings).language;
      const book = settings.get(lessonProps.books.book);
      const model = props.model;
      switch (type) {
        case LessonType.GUIDED:
          return { type, value: new GuidedLesson(settings, keyboard(), model, await loadWordList(language)) };
        case LessonType.WORDLIST:
          return { type, value: new WordListLesson(settings, keyboard(), model, await loadWordList(language)) };
        case LessonType.BOOKS:
          return { type, value: new BooksLesson(settings, keyboard(), model, { book, content: await loadContent(book) }) };
        case LessonType.CUSTOM:
          return { type, value: new CustomTextLesson(settings, keyboard(), model) };
        case LessonType.CODE:
          return { type, value: new CodeLesson(settings, keyboard(), model) };
        case LessonType.NUMBERS:
          return { type, value: new NumbersLesson(settings, keyboard(), model) };
        default:
          throw new Error(`Unknown lesson type: ${String(type)}`);
      }
  });
  const currentLesson = () => {
    const loaded = lesson();
    return loaded?.type === settings.get(lessonProps.type) ? loaded.value : undefined;
  };
  return (
    <Loading fallback={props.fallback ?? <LoadingProgress />}>
    <Show keyed when={currentLesson()}>
      {(value) => props.children(value)}
    </Show>
    </Loading>
  );
}
